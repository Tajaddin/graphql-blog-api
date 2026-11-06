// GraphQL Yoga app. A fresh set of DataLoaders is created per request so the
// loader cache stays request-scoped (the standard GraphQL pattern).

import { EnvelopArmor } from "@escape.tech/graphql-armor";
import { createYoga } from "graphql-yoga";
import { BlogData } from "./data.js";
import { createLoaders, type GraphQLContext } from "./loaders.js";
import { createSchema } from "./schema.js";

// Reject expensive documents before execution: without an alias cap one
// request can repeat `posts { author { postCount } }` a thousand times.
const armor = new EnvelopArmor({
  maxAliases: { n: 15 },
  maxDepth: { n: 6 },
  costLimit: { maxCost: 5000 },
  maxTokens: { n: 1000 },
});

export function createApp(data = new BlogData()) {
  return createYoga<Record<string, never>, GraphQLContext>({
    schema: createSchema("batched"),
    context: () => ({ data, loaders: createLoaders(data) }),
    graphqlEndpoint: "/graphql",
    landingPage: false,
    plugins: armor.protect().plugins,
  });
}
