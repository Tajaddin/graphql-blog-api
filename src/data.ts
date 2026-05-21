// In-memory data layer that COUNTS backend fetches, so the benchmark and tests
// can prove the N+1 reduction DataLoader provides. A real app swaps this for a
// repository over Postgres; the fetch-counting interface is the same idea as a
// query log.

export interface Author {
  id: string;
  name: string;
}

export interface Post {
  id: string;
  title: string;
  authorId: string;
}

export class BlogData {
  /** Number of individual author lookups performed (the N+1 signal). */
  authorFetchCalls = 0;
  /** Number of batched author lookups performed (DataLoader path). */
  authorBatchCalls = 0;

  readonly authors: Author[];
  readonly posts: Post[];
  private readonly authorById: Map<string, Author>;

  constructor(authorCount = 20, postCount = 500) {
    this.authors = Array.from({ length: authorCount }, (_, i) => ({
      id: `a${i}`,
      name: `Author ${i}`,
    }));
    this.authorById = new Map(this.authors.map((a) => [a.id, a]));
    this.posts = Array.from({ length: postCount }, (_, i) => ({
      id: `p${i}`,
      title: `Post ${i}`,
      authorId: `a${i % authorCount}`,
    }));
  }

  listPosts(limit = 100, offset = 0): Post[] {
    return this.posts.slice(offset, offset + limit);
  }

  /** Single author fetch. Each call is one "DB round trip" (the N+1 cost). */
  getAuthor(id: string): Author | undefined {
    this.authorFetchCalls++;
    return this.authorById.get(id);
  }

  /** Batched author fetch: one round trip for many ids (the DataLoader path). */
  getAuthors(ids: readonly string[]): (Author | null)[] {
    this.authorBatchCalls++;
    return ids.map((id) => this.authorById.get(id) ?? null);
  }
}
