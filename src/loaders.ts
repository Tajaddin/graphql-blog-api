// Per-request DataLoaders. Creating them per request (not per process) keeps
// the cache request-scoped, the standard GraphQL pattern, so stale data never
// leaks across requests.

import DataLoader from "dataloader";
import type { Author, BlogData } from "./data.js";

export interface Loaders {
  authorById: DataLoader<string, Author | null>;
}

export function createLoaders(data: BlogData): Loaders {
  return {
    authorById: new DataLoader<string, Author | null>(async (ids) => data.getAuthors(ids)),
  };
}

export interface GraphQLContext {
  data: BlogData;
  loaders: Loaders;
}
