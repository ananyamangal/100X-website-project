/**
 * Workspace-scoped data access for the CRM (ADR §12, docs/crm/DATA_MODEL.md §10).
 *
 * The ONLY module allowed to resolve CRM collections. Every CRM read/write goes through
 * `crmDb(workspace).collection(COLL.x)` (or `crmDbFrom(db, workspace)` in tests/scripts):
 *
 * - Filters: deep-scanned; a `workspace` key anywhere (incl. $and/$or/$nor/$elemMatch) must equal
 *   the scoped string, `workspace.*` paths and `$where` are rejected, `$expr` may not reference
 *   workspace; then `{workspace}` is set at the top level.
 * - Inserts/replacements: `workspace` is set; a different value throws. Replacements may not
 *   contain operators.
 * - Updates: no operator may set/unset/rename (from or to)/inc/min/max/mul/currentDate/
 *   setOnInsert/push… `workspace`; pipeline updates are scanned stage by stage and get a final
 *   `{$set:{workspace}}` backstop. Upserts get `workspace` from the filter.
 * - bulkWrite: every op scoped with the same rules.
 * - aggregate: `{$match:{workspace}}` prepended; $out/$merge/$unionWith/$graphLookup/
 *   $changeStream/$collStats/$currentOp/… rejected; $facet branches and $lookup.pipeline are
 *   recursed; $lookup only into CRM collections and only with a pipeline that starts with
 *   `{$match:{workspace}}` (see scopedLookup()).
 * - estimatedDocumentCount, watch, drop, rename, createIndex(es), raw collection/db: blocked.
 * - Cursors are returned behind a guard that blocks filter/pipeline mutation (filter, addStage,
 *   out, lookup, …).
 * - `session` (and all other options) are forwarded unchanged.
 */
import type {
  AggregateOptions,
  AggregationCursor,
  AnyBulkWriteOperation,
  BulkWriteOptions,
  BulkWriteResult,
  ClientSession,
  CountDocumentsOptions,
  Db,
  DeleteOptions,
  DeleteResult,
  DistinctOptions,
  Document,
  Filter,
  FindCursor,
  FindOneAndDeleteOptions,
  FindOneAndReplaceOptions,
  FindOneAndUpdateOptions,
  FindOptions,
  InsertManyResult,
  InsertOneOptions,
  InsertOneResult,
  MongoClient,
  OptionalUnlessRequiredId,
  ReplaceOptions,
  TransactionOptions,
  UpdateFilter,
  UpdateOptions,
  UpdateResult,
  WithId,
  WithoutId,
} from "mongodb"
import {
  BSON,
  ClientSession as ClientSessionRt,
  Collection as CollectionRt,
  Db as DbRt,
  MongoClient as MongoClientRt,
} from "mongodb"
import { COLL, INDEX_SPECS, LEGACY_COLL, WORKSPACES, type CollectionName, type IndexSpec, type Workspace } from "./model"
import { readCrmEnv } from "./env"
import { applyIndexSpecs, type IndexReport, type IndexTarget } from "./indexes"

// ─────────────────────────────────────────────────────────────────────────────
// Error
// ─────────────────────────────────────────────────────────────────────────────

export type CrmViolationKind =
  | "bad_workspace"
  | "bad_collection"
  | "filter"
  | "document"
  | "update"
  | "pipeline"
  | "bulk_write"
  | "blocked_method"
  | "cursor"
  | "db_guard"
  | "session"

export class CrmWorkspaceViolation extends Error {
  readonly code = "CRM_WORKSPACE_VIOLATION" as const
  readonly kind: CrmViolationKind
  readonly workspace: string | undefined
  constructor(kind: CrmViolationKind, message: string, workspace?: string) {
    super(`[crm:${kind}] ${message}`)
    this.name = "CrmWorkspaceViolation"
    this.kind = kind
    this.workspace = workspace
  }
}

const KEY = "workspace"
const CRM_NAMES: ReadonlySet<string> = new Set(Object.values(COLL))
const LEGACY_NAMES: ReadonlySet<string> = new Set(Object.values(LEGACY_COLL))

// ─────────────────────────────────────────────────────────────────────────────
// Scanners (pure, exported for tests)
// ─────────────────────────────────────────────────────────────────────────────

/** Plain object (not an array, Date, ObjectId, RegExp or other BSON value). */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false
  if ("_bsontype" in (v as object)) return false
  const proto = Object.getPrototypeOf(v)
  return proto === Object.prototype || proto === null
}

/** True for "workspace" and "workspace.<anything>" — the root segment is the workspace field. */
function isWorkspacePath(path: string): boolean {
  return path === KEY || path.startsWith(KEY + ".")
}

/** An aggregation-expression string that refers to the workspace field ("$workspace", "$$ROOT.workspace", ...). */
function exprRefersToWorkspace(s: string): boolean {
  if (s === KEY) return true // e.g. $getField: "workspace"
  if (!s.startsWith("$")) return false
  return s.replace(/^\$+/, "").split(".").includes(KEY)
}

