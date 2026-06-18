/**
 * Customer Match — upload to Google Ads
 * POST /api/admin/growth/ads/customer-match/{audienceId}/upload
 *
 * Flow:
 *   1. Build records from source collection
 *   2. Create User List in Google Ads (or reuse existing)
 *   3. Create OfflineUserDataJob for Customer Match
 *   4. Upload members in batches
 *   5. Run the job (async; Google processes in background)
 */
import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"
import {
  buildAudienceRecords,
  toGoogleMembers,
  AUDIENCE_META,
  type AudienceType,
} from "@/lib/growth-os/customer-match-engine"
import {
  createCustomerMatchList,
  uploadCustomerMatchMembers,
  type MemberIdentifier,
} from "@/lib/google-ads-mutate"
import { getValidAccessToken } from "@/lib/google-oauth"
import { getAdsSettings } from "@/lib/google-ads"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const COLL = "customer_match_audiences"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ audienceId: string }> },
) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const { audienceId } = await params
    const audienceType   = audienceId.replace(/^cm_/, "") as AudienceType

    if (!AUDIENCE_META[audienceType]) {
      return NextResponse.json({ error: "Unknown audience type" }, { status: 400 })
    }

    // ── Resolve Google Ads account ────────────────────────────────────────────
    const adsSettings = await getAdsSettings()
    if (!adsSettings?.customerId) {
      return NextResponse.json({
        error: "Google Ads account not connected. Set up OAuth and customer ID first.",
      }, { status: 400 })
    }

    const { customerId, loginCustomerId } = adsSettings

    let accessToken: string
    try {
      accessToken = await getValidAccessToken()
    } catch {
      return NextResponse.json({
        error: "Could not get a valid Google Ads access token. Reconnect OAuth.",
      }, { status: 401 })
    }

    const db  = (await clientPromise).db()
    const now = new Date().toISOString()

    // Mark as uploading
    await db.collection(COLL).updateOne(
      { audienceId },
      { $set: { uploadStatus: "uploading", uploadStartedAt: now, updatedAt: now } },
      { upsert: true }
    )

    // ── Build records ─────────────────────────────────────────────────────────
    const { records } = await buildAudienceRecords(audienceType, db)
    const members     = toGoogleMembers(records)

    if (members.length === 0) {
      await db.collection(COLL).updateOne(
        { audienceId },
        { $set: { uploadStatus: "failed", uploadError: "No matchable records (no email or phone)", updatedAt: now } }
      )
      return NextResponse.json({ error: "No matchable records — audience needs email or phone fields" }, { status: 400 })
    }

    // ── Check if user list already exists ─────────────────────────────────────
    const existing = await db.collection(COLL).findOne({ audienceId })
    let userListResourceName = existing?.googleUserListResource as string | undefined

    if (!userListResourceName) {
      // Create a new user list
      const listName = `100X Circle — ${AUDIENCE_META[audienceType].displayName}`
      const listResult = await createCustomerMatchList(
        customerId,
        accessToken,
        listName,
        AUDIENCE_META[audienceType].description,
        loginCustomerId,
      )
      userListResourceName = listResult.resourceName

      await db.collection(COLL).updateOne(
        { audienceId },
        { $set: { googleUserListName: listName, googleUserListResource: userListResourceName, updatedAt: now } }
      )
    }

    // ── Upload members ────────────────────────────────────────────────────────
    const memberIdentifiers: MemberIdentifier[] = members.map(m => ({
      hashedEmail:       m.hashedEmail,
      hashedPhoneNumber: m.hashedPhone,
      addressInfo: (m.hashedFirstName || m.hashedLastName) ? {
        hashedFirstName: m.hashedFirstName,
        hashedLastName:  m.hashedLastName,
        countryCode:     m.countryCode || "IN",
        postalCode:      m.postalCode,
      } : undefined,
    }))

    const uploadResult = await uploadCustomerMatchMembers(
      customerId,
      accessToken,
      userListResourceName,
      memberIdentifiers,
      loginCustomerId,
    )

    // ── Update audience doc ───────────────────────────────────────────────────
    await db.collection(COLL).updateOne(
      { audienceId },
      {
        $set: {
          uploadStatus:        "uploaded",
          googleJobResource:   uploadResult.jobResourceName,
          lastUploadedAt:      now,
          uploadedRecordCount: members.length,
          updatedAt:           now,
          uploadError:         null,
        },
      }
    )

    await db.collection("growth_os_logs").insertOne({
      ts:          now,
      agent:       "customer-match-engine",
      action:      "audience_uploaded",
      audienceType,
      audienceId,
      recordsUploaded:       members.length,
      googleJobResourceName: uploadResult.jobResourceName,
      userListResourceName,
      level:  "success",
      module: "ads",
    })

    return NextResponse.json({
      ok:                    true,
      audienceId,
      audienceType,
      recordsUploaded:       members.length,
      userListResourceName,
      jobResourceName:       uploadResult.jobResourceName,
      status:                "queued",
      note:                  "Google is processing the list asynchronously. It will be available in Google Ads within 6-48 hours.",
    })
  } catch (err) {
    const errMsg = String(err)
    const db = (await clientPromise).db()
    const { audienceId } = await params

    await db.collection(COLL).updateOne(
      { audienceId },
      { $set: { uploadStatus: "failed", uploadError: errMsg.slice(0, 500), updatedAt: new Date().toISOString() } }
    )

    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
