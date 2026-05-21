// GraphQL Yoga server. A fresh BlogData + DataLoaders are created per request
// so the loader cache stays request-scoped (the standard GraphQL pattern).

import { createYoga } from "graphql-yoga";
import { createServer } from "node:http";
import { BlogData } from "./data.js";
import { createLoaders, type GraphQLContext } from "./loaders.js";
import { createSchema } from "./schema.js";

// Shared dataset across requests (read-only here); loaders are per-request.
const data = new BlogData();

const yoga = createYoga<Record<string, never>, GraphQLContext>({
  schema: createSchema("batched"),
  context: () => ({ data, loaders: createLoaders(data) }),
  graphqlEndpoint: "/graphql",
  landingPage: false,
});

const server = createServer(yoga);
const port = Number(process.env["PORT"] ?? 8080);
server.listen(port, () => {
  console.log(`graphql-blog-api on http://localhost:${port}/graphql`);
});