function scanExpr(v: unknown, ws: string, where: string): void {
  if (typeof v === "string") {
    if (exprRefersToWorkspace(v)) throw new CrmWorkspaceViolation("filter", `${where}: aggregation expressions may not reference workspace`, ws)
    return
  }
  if (Array.isArray(v)) return v.forEach(x => scanExpr(x, ws, where))
  if (isPlainObject(v)) {
    for (const [k, x] of Object.entries(v)) {
      if (k === KEY || isWorkspacePath(k)) throw new CrmWorkspaceViolation("filter", `${where}: aggregation expressions may not reference workspace`, ws)
      scanExpr(x, ws, where)
    }
  }
}

function allowedWorkspaceValue(v: unknown, ws: string): boolean {
  if (v === ws) return true
  return isPlainObject(v) && Object.keys(v).length === 1 && v.$eq === ws
}

/**
 * Throws unless every `workspace` occurrence in the filter is the scoped string (or {$eq: it}).
 * Rejects `workspace.*` paths, `$where`, `$function` and any workspace reference inside `$expr`.
 */
export function assertFilterScoped(filter: unknown, ws: string, where = "filter"): void {
  if (filter === undefined || filter === null) return
  if (!isPlainObject(filter)) throw new CrmWorkspaceViolation("filter", `${where} must be a plain object`, ws)
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (!isPlainObject(node)) return
    for (const [k, v] of Object.entries(node)) {
      if (k === "$where" || k === "$function" || k === "$accumulator") {
        throw new CrmWorkspaceViolation("filter", `${where}: ${k} is not allowed`, ws)
      }
      if (k === "$expr") {
        scanExpr(v, ws, where)
        continue
      }
      if (k === KEY) {
        if (!allowedWorkspaceValue(v, ws)) throw new CrmWorkspaceViolation("filter", `${where}: workspace must be "${ws}"`, ws)
        continue
      }
      if (isWorkspacePath(k)) throw new CrmWorkspaceViolation("filter", `${where}: ${k} is not allowed`, ws)
      walk(v)
    }
  }
  walk(filter)
}

/** Validated copy of the filter with `{workspace}` set at the top level. */
function scopeFilterUnsafe<T extends Document>(filter: Filter<T> | undefined | null, ws: string, where = "filter"): Filter<T> {
  assertFilterScoped(filter, ws, where)
  return { ...((filter ?? {}) as Document), [KEY]: ws } as unknown as Filter<T>
}

/** Validated copy of a document for insert/replace, with `workspace` set. */
function scopeDocumentUnsafe<T extends Document>(doc: T, ws: string, where = "document"): T {
  if (!isPlainObject(doc)) throw new CrmWorkspaceViolation("document", `${where} must be a plain object`, ws)
  for (const k of Object.keys(doc)) {
    if (k.startsWith("$")) throw new CrmWorkspaceViolation("document", `${where} may not contain operator ${k}`, ws)
  }
  if (KEY in doc && doc[KEY] !== ws) throw new CrmWorkspaceViolation("document", `${where}: workspace must be "${ws}"`, ws)
  return { ...doc, [KEY]: ws }
}

const UPDATE_OPERATORS = new Set([
  "$set", "$unset", "$rename", "$inc", "$min", "$max", "$mul", "$currentDate", "$setOnInsert",
  "$push", "$addToSet", "$pull", "$pullAll", "$pop", "$bit",
])
const PIPELINE_UPDATE_STAGES = new Set(["$addFields", "$set", "$project", "$unset", "$replaceRoot", "$replaceWith"])

function scanPipelineUpdateStage(stage: unknown, ws: string, where: string): void {
  if (!isPlainObject(stage) || Object.keys(stage).length !== 1) {
    throw new CrmWorkspaceViolation("update", `${where}: each pipeline-update stage must have exactly one operator`, ws)
  }
  const [op, body] = Object.entries(stage)[0]
  if (!PIPELINE_UPDATE_STAGES.has(op)) throw new CrmWorkspaceViolation("update", `${where}: stage ${op} is not allowed in a pipeline update`, ws)
  if (op === "$unset") {
    const fields = Array.isArray(body) ? body : [body]
    for (const f of fields) {
      if (typeof f !== "string" || isWorkspacePath(f)) throw new CrmWorkspaceViolation("update", `${where}: $unset may not remove workspace`, ws)
    }
    return
  }
  if (op === "$addFields" || op === "$set" || op === "$project") {
    if (!isPlainObject(body)) throw new CrmWorkspaceViolation("update", `${where}: ${op} must be an object`, ws)
    for (const [k, v] of Object.entries(body)) {
      if (isWorkspacePath(k)) {
        // In $project, `workspace: 1|true` merely keeps the field; anything else changes or drops it.
        if (op === "$project" && k === KEY && (v === 1 || v === true)) continue
        throw new CrmWorkspaceViolation("update", `${where}: ${op} may not change workspace`, ws)
      }
      scanExpr(v, ws, where)
    }
    return
  }
  // $replaceRoot / $replaceWith: the expression may not mention workspace; the final
  // {$set:{workspace}} backstop re-applies it to the new root.
  scanExpr(body, ws, where)
}

