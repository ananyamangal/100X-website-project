// Test/script-only: lets Node's TypeScript stripping resolve the repo's extensionless
// relative imports and the "@/..." alias, so lib code can be exercised without a bundler.
// Usage: node --import ./tests/support/register.mjs <file>
import { register } from "node:module"
register("./ts-resolve-hooks.mjs", import.meta.url)
