// HTTP entry point. The dataset is shared across requests (read-only here);
// loaders are per-request, see app.ts.

import { createServer } from "node:http";
import { createApp } from "./app.js";

const server = createServer(createApp());
const port = Number(process.env["PORT"] ?? 8080);
server.listen(port, () => {
  console.log(`graphql-blog-api on http://localhost:${port}/graphql`);
});
