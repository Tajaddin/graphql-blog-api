// GraphQL schema (SDL-first). Post.author has two resolver strategies:
// - "naive": one data.getAuthor per post  -> N+1 backend fetches
// - "batched": data loader coalesces all author ids -> a single batch fetch
// The benchmark and tests run both to prove the reduction.

import { makeExecutableSchema } from "@graphql-tools/schema";
import { GraphQLError, type GraphQLSchema } from "graphql";
import type { GraphQLContext } from "./loaders.js";
import type { Author, Post } from "./data.js";

/** Largest page `posts` returns, so no single field can ask for the whole table. */
export const MAX_PAGE_SIZE = 100;

const typeDefs = /* GraphQL */ `
  type Author {
    id: ID!
    name: String!
    postCount: Int!
  }

  type Post {
    id: ID!
    title: String!
    author: Author!
  }

  type Query {
    "limit must be at least 1; values above ${MAX_PAGE_SIZE} are capped. offset must not be negative."
    posts(limit: Int = ${MAX_PAGE_SIZE}, offset: Int = 0): [Post!]!
    author(id: ID!): Author
    authors: [Author!]!
  }
`;

export type ResolveMode = "naive" | "batched";

function listPosts(args: { limit?: number | null; offset?: number | null }, ctx: GraphQLContext): readonly Post[] {
  const limit = args.limit ?? MAX_PAGE_SIZE;
  const offset = args.offset ?? 0;
  if (limit < 1) throw new GraphQLError("limit must be at least 1", { extensions: { code: "BAD_USER_INPUT" } });
  if (offset < 0) throw new GraphQLError("offset must not be negative", { extensions: { code: "BAD_USER_INPUT" } });
  return ctx.data.listPosts(Math.min(limit, MAX_PAGE_SIZE), offset);
}

export function createSchema(mode: ResolveMode = "batched"): GraphQLSchema {
  const resolvers = {
    Query: {
      posts: (_: unknown, args: { limit?: number | null; offset?: number | null }, ctx: GraphQLContext) =>
        listPosts(args, ctx),
      author: (_: unknown, args: { id: string }, ctx: GraphQLContext) => ctx.data.getAuthor(args.id) ?? null,
      authors: (_: unknown, __: unknown, ctx: GraphQLContext) => ctx.data.authors,
    },
    Post: {
      author: (post: Post, _: unknown, ctx: GraphQLContext): Promise<Author | null> | Author | null => {
        if (mode === "batched") {
          return ctx.loaders.authorById.load(post.authorId);
        }
        return ctx.data.getAuthor(post.authorId) ?? null;
      },
    },
    Author: {
      postCount: (author: Author, _: unknown, ctx: GraphQLContext) => ctx.data.countPosts(author.id),
    },
  };

  return makeExecutableSchema({ typeDefs, resolvers });
}
