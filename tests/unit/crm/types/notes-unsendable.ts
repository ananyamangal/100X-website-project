// Compile-only type test (run by tests/unit/crm-outbound.test.mjs):
//   npx tsc --noEmit --strict --skipLibCheck --module esnext --moduleResolution bundler --target es2020 <this file>
// Exit 0 means every @ts-expect-error below fired (an unused directive is itself an error, TS2578),
// and the positive controls type-check.
import type { ObjectId } from "mongodb"
import type { InternalNote, InternalNoteText, OutboundText } from "../../../../lib/crm/model"
import { fromComposer, fromComposerCaption, fromTemplateParam, fromTemplateParams } from "../../../../lib/crm/outbound/compose"
import { sendAudio, sendDocument, sendImage, sendTemplate, sendText, type GraphConfig } from "../../../../lib/crm/outbound/graph"
import { sendMessage, type SendActor, type SendDeps } from "../../../../lib/crm/outbound/send"
import { checkSend } from "../../../../lib/crm/outbound/gate"
import type { SendPass } from "../../../../lib/crm/outbound/gate"
import type { CrmDb } from "../../../../lib/crm/db"

declare const note: InternalNote
declare const noteText: InternalNoteText
declare const cfg: GraphConfig
declare const pass: SendPass
declare const crm: CrmDb
declare const actor: SendActor
declare const deps: SendDeps
declare const oid: ObjectId
declare const out: OutboundText

// ── producers refuse notes ──
// @ts-expect-error InternalNote.text is InternalNoteText -> NotInternalNote<..> = never
fromComposer(note.text)
// @ts-expect-error
fromComposer(noteText)
// @ts-expect-error
fromComposerCaption(note.text)
// @ts-expect-error
fromTemplateParam(note.text)
// @ts-expect-error
fromTemplateParams([note.text])
// @ts-expect-error
fromTemplateParams([noteText, noteText])

// ── graph senders take OutboundText only (a note, or a plain string, is not one) ──
// @ts-expect-error
sendText(cfg, pass, note.text)
// @ts-expect-error
sendText(cfg, pass, noteText)
// @ts-expect-error plain string is not OutboundText either
sendText(cfg, pass, "hello")
// @ts-expect-error
sendTemplate(cfg, pass, { name: "x", language: "en_US" }, [note.text])
// @ts-expect-error
sendDocument(cfg, pass, { link: "https://res.cloudinary.com/x", caption: note.text })
// @ts-expect-error
sendImage(cfg, pass, { link: "https://res.cloudinary.com/x", caption: noteText })
// @ts-expect-error audio has no caption member
sendAudio(cfg, pass, { link: "https://res.cloudinary.com/x", caption: out })

// ── sendMessage / gate content ──
// @ts-expect-error
void sendMessage(crm, actor, { contactId: oid, idempotencyKey: "k", route: "r", content: { kind: "text", text: note.text } }, deps)
// @ts-expect-error
void sendMessage(crm, actor, { contactId: oid, idempotencyKey: "k", route: "r", content: { kind: "template", name: "n", language: "en_US", params: [noteText] } }, deps)
// @ts-expect-error
void sendMessage(crm, actor, { contactId: oid, idempotencyKey: "k", route: "r", content: { kind: "media", mediaType: "image", mime: "image/png", caption: note.text } }, deps)
// @ts-expect-error
void checkSend(crm, { contact: oid, kind: "session_text", text: note.text }, { allowList: [] })
// @ts-expect-error
void checkSend(crm, { contact: oid, kind: "template", params: [noteText] }, { allowList: [] })

// ── positive controls (must compile) ──
const ok1 = fromComposer("hello")
const ok2 = fromTemplateParams(["a", "b"])
void ok1
void ok2
void sendText(cfg, pass, out)
void sendMessage(crm, actor, { contactId: oid, idempotencyKey: "k", route: "r", content: { kind: "text", text: out } }, deps)
