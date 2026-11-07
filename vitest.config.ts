import { createRequire } from "node:module";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);

export default defineConfig({
  // Resolve every `graphql` import to the CommonJS entry that Node itself uses
  // at runtime. Packages that `require("graphql")` (graphql-armor) and the ESM
  // graph then share one module realm; otherwise GraphQLSchema and GraphQLError
  // instances are rejected or masked across realms.
  resolve: {
    alias: [{ find: /^graphql$/, replacement: require.resolve("graphql") }],
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: { provider: "v8", include: ["src/**/*.ts"], exclude: ["src/server.ts"] },
  },
});
