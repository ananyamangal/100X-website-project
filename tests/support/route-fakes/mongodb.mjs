// Fake @/lib/mongodb: a client whose db() is the current in-memory FakeDb.
import { state } from "./state.mjs"

const client = { db: () => state.db }
const clientPromise = Promise.resolve(client)
export { clientPromise }
export default clientPromise
