import "dotenv/config";
import { buildApp } from "./app.js";

const port = parseInt(process.env.API_PORT ?? "3001", 10);
const host = process.env.API_HOST ?? "0.0.0.0";

const app = await buildApp();

try {
  await app.listen({ port, host });
  console.log(`API server listening on http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
