// GraphQL schema (SDL-first). Post.author has two resolver strategies:
// - "naive": one data.getAuthor per post  -> N+1 backend fetches
// - "batched": data loader coalesces all author ids -> a single batch fetch
// The benchmark and tests run both to prove the reduction.

import { makeExecutableSchema } from "@graphql-tools/schema";
import type { GraphQLSchema } from "graphql";
import type { GraphQLContext } from "./loaders.js";
import type { Author, Post } from "./data.js";

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
    posts(limit: Int = 100, offset: Int = 0): [Post!]!
    author(id: ID!): Author
    authors: [Author!]!
  }
`;

export type ResolveMode = "naive" | "batched";

export function createSchema(mode: ResolveMode = "batched"): GraphQLSchema {
  const resolvers = {
    Query: {
      posts: (_: unknown, args: { limit?: number; offset?: number }, ctx: GraphQLContext) =>
        ctx.data.listPosts(args.limit ?? 100, args.offset ?? 0),
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
      postCount: (author: Author, _: unknown, ctx: GraphQLContext) =>
        ctx.data.posts.filter((p) => p.authorId === author.id).length,
    },
  };

  return makeExecutableSchema({ typeDefs, resolvers });
}