/**
 * Validates an update (document or pipeline form). Returns the update to send: unchanged for
 * the document form, and for the pipeline form a copy with a trailing `{$set:{workspace}}`.
 */
function scopeUpdateUnsafe<T extends Document>(update: UpdateFilter<T> | Document[], ws: string, where = "update"): UpdateFilter<T> | Document[] {
  if (Array.isArray(update)) {
    if (update.length === 0) throw new CrmWorkspaceViolation("update", `${where}: empty pipeline update`, ws)
    update.forEach(s => scanPipelineUpdateStage(s, ws, where))
    return [...update, { $set: { [KEY]: ws } }]
  }
  if (!isPlainObject(update)) throw new CrmWorkspaceViolation("update", `${where} must be an object or a pipeline array`, ws)
  const keys = Object.keys(update)
  if (keys.length === 0) throw new CrmWorkspaceViolation("update", `${where}: empty update`, ws)
  for (const op of keys) {
    if (!op.startsWith("$")) throw new CrmWorkspaceViolation("update", `${where}: replacement-style document passed as an update (use replaceOne)`, ws)
    if (!UPDATE_OPERATORS.has(op)) throw new CrmWorkspaceViolation("update", `${where}: operator ${op} is not allowed`, ws)
    const body = (update as Record<string, unknown>)[op]
    if (!isPlainObject(body)) throw new CrmWorkspaceViolation("update", `${where}: ${op} must be an object`, ws)
    for (const [field, value] of Object.entries(body)) {
      if (isWorkspacePath(field)) throw new CrmWorkspaceViolation("update", `${where}: ${op} may not touch workspace`, ws)
      if (op === "$rename" && (typeof value !== "string" || isWorkspacePath(value))) {
        throw new CrmWorkspaceViolation("update", `${where}: $rename may not target workspace`, ws)
      }
    }
  }
  return update
}

const FORBIDDEN_STAGES = new Set([
  "$out", "$merge", "$unionWith", "$graphLookup", "$changeStream", "$changeStreamSplitLargeEvent",
  "$collStats", "$currentOp", "$indexStats", "$listSessions", "$listLocalSessions",
  "$planCacheStats", "$listSearchIndexes", "$documents",
])

function isScopedMatchStage(stage: unknown, ws: string): boolean {
  if (!isPlainObject(stage) || Object.keys(stage).length !== 1 || !isPlainObject(stage.$match)) return false
  return allowedWorkspaceValue(stage.$match[KEY], ws)
}

function scanPipeline(pipeline: unknown, ws: string, where: string): void {
  if (!Array.isArray(pipeline)) throw new CrmWorkspaceViolation("pipeline", `${where} must be an array`, ws)
  pipeline.forEach((stage, i) => {
    const at = `${where}[${i}]`
    if (!isPlainObject(stage) || Object.keys(stage).length !== 1) {
      throw new CrmWorkspaceViolation("pipeline", `${at}: each stage must have exactly one operator`, ws)
    }
    const [op, body] = Object.entries(stage)[0]
    if (FORBIDDEN_STAGES.has(op)) throw new CrmWorkspaceViolation("pipeline", `${at}: ${op} is not allowed`, ws)
    if (op === "$match") return assertFilterScoped(body, ws, at)
    if (op === "$facet") {
      if (!isPlainObject(body)) throw new CrmWorkspaceViolation("pipeline", `${at}: $facet must be an object`, ws)
      for (const [name, branch] of Object.entries(body)) scanPipeline(branch, ws, `${at}.$facet.${name}`)
      return
    }
    if (op === "$lookup") {
      if (!isPlainObject(body)) throw new CrmWorkspaceViolation("pipeline", `${at}: $lookup must be an object`, ws)
      const from = body.from
      if (typeof from !== "string" || !CRM_NAMES.has(from)) {
        throw new CrmWorkspaceViolation("pipeline", `${at}: $lookup.from must be a CRM collection (got ${String(from)})`, ws)
      }
      if (!Array.isArray(body.pipeline) || !isScopedMatchStage(body.pipeline[0], ws)) {
        throw new CrmWorkspaceViolation("pipeline", `${at}: $lookup into ${from} must use a pipeline starting with {$match:{workspace:"${ws}"}} (use scopedLookup)`, ws)
      }
      return scanPipeline(body.pipeline, ws, `${at}.$lookup.pipeline`)
    }
  })
}

/** Validated pipeline with `{$match:{workspace}}` prepended. */
function scopePipelineUnsafe(pipeline: Document[], ws: string): Document[] {
  scanPipeline(pipeline, ws, "pipeline")
  return [{ $match: { [KEY]: ws } }, ...pipeline]
}

