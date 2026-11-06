import { graphql } from "graphql";
import { describe, expect, it } from "vitest";
import { BlogData } from "../src/data.js";
import { createLoaders } from "../src/loaders.js";
import { createSchema } from "../src/schema.js";

function ctx(data = new BlogData(5, 20)) {
  return { data, loaders: createLoaders(data) };
}

async function exec(source: string, contextValue: ReturnType<typeof ctx>, variableValues = {}) {
  const result = await graphql({ schema: createSchema("batched"), source, contextValue, variableValues });
  expect(result.errors).toBeUndefined();
  return result.data!;
}

async function errorsFor(source: string) {
  const result = await graphql({ schema: createSchema("batched"), source, contextValue: ctx() });
  return result.errors?.map((e) => e.message) ?? [];
}

describe("schema", () => {
  it("lists posts with their authors", async () => {
    const data = await exec(
      `{ posts(limit: 3) { id title author { id name } } }`,
      ctx(),
    );
    const posts = data["posts"] as Array<{ id: string; author: { name: string } }>;
    expect(posts).toHaveLength(3);
    expect(posts[0]!.author.name).toMatch(/^Author /);
  });

  it("resolves a single author by id", async () => {
    const data = await exec(`{ author(id: "a1") { id name } }`, ctx());
    expect((data["author"] as { id: string }).id).toBe("a1");
  });

  it("returns null for a missing author", async () => {
    const data = await exec(`{ author(id: "nope") { id } }`, ctx());
    expect(data["author"]).toBeNull();
  });

  it("computes postCount per author", async () => {
    const c = ctx(new BlogData(2, 10)); // 10 posts over 2 authors -> 5 each
    const data = await exec(`{ authors { id postCount } }`, c);
    const authors = data["authors"] as Array<{ postCount: number }>;
    expect(authors.every((a) => a.postCount === 5)).toBe(true);
  });

  it("paginates with offset", async () => {
    const c = ctx(new BlogData(5, 20));
    const data = await exec(`{ posts(limit: 2, offset: 5) { id } }`, c);
    const posts = data["posts"] as Array<{ id: string }>;
    expect(posts.map((p) => p.id)).toEqual(["p5", "p6"]);
  });

  it("counts posts per author when they are not evenly split", async () => {
    const data = await exec(`{ authors { id postCount } }`, ctx(new BlogData(3, 10)));
    expect(data["authors"]).toEqual([
      { id: "a0", postCount: 4 },
      { id: "a1", postCount: 3 },
      { id: "a2", postCount: 3 },
    ]);
  });

  it("caps limit at 100", async () => {
    const data = await exec(`{ posts(limit: 10000) { id } }`, ctx(new BlogData(5, 500)));
    expect(data["posts"]).toHaveLength(100);
  });

  it("rejects a limit below 1", async () => {
    for (const limit of [0, -1]) {
      expect(await errorsFor(`{ posts(limit: ${limit}) { id } }`)).toEqual(["limit must be at least 1"]);
    }
  });

  it("rejects a negative offset", async () => {
    expect(await errorsFor(`{ posts(offset: -1) { id } }`)).toEqual(["offset must not be negative"]);
  });
});
