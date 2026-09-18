/**
 * Version-controlled initial import for the `knowledge_articles` collection.
 *
 * The canonical data lives in `seed-data.json` (also read by
 * `scripts/seed-knowledge.mjs`, which upserts it into MongoDB by slug). This
 * module just types it for the app. Once seeded, admin edits live in the DB;
 * re-running the seed re-imports these baseline versions.
 *
 * Fidelity + batch rules are documented at the top of `scripts/seed-knowledge.mjs`.
 */
import seed from "./seed-data.json"
import type { KnowledgeArticle } from "@/lib/knowledge/types"

export const SEED_ARTICLES = seed as unknown as KnowledgeArticle[]
