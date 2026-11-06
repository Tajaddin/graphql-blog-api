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

  readonly authors: readonly Author[];
  readonly posts: readonly Post[];
  private readonly authorById: Map<string, Author>;
  private readonly postCountByAuthor = new Map<string, number>();

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
    for (const post of this.posts) {
      this.postCountByAuthor.set(post.authorId, (this.postCountByAuthor.get(post.authorId) ?? 0) + 1);
    }
  }

  /** Counted once at construction, so Author.postCount is O(1) rather than a scan of every post. */
  countPosts(authorId: string): number {
    return this.postCountByAuthor.get(authorId) ?? 0;
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
