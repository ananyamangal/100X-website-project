// Shared, resettable state for the route fakes (see hooks.mjs).
import { FakeDb } from "../fake-db.mjs"

export const state = { db: new FakeDb(), emails: [], afterQueue: [], emailConfigured: true }

export function resetRouteFakes({ emailConfigured = true } = {}) {
  state.db = new FakeDb()
  state.emails = []
  state.afterQueue = []
  state.emailConfigured = emailConfigured
  return state
}

/** Runs the callbacks the route handed to after() (the response has already been built). */
export async function flushAfter() {
  while (state.afterQueue.length) await state.afterQueue.shift()()
}
