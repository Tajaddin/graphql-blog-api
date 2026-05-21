import { defineConfig } from "vitest/config";

export default defineConfig({
  // Force a single copy of graphql; @graphql-tools and the direct import must
  // share one module realm or GraphQLSchema instances are rejected across realms.
  resolve: {
    dedupe: ["graphql"],
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    server: {
      deps: {
        // Inline every graphql-named package so vite transforms them into one
        // module graph sharing the single deduped graphql instance.
        inline: [/graphql/],
      },
    },
    coverage: { provider: "v8", include: ["src/**/*.ts"], exclude: ["src/server.ts"] },
  },
});
