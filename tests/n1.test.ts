import { graphql } from "graphql";
import { describe, expect, it } from "vitest";
import { BlogData } from "../src/data.js";
import { createLoaders } from "../src/loaders.js";
import { createSchema } from "../src/schema.js";

const QUERY = `query($limit: Int!) { posts(limit: $limit) { id author { id } } }`;

async function fetchesFor(mode: "naive" | "batched", postCount: number) {
  const data = new BlogData(20, postCount);
  const result = await graphql({
    schema: createSchema(mode),
    source: QUERY,
    variableValues: { limit: postCount },
    contextValue: { data, loaders: createLoaders(data) },
  });
  expect(result.errors).toBeUndefined();
  return mode === "naive" ? data.authorFetchCalls : data.authorBatchCalls;
}

describe("N+1 behavior", () => {
  it("naive resolver makes one backend fetch per post", async () => {
    expect(await fetchesFor("naive", 100)).toBe(100);
  });

  it("DataLoader collapses author loads into a single batch", async () => {
    expect(await fetchesFor("batched", 100)).toBe(1);
  });

  it("reduction factor scales with post count", async () => {
    const naive = await fetchesFor("naive", 500);
    const batched = await fetchesFor("batched", 500);
    expect(naive).toBe(500);
    expect(batched).toBe(1);
    expect(naive / batched).toBe(500);
  });
});
