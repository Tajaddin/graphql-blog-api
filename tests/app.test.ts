import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { BlogData } from "../src/data.js";

interface GraphQLBody {
  data?: Record<string, unknown>;
  errors?: Array<{ message: string }>;
}

async function post(app: ReturnType<typeof createApp>, query: string): Promise<GraphQLBody> {
  const res = await app.fetch("http://localhost/graphql", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return (await res.json()) as GraphQLBody;
}

function aliased(count: number, selection: string): string {
  return `{ ${Array.from({ length: count }, (_, i) => `a${i}: ${selection}`).join(" ")} }`;
}

describe("HTTP server limits", () => {
  it("serves a normal page query", async () => {
    const body = await post(createApp(new BlogData(5, 20)), `{ posts(limit: 5) { id author { id postCount } } }`);
    expect(body.errors).toBeUndefined();
    expect(body.data?.["posts"]).toHaveLength(5);
  });

  it("rejects an alias bomb without executing it", async () => {
    const data = new BlogData();
    const body = await post(createApp(data), aliased(1000, "posts(limit: 100) { author { postCount } }"));
    expect(body.data).toBeUndefined();
    expect(body.errors?.length).toBeGreaterThan(0);
    expect(data.authorBatchCalls).toBe(0);
  });

  it("allows 15 aliases and rejects 16", async () => {
    const app = createApp(new BlogData(5, 20));
    expect((await post(app, aliased(15, "posts(limit: 1) { id }"))).errors).toBeUndefined();
    const tooMany = await post(app, aliased(16, "posts(limit: 1) { id }"));
    expect(tooMany.errors?.[0]?.message).toMatch(/Aliases limit of 15 exceeded/);
  });
});
