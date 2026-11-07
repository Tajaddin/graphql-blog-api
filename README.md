# graphql-blog-api

> GraphQL API on GraphQL Yoga with request-scoped DataLoader batching. **Resolving a full page of 100 posts' authors drops from 100 backend fetches to 1 (100x N+1 reduction)**, measured not asserted. Alias, depth, cost and token limits reject abusive documents before they run. TypeScript, SDL-first schema, 18 tests.

[![ci](https://github.com/Tajaddin/graphql-blog-api/actions/workflows/ci.yml/badge.svg)](https://github.com/Tajaddin/graphql-blog-api/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Node](https://img.shields.io/badge/node-20%2B-green)](package.json)

## Hero metrics

Reproducible instantly:

```bash
BENCH_HARDWARE="your machine specs" npx tsx benchmarks/n1.ts --posts 100
```

Last measured baseline lives in [`benchmarks/results/n1.json`](benchmarks/results/n1.json) (includes timestamp, hardware, and the exact command used).

| Resolving 100 posts (one full page) + their authors | Backend fetches | Latency |
|---|---:|---:|
| **Naive resolver** (1 author lookup per post) | **100** | 13.58 ms |
| **DataLoader resolver** (batched) | **1** | 4.21 ms |
| **Reduction** | **100x** | |

The fetch counts are deterministic properties of DataLoader batching: N posts cost N lookups naively and 1 batched, and `posts` returns at most 100 per page. Latency is one in-process run and varies; three consecutive runs on the same machine gave 5.47-13.58 ms naive and 2.82-4.21 ms batched.

The benchmark runs the identical GraphQL query against both resolver strategies and counts real backend calls through a fetch-counting data layer. The N+1 problem and its DataLoader fix are the single most common GraphQL performance topic; here it is demonstrated with receipts.

## What it is

A blog API (authors + posts) that demonstrates the GraphQL patterns interviews probe:

| Concern | Implementation |
|---|---|
| Schema | SDL-first via `@graphql-tools/schema`, served by GraphQL Yoga |
| N+1 avoidance | `dataloader` batches all `Post.author` lookups in a tick into one backend call |
| Request scoping | Loaders are created per request in the Yoga context, so the cache never leaks across requests |
| Pagination | `posts(limit, offset)`: limit capped at 100; a limit below 1 or a negative offset is a `BAD_USER_INPUT` error |
| Computed fields | `Author.postCount`, counted once when the dataset loads, so each lookup is O(1) instead of a scan of every post |
| Query limits | `graphql-armor` on Yoga: at most 15 aliases, depth 6, cost 5000 and 1000 tokens per document, checked before execution |
| Proof | A fetch-counting data layer makes the N+1 reduction observable in tests and the benchmark |

## Why this matters for hiring

Role categories unlocked: **Full-Stack**, Backend (Node/TypeScript), API Engineering.

GraphQL without DataLoader is a production incident waiting to happen. This repo backs the "GraphQL" resume line with a correct, request-scoped batching setup and a benchmark that proves the fetch reduction.

## How to run

Prerequisites: Node 20+.

```bash
npm install
npm test                    # 18 vitest cases
npm run dev                 # GraphQL endpoint on http://localhost:8080/graphql
npx tsx benchmarks/n1.ts    # reproduces the 100x N+1 reduction
```

Smoke test (after `npm run dev`):

```graphql
query {
  posts(limit: 5) {
    id
    title
    author { id name postCount }
  }
}
```

All five posts' authors resolve through a single batched backend call.

## Schema

```graphql
type Author { id: ID!  name: String!  postCount: Int! }
type Post   { id: ID!  title: String!  author: Author! }
type Query {
  posts(limit: Int = 100, offset: Int = 0): [Post!]!
  author(id: ID!): Author
  authors: [Author!]!
}
```

## Testing

```bash
npm test     # 18 tests
```

- **schema.test.ts** (9): posts+authors, single author, missing author null, `postCount` (even and uneven splits), offset pagination, limit capped at 100, limit below 1 rejected, negative offset rejected.
- **loaders.test.ts** (3): concurrent loads coalesce into one batch, in-request cache, null for unknown id.
- **n1.test.ts** (3): naive = 1 fetch/post, batched = 1 fetch total, reduction factor scales with post count.
- **app.test.ts** (3): through the Yoga HTTP handler: a normal page query, a 1,000-alias query rejected with zero backend fetches, 15 aliases allowed and 16 rejected.

Note: the vitest config aliases `graphql` to the CommonJS entry Node uses at runtime, so packages that `require("graphql")` (graphql-armor) and the ESM graph share one module realm (otherwise GraphQLSchema instances are rejected and GraphQLError messages are masked across realms).

## Project layout

```
src/
  data.ts       # in-memory authors/posts + fetch counters (the N+1 signal)
  loaders.ts    # per-request DataLoader factory + context type
  schema.ts     # SDL + resolvers (naive | batched author resolution)
  app.ts        # Yoga app: schema, per-request context, graphql-armor limits
  server.ts     # HTTP entry point
benchmarks/n1.ts # naive-vs-batched fetch-count + latency hero
```

## Stack

TypeScript (strict), GraphQL Yoga, graphql, @graphql-tools/schema, dataloader, graphql-armor, Vitest, Docker (alpine), GitHub Actions.

## License

MIT
