# graphql-blog-api

> GraphQL API on GraphQL Yoga with request-scoped DataLoader batching. **Resolving 500 posts' authors drops from 500 backend fetches to 1 (500x N+1 reduction)**, measured not asserted. TypeScript, SDL-first schema, 11 tests.

[![ci](https://github.com/Tajaddin/graphql-blog-api/actions/workflows/ci.yml/badge.svg)](https://github.com/Tajaddin/graphql-blog-api/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Node](https://img.shields.io/badge/node-20%2B-green)](package.json)

## Hero metrics

Reproducible instantly:

```bash
BENCH_HARDWARE="your machine specs" npx tsx benchmarks/n1.ts --posts 500
```

Last measured baseline lives in [`benchmarks/results/n1.json`](benchmarks/results/n1.json) (includes timestamp, hardware, and the exact command used).

| Resolving 500 posts + their authors | Backend fetches | Latency |
|---|---:|---:|
| **Naive resolver** (1 author lookup per post) | **500** | ~22 ms |
| **DataLoader resolver** (batched) | **1** | ~16 ms |
| **Reduction** | **500x** | |

The fetch counts are deterministic properties of DataLoader batching; latency varies run to run.

The benchmark runs the identical GraphQL query against both resolver strategies and counts real backend calls through a fetch-counting data layer. The N+1 problem and its DataLoader fix are the single most common GraphQL performance topic; here it is demonstrated with receipts.

## What it is

A blog API (authors + posts) that demonstrates the GraphQL patterns interviews probe:

| Concern | Implementation |
|---|---|
| Schema | SDL-first via `@graphql-tools/schema`, served by GraphQL Yoga |
| N+1 avoidance | `dataloader` batches all `Post.author` lookups in a tick into one backend call |
| Request scoping | Loaders are created per request in the Yoga context, so the cache never leaks across requests |
| Pagination | `posts(limit, offset)` |
| Computed fields | `Author.postCount` resolver |
| Proof | A fetch-counting data layer makes the N+1 reduction observable in tests and the benchmark |

## Why this matters for hiring

Role categories unlocked: **Full-Stack**, Backend (Node/TypeScript), API Engineering.

GraphQL without DataLoader is a production incident waiting to happen. This repo backs the "GraphQL" resume line with a correct, request-scoped batching setup and a benchmark that proves the fetch reduction.

## How to run

Prerequisites: Node 20+.

```bash
npm install
npm test                    # 11 vitest cases
npm run dev                 # GraphQL endpoint on http://localhost:8080/graphql
npx tsx benchmarks/n1.ts    # reproduces the 500x N+1 reduction
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
npm test     # 11 tests
```

- **schema.test.ts** (5): posts+authors, single author, missing author null, `postCount`, offset pagination.
- **loaders.test.ts** (3): concurrent loads coalesce into one batch, in-request cache, null for unknown id.
- **n1.test.ts** (3): naive = 1 fetch/post, batched = 1 fetch total, reduction factor scales with post count.

Note: the vitest config dedupes and inlines `graphql` so `@graphql-tools` and the direct import share one module realm (otherwise GraphQLSchema instances are rejected across realms).

## Project layout

```
src/
  data.ts       # in-memory authors/posts + fetch counters (the N+1 signal)
  loaders.ts    # per-request DataLoader factory + context type
  schema.ts     # SDL + resolvers (naive | batched author resolution)
  server.ts     # GraphQL Yoga HTTP server
benchmarks/n1.ts # naive-vs-batched fetch-count + latency hero
```

## Stack

TypeScript (strict), GraphQL Yoga, graphql, @graphql-tools/schema, dataloader, Vitest, Docker (alpine), GitHub Actions.

## License

MIT
