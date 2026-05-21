import { describe, expect, it } from "vitest";
import { BlogData } from "../src/data.js";
import { createLoaders } from "../src/loaders.js";

describe("DataLoader", () => {
  it("batches concurrent loads into one backend call", async () => {
    const data = new BlogData(10, 0);
    const loaders = createLoaders(data);
    const results = await Promise.all([
      loaders.authorById.load("a1"),
      loaders.authorById.load("a2"),
      loaders.authorById.load("a3"),
    ]);
    expect(results.map((a) => a?.id)).toEqual(["a1", "a2", "a3"]);
    expect(data.authorBatchCalls).toBe(1); // all three coalesced
  });

  it("caches repeated loads within a request", async () => {
    const data = new BlogData(10, 0);
    const loaders = createLoaders(data);
    await loaders.authorById.load("a1");
    await loaders.authorById.load("a1");
    expect(data.authorBatchCalls).toBe(1); // second load served from cache
  });

  it("returns null for unknown ids without throwing", async () => {
    const data = new BlogData(2, 0);
    const loaders = createLoaders(data);
    expect(await loaders.authorById.load("missing")).toBeNull();
  });
});