/**
 * Builds a `$lookup` stage into another CRM collection that the wrapper accepts: the
 * sub-pipeline always starts with `{$match:{workspace}}`. `localField/foreignField` may be
 * combined with it (MongoDB ≥ 5.0).
 */
export function scopedLookup(
  ws: Workspace,
  spec: { from: CollectionName; as: string; pipeline?: Document[]; let?: Document; localField?: string; foreignField?: string },
): Document {
  assertWorkspace(ws)
  if (!CRM_NAMES.has(spec.from)) throw new CrmWorkspaceViolation("pipeline", `scopedLookup: unknown collection ${spec.from}`, ws)
  const body: Document = { from: spec.from, as: spec.as, pipeline: [{ $match: { [KEY]: ws } }, ...(spec.pipeline ?? [])] }
  if (spec.let) body.let = spec.let
  if (spec.localField !== undefined) body.localField = spec.localField
  if (spec.foreignField !== undefined) body.foreignField = spec.foreignField
  return { $lookup: body }
}

function scopeBulkOp<T extends Document>(op: AnyBulkWriteOperation<T>, ws: string, i: number): AnyBulkWriteOperation<T> {
  const where = `bulkWrite[${i}]`
  if (!isPlainObject(op) || Object.keys(op).length !== 1) throw new CrmWorkspaceViolation("bulk_write", `${where}: each op must have exactly one key`, ws)
  const [kind, rawBody] = Object.entries(op)[0] as [string, unknown]
  if (!isPlainObject(rawBody)) throw new CrmWorkspaceViolation("bulk_write", `${where}: ${kind} must be an object`, ws)
  const body = rawBody as Document
  switch (kind) {
    case "insertOne":
      return { insertOne: { ...body, document: scopeDocument(body.document, ws, `${where}.insertOne.document`) } } as AnyBulkWriteOperation<T>
    case "updateOne":
    case "updateMany":
      return { [kind]: { ...body, filter: scopeFilter(body.filter, ws, `${where}.${kind}.filter`), update: scopeUpdate(body.update, ws, `${where}.${kind}.update`) } } as AnyBulkWriteOperation<T>
    case "replaceOne":
      return { replaceOne: { ...body, filter: scopeFilter(body.filter, ws, `${where}.replaceOne.filter`), replacement: scopeDocument(body.replacement, ws, `${where}.replaceOne.replacement`) } } as AnyBulkWriteOperation<T>
    case "deleteOne":
    case "deleteMany":
      return { [kind]: { ...body, filter: scopeFilter(body.filter, ws, `${where}.${kind}.filter`) } } as AnyBulkWriteOperation<T>
    default:
      throw new CrmWorkspaceViolation("bulk_write", `${where}: unsupported op ${kind}`, ws)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot-then-validate (closes the TOCTOU window: the caller cannot mutate what is sent)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * BSON round-trip deep copy. Preserves ObjectId, Date, Decimal128, Long, Binary, RegExp and key
 * order (structuredClone would turn BSON class instances into plain objects). Explicit Int32/Double
 * wrappers become plain numbers, which the driver re-encodes the same way. `undefined` becomes null,
 * exactly as the driver itself encodes it by default.
 */
export function bsonSnapshot<V>(value: V): V {
  return BSON.deserialize(BSON.serialize({ v: value as unknown }, { ignoreUndefined: false }), { promoteLongs: false, promoteBuffers: false }).v as V
}

/**
 * Each exported scoper validates the caller's value (so values BSON would silently drop, such as
 * functions, still fail loudly), then snapshots it, validates the snapshot and returns the scoped
 * snapshot. Only the snapshot is ever sent to the driver.
 */
export function scopeFilter<T extends Document>(filter: Filter<T> | undefined | null, ws: string, where = "filter"): Filter<T> {
  assertFilterScoped(filter, ws, where)
  return scopeFilterUnsafe(bsonSnapshot(filter ?? {}) as Filter<T>, ws, where)
}
export function scopeDocument<T extends Document>(doc: T, ws: string, where = "document"): T {
  scopeDocumentUnsafe(doc, ws, where)
  return scopeDocumentUnsafe(bsonSnapshot(doc), ws, where)
}
export function scopeUpdate<T extends Document>(update: UpdateFilter<T> | Document[], ws: string, where = "update"): UpdateFilter<T> | Document[] {
  scopeUpdateUnsafe(update, ws, where)
  return scopeUpdateUnsafe(bsonSnapshot(update), ws, where)
}
export function scopePipeline(pipeline: Document[], ws: string): Document[] {
  scopePipelineUnsafe(pipeline, ws)
  return scopePipelineUnsafe(bsonSnapshot(pipeline), ws)
}

// ─────────────────────────────────────────────────────────────────────────────
// Driver-handle hiding + transaction session tokens
// ─────────────────────────────────────────────────────────────────────────────

/** MongoClient / Db / Collection / ClientSession (by class, plus a duck-typed fallback). */
function isDriverHandle(v: unknown): boolean {
  if (!v || (typeof v !== "object" && typeof v !== "function")) return false
  if (v instanceof MongoClientRt || v instanceof DbRt || v instanceof CollectionRt || v instanceof ClientSessionRt) return true
  const o = v as Record<string, unknown>
  return (
    typeof o.startSession === "function" ||
    typeof o.startTransaction === "function" ||
    typeof o.withTransaction === "function" ||
    (typeof o.collection === "function" && typeof o.command === "function") ||
    (typeof o.insertOne === "function" && typeof o.bulkWrite === "function" && !(v instanceof ScopedCollection))
  )
}

const HIDDEN_PROPS = new Set(["client", "session", "cursorSession", "db", "collection", "parent"])

/**
 * Opaque transaction token handed to withTransaction callbacks. Pass it as `{ session }` to any
 * wrapper method; the wrapper maps it to the real ClientSession, which never leaves this module.
 */
export interface CrmSession {
  readonly crmSession: true
}
const SESSIONS = new WeakMap<object, ClientSession>()

type WithCrmSession<O> = Omit<O, "session"> & { session?: CrmSession }

/** Replaces a CrmSession token with the real session; rejects anything else in `session`. */
function realOptions<O extends object>(options: WithCrmSession<O> | undefined, ws: string): O | undefined {
  if (!options || !("session" in options)) return options as O | undefined
  const token = (options as { session?: unknown }).session
  if (token === undefined) return options as O
  const real = token && typeof token === "object" ? SESSIONS.get(token) : undefined
  if (!real) throw new CrmWorkspaceViolation("session", "options.session must be the token from withTransaction (and the transaction must still be running)", ws)
  return { ...options, session: real } as unknown as O
}

// ─────────────────────────────────────────────────────────────────────────────
// Cursor guard
// ─────────────────────────────────────────────────────────────────────────────

const BLOCKED_FIND_CURSOR = new Set(["filter", "addQueryModifier"])
const LEGACY_BLOCKED_CURSOR: ReadonlySet<string> = new Set()
const BLOCKED_AGG_CURSOR = new Set(["addStage", "out", "lookup", "geoNear", "group", "match", "project", "redact", "unwind"])

/**
 * Proxy that blocks filter/pipeline mutation and hides every driver handle (client, session, db,
 * collection: by name AND by value), so no unscoped object is reachable from a CRM cursor.
 * Chaining and clone() stay guarded.
 */
function guardCursor<C extends object>(cursor: C, blocked: ReadonlySet<string>, ws: string): C {
  const hidden = (prop: PropertyKey): never => {
    throw new CrmWorkspaceViolation("cursor", `cursor.${String(prop)} is not accessible on CRM cursors`, ws)
  }
  const proxy: C = new Proxy(cursor, {
    get(target, prop) {
      if (typeof prop === "string" && blocked.has(prop)) {
        return () => {
          throw new CrmWorkspaceViolation("cursor", `cursor.${prop}() is blocked on CRM cursors; pass the full filter/pipeline to the wrapper`, ws)
        }
      }
      if (typeof prop === "string" && HIDDEN_PROPS.has(prop)) return hidden(prop)
      const value = Reflect.get(target, prop, target)
      if (typeof value !== "function") return isDriverHandle(value) ? hidden(prop) : value
      return (...args: unknown[]) => {
        const out = (value as (...a: unknown[]) => unknown).apply(target, args)
        if (out === target) return proxy
        if (prop === "clone" && out && typeof out === "object") return guardCursor(out as object, blocked, ws)
        if (isDriverHandle(out)) return hidden(prop)
        return out
      }
    },
    getOwnPropertyDescriptor() {
      return undefined
    },
    ownKeys() {
      return []
    },
    set() {
      throw new CrmWorkspaceViolation("cursor", "CRM cursors are read-only", ws)
    },
    defineProperty() {
      throw new CrmWorkspaceViolation("cursor", "CRM cursors are read-only", ws)
    },
  })
  return proxy
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoped collection
// ─────────────────────────────────────────────────────────────────────────────

function blocked(method: string, ws: string): never {
  throw new CrmWorkspaceViolation("blocked_method", `${method} is not available on CRM collections`, ws)
}

/** Raw driver collection shape used internally (kept untyped on purpose; never exported). */
type RawCollection = ReturnType<Db["collection"]>
const RAW = new WeakMap<object, RawCollection>()
/** Module-private lookup: the unscoped driver collection is never reachable as a property. */
function rawOf(c: object): RawCollection {
  const raw = RAW.get(c)
  if (!raw) throw new Error("crm db: unknown scoped collection")
  return raw
}

export class ScopedCollection<T extends Document = Document> {
  readonly workspace: Workspace
  readonly collectionName: CollectionName

  /** Validates its inputs: a ScopedCollection can only ever wrap a CRM collection for a known workspace. */
  constructor(raw: RawCollection, name: CollectionName, ws: Workspace) {
    assertWorkspace(ws)
    if (!CRM_NAMES.has(name)) throw new CrmWorkspaceViolation("bad_collection", `not a CRM collection: ${JSON.stringify(name)}`, ws)
    const rawName = (raw as { collectionName?: unknown } | null)?.collectionName
    if (rawName !== name) throw new CrmWorkspaceViolation("bad_collection", `driver collection ${JSON.stringify(rawName)} does not match ${name}`, ws)
    this.workspace = ws
    this.collectionName = name
    RAW.set(this, raw)
  }


  // ── reads ──
  find(filter: Filter<T> = {}, options?: WithCrmSession<FindOptions>): FindCursor<WithId<T>> {
    const cursor = rawOf(this).find(scopeFilter(filter as Document, this.workspace), realOptions(options, this.workspace))
    return guardCursor(cursor, BLOCKED_FIND_CURSOR, this.workspace) as unknown as FindCursor<WithId<T>>
  }

  findOne(filter: Filter<T> = {}, options?: WithCrmSession<FindOptions>): Promise<WithId<T> | null> {
    return rawOf(this).findOne(scopeFilter(filter as Document, this.workspace), realOptions(options, this.workspace)) as Promise<WithId<T> | null>
  }

  countDocuments(filter: Filter<T> = {}, options?: WithCrmSession<CountDocumentsOptions>): Promise<number> {
    return rawOf(this).countDocuments(scopeFilter(filter as Document, this.workspace), realOptions(options, this.workspace))
  }

  distinct(key: string, filter: Filter<T> = {}, options: WithCrmSession<DistinctOptions> = {}): Promise<unknown[]> {
    return rawOf(this).distinct(key, scopeFilter(filter as Document, this.workspace), realOptions(options, this.workspace) ?? {})
  }

  aggregate<R extends Document = Document>(pipeline: Document[] = [], options?: WithCrmSession<AggregateOptions>): AggregationCursor<R> {
    const cursor = rawOf(this).aggregate<R>(scopePipeline(pipeline, this.workspace), realOptions(options, this.workspace))
    return guardCursor(cursor, BLOCKED_AGG_CURSOR, this.workspace)
  }

  // ── inserts ──
  insertOne(doc: OptionalUnlessRequiredId<T>, options?: WithCrmSession<InsertOneOptions>): Promise<InsertOneResult<T>> {
    return rawOf(this).insertOne(scopeDocument(doc as Document, this.workspace), realOptions(options, this.workspace)) as Promise<InsertOneResult<T>>
  }

  insertMany(docs: readonly OptionalUnlessRequiredId<T>[], options?: WithCrmSession<BulkWriteOptions>): Promise<InsertManyResult<T>> {
    if (!Array.isArray(docs)) throw new CrmWorkspaceViolation("document", "insertMany expects an array", this.workspace)
    const scoped = docs.map((d, i) => scopeDocument(d as Document, this.workspace, `insertMany[${i}]`))
    return rawOf(this).insertMany(scoped, realOptions(options, this.workspace)) as Promise<InsertManyResult<T>>
  }

  // ── updates ──
  updateOne(filter: Filter<T>, update: UpdateFilter<T> | Document[], options?: WithCrmSession<UpdateOptions>): Promise<UpdateResult<T>> {
    return rawOf(this).updateOne(scopeFilter(filter as Document, this.workspace), scopeUpdate(update as Document, this.workspace), realOptions(options, this.workspace)) as Promise<UpdateResult<T>>
  }

  updateMany(filter: Filter<T>, update: UpdateFilter<T> | Document[], options?: WithCrmSession<UpdateOptions>): Promise<UpdateResult<T>> {
    return rawOf(this).updateMany(scopeFilter(filter as Document, this.workspace), scopeUpdate(update as Document, this.workspace), realOptions(options, this.workspace)) as Promise<UpdateResult<T>>
  }

  replaceOne(filter: Filter<T>, replacement: WithoutId<T>, options?: WithCrmSession<ReplaceOptions>): Promise<UpdateResult<T>> {
    return rawOf(this).replaceOne(scopeFilter(filter as Document, this.workspace), scopeDocument(replacement as Document, this.workspace, "replacement"), realOptions(options, this.workspace)) as Promise<UpdateResult<T>>
  }

  findOneAndUpdate(filter: Filter<T>, update: UpdateFilter<T> | Document[], options: WithCrmSession<FindOneAndUpdateOptions> = {}): Promise<WithId<T> | null> {
    return rawOf(this).findOneAndUpdate(scopeFilter(filter as Document, this.workspace), scopeUpdate(update as Document, this.workspace), { ...realOptions(options, this.workspace), includeResultMetadata: false }) as Promise<WithId<T> | null>
  }

  findOneAndReplace(filter: Filter<T>, replacement: WithoutId<T>, options: WithCrmSession<FindOneAndReplaceOptions> = {}): Promise<WithId<T> | null> {
    return rawOf(this).findOneAndReplace(scopeFilter(filter as Document, this.workspace), scopeDocument(replacement as Document, this.workspace, "replacement"), { ...realOptions(options, this.workspace), includeResultMetadata: false }) as Promise<WithId<T> | null>
  }

  // ── deletes ──
  deleteOne(filter: Filter<T>, options?: WithCrmSession<DeleteOptions>): Promise<DeleteResult> {
    return rawOf(this).deleteOne(scopeFilter(filter as Document, this.workspace), realOptions(options, this.workspace))
  }

  deleteMany(filter: Filter<T>, options?: WithCrmSession<DeleteOptions>): Promise<DeleteResult> {
    return rawOf(this).deleteMany(scopeFilter(filter as Document, this.workspace), realOptions(options, this.workspace))
  }

  findOneAndDelete(filter: Filter<T>, options: WithCrmSession<FindOneAndDeleteOptions> = {}): Promise<WithId<T> | null> {
    return rawOf(this).findOneAndDelete(scopeFilter(filter as Document, this.workspace), { ...realOptions(options, this.workspace), includeResultMetadata: false }) as Promise<WithId<T> | null>
  }

  // ── bulk ──
  bulkWrite(ops: readonly AnyBulkWriteOperation<T>[], options?: WithCrmSession<BulkWriteOptions>): Promise<BulkWriteResult> {
    if (!Array.isArray(ops) || ops.length === 0) throw new CrmWorkspaceViolation("bulk_write", "bulkWrite expects a non-empty array", this.workspace)
    const scoped = ops.map((op, i) => scopeBulkOp(op, this.workspace, i))
    return rawOf(this).bulkWrite(scoped as AnyBulkWriteOperation<Document>[], realOptions(options, this.workspace))
  }

  // ── blocked outright ──
  estimatedDocumentCount(): never { return blocked("estimatedDocumentCount (cannot be filtered; use countDocuments)", this.workspace) }
  watch(): never { return blocked("watch", this.workspace) }
  drop(): never { return blocked("drop", this.workspace) }
  rename(): never { return blocked("rename", this.workspace) }
  createIndex(): never { return blocked("createIndex (use ensureIndexes)", this.workspace) }
  createIndexes(): never { return blocked("createIndexes (use ensureIndexes)", this.workspace) }
  dropIndex(): never { return blocked("dropIndex", this.workspace) }
  dropIndexes(): never { return blocked("dropIndexes", this.workspace) }
  initializeOrderedBulkOp(): never { return blocked("initializeOrderedBulkOp (use bulkWrite)", this.workspace) }
  initializeUnorderedBulkOp(): never { return blocked("initializeUnorderedBulkOp (use bulkWrite)", this.workspace) }
}

/** Read-only, unscoped access to the legacy CRM collections (migration script only, ADR §17). */
export interface LegacyReadOnly {
  readonly collectionName: string
  find(filter?: Document, options?: WithCrmSession<FindOptions>): FindCursor<WithId<Document>>
  findOne(filter?: Document, options?: WithCrmSession<FindOptions>): Promise<WithId<Document> | null>
  countDocuments(filter?: Document, options?: WithCrmSession<CountDocumentsOptions>): Promise<number>
}

// ─────────────────────────────────────────────────────────────────────────────
// CrmDb
// ─────────────────────────────────────────────────────────────────────────────

export interface CrmDb {
  readonly workspace: Workspace
  /** Resolved database name (for diagnostics only). */
  readonly databaseName: string
  collection<T extends Document = Document>(name: CollectionName): ScopedCollection<T>
  legacy(name: (typeof LEGACY_COLL)[keyof typeof LEGACY_COLL]): LegacyReadOnly
  /** Applies INDEX_SPECS idempotently (lib/crm/indexes.ts). Conflicts are reported, never dropped. */
  ensureIndexes(specs?: readonly IndexSpec[], opts?: { dryRun?: boolean }): Promise<IndexReport>
  /** Runs `fn` in a transaction; pass the session to every wrapper call inside. Needs a client. */
  withTransaction<R>(fn: (session: CrmSession) => Promise<R>, options?: TransactionOptions): Promise<R>
}

export function assertWorkspace(ws: unknown): asserts ws is Workspace {
  if (typeof ws !== "string" || !(WORKSPACES as readonly string[]).includes(ws)) {
    throw new CrmWorkspaceViolation("bad_workspace", `unknown workspace ${JSON.stringify(ws)}`)
  }
}

export interface CrmDbFromOptions {
  /** DB holding the legacy crm_dealers / crm_opportunities (default: same db). */
  legacyDb?: Db
  /** Needed only for withTransaction(). */
  client?: MongoClient
}

/** Builds the scoped wrapper over an injected Db (tests, scripts). No env guard here. */
export function crmDbFrom(db: Db, workspace: Workspace, opts: CrmDbFromOptions = {}): CrmDb {
  assertWorkspace(workspace)
  const ws = workspace
  const legacyDb = opts.legacyDb ?? db
  const resolve = (name: string): RawCollection => {
    if (!CRM_NAMES.has(name)) throw new CrmWorkspaceViolation("bad_collection", `not a CRM collection: ${JSON.stringify(name)} (use COLL.*)`, ws)
    return db.collection(name)
  }
  const cache = new Map<string, ScopedCollection<Document>>()
  return Object.freeze({
    workspace: ws,
    databaseName: db.databaseName,
    collection<T extends Document = Document>(name: CollectionName): ScopedCollection<T> {
      let c = cache.get(name)
      if (!c) {
        c = new ScopedCollection<Document>(resolve(name), name, ws)
        cache.set(name, c)
      }
      return c as unknown as ScopedCollection<T>
    },
    legacy(name: (typeof LEGACY_COLL)[keyof typeof LEGACY_COLL]): LegacyReadOnly {
      if (!LEGACY_NAMES.has(name)) throw new CrmWorkspaceViolation("bad_collection", `not a legacy CRM collection: ${JSON.stringify(name)}`, ws)
      const raw = legacyDb.collection(name)
      return Object.freeze({
        collectionName: name,
        find: (filter: Document = {}, options?: WithCrmSession<FindOptions>) =>
          guardCursor(raw.find(filter, realOptions(options, ws)), LEGACY_BLOCKED_CURSOR, ws),
        findOne: (filter: Document = {}, options?: WithCrmSession<FindOptions>) =>
          raw.findOne(filter, realOptions(options, ws)) as Promise<WithId<Document> | null>,
        countDocuments: (filter: Document = {}, options?: WithCrmSession<CountDocumentsOptions>) =>
          raw.countDocuments(filter, realOptions(options, ws)),
      })
    },
    ensureIndexes(specs: readonly IndexSpec[] = INDEX_SPECS, o: { dryRun?: boolean } = {}): Promise<IndexReport> {
      return applyIndexSpecs(name => resolve(name) as unknown as IndexTarget, specs, o)
    },
    async withTransaction<R>(fn: (session: CrmSession) => Promise<R>, options?: TransactionOptions): Promise<R> {
      if (!opts.client) throw new CrmWorkspaceViolation("db_guard", "withTransaction needs a MongoClient (crmDbFrom(db, ws, {client}))", ws)
      const session = opts.client.startSession()
      try {
        let result: R | undefined
        await session.withTransaction(async s => {
          // The callback gets an opaque token, never the ClientSession (whose .client is the raw MongoClient).
          const token: CrmSession = Object.freeze({ crmSession: true as const })
          SESSIONS.set(token, s)
          try {
            result = await fn(token)
          } finally {
            SESSIONS.delete(token)
          }
        }, options)
        return result as R
      } finally {
        await session.endSession()
      }
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Env-resolved access (ADR §18 / DATA_MODEL §10)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Staging/prod guard. Outside VERCEL_ENV=production the resolved DB name must not equal
 * CRM_PROD_DB_NAME unless CRM_ALLOW_PROD_DB=1. Fails closed when CRM_PROD_DB_NAME is unset
 * outside production (local .env.local points at the prod DB).
 */
export function assertCrmDbAllowed(resolvedDbName: string, env: Record<string, string | undefined> = process.env): void {
  const e = readCrmEnv(env)
  if (e.vercelEnv === "production") return
  if (!e.prodDbName) {
    throw new CrmWorkspaceViolation("db_guard", "CRM_PROD_DB_NAME is not set; refusing to open the CRM DB outside production")
  }
  if (resolvedDbName === e.prodDbName && !e.allowProdDb) {
    throw new CrmWorkspaceViolation(
      "db_guard",
      "non-production environment resolved the CRM DB to the production DB; set CRM_MONGODB_DB to a staging DB or CRM_ALLOW_PROD_DB=1 deliberately",
    )
  }
}

/**
 * Production entry point: shared client from lib/mongodb.ts, DB = CRM_MONGODB_DB (trimmed) or the
 * URI default. lib/mongodb.ts is imported lazily so that importing this module (tests, type-only
 * users) never requires MONGODB_URI.
 */
export async function crmDb(workspace: Workspace): Promise<CrmDb> {
  assertWorkspace(workspace)
  const env = readCrmEnv()
  const { clientPromise } = await import("../mongodb")
  const client = await clientPromise
  const db = client.db(env.mongoDb || undefined)
  assertCrmDbAllowed(db.databaseName)
  // Legacy collections live in the default 100X DB even when CRM uses a staging DB (DATA_MODEL §9).
  return crmDbFrom(db, workspace, { client, legacyDb: client.db() })
}
