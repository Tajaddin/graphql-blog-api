// N+1 benchmark: execute the same query (all posts, each with its author)
// against the naive resolver and the DataLoader resolver, and report the
// backend-fetch counts plus latency. This is the canonical GraphQL performance
// win, measured rather than asserted.
//
//   npx tsx benchmarks/n1.ts --posts 500

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { graphql } from "graphql";
import { BlogData } from "../src/data.js";
import { createLoaders } from "../src/loaders.js";
import { createSchema, type ResolveMode } from "../src/schema.js";

const QUERY = /* GraphQL */ `
  query AllPostsWithAuthors($limit: Int!) {
    posts(limit: $limit) {
      id
      title
      author {
        id
        name
      }
    }
  }
`;

async function run(mode: ResolveMode, postCount: number) {
  const data = new BlogData(20, postCount);
  const schema = createSchema(mode);
  const start = performance.now();
  const result = await graphql({
    schema,
    source: QUERY,
    variableValues: { limit: postCount },
    contextValue: { data, loaders: createLoaders(data) },
  });
  const ms = performance.now() - start;
  if (result.errors) throw new Error(JSON.stringify(result.errors));
  const resolved = (result.data?.["posts"] as unknown[]).length;
  return {
    mode,
    resolved_posts: resolved,
    backend_fetches: mode === "naive" ? data.authorFetchCalls : data.authorBatchCalls,
    latency_ms: Number(ms.toFixed(2)),
  };
}

async function main() {
  const postsArg = process.argv.indexOf("--posts");
  const postCount = postsArg >= 0 ? Number(process.argv[postsArg + 1]) : 500;

  const naive = await run("naive", postCount);
  const batched = await run("batched", postCount);

  const summary = {
    posts: postCount,
    naive_backend_fetches: naive.backend_fetches,
    batched_backend_fetches: batched.backend_fetches,
    n1_reduction_factor: Number((naive.backend_fetches / batched.backend_fetches).toFixed(1)),
    naive_latency_ms: naive.latency_ms,
    batched_latency_ms: batched.latency_ms,
  };
  mkdirSync(dirname("benchmarks/results/n1.json"), { recursive: true });
  writeFileSync("benchmarks/results/n1.json", JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
