// Test-only resolve hook for exercising the public lead routes without a database,
// mailer or Next.js request scope. Register it (module.register) BEFORE importing a
// route; it swaps three imports for the in-memory fakes next to this file:
//   @/lib/mongodb  -> mongodb.mjs     (clientPromise resolving to state.db)
//   @/lib/email    -> email.mjs       (records sendAdminEmail calls, never sends)
//   next/server    -> next-server.mjs (real NextRequest/NextResponse, after() queued)
// Everything else resolves normally (tests/support/ts-resolve-hooks.mjs).
const here = (f) => new URL(`./${f}`, import.meta.url).href

export async function resolve(specifier, context, next) {
  if (specifier === "@/lib/mongodb") return { url: here("mongodb.mjs"), shortCircuit: true }
  if (specifier === "@/lib/email") return { url: here("email.mjs"), shortCircuit: true }
  if (specifier === "next/server" && context.parentURL && !context.parentURL.includes("/route-fakes/")) {
    return { url: here("next-server.mjs"), shortCircuit: true }
  }
  return next(specifier, context)
}
