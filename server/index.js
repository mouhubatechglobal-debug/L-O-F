import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { log } from "./security.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
try {
  const text = readFileSync(path.join(root, ".env"), "utf8");
  for (const line of text.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
} catch {
  // Environment may already be provided by the process.
}

if (process.env.NODE_ENV === "production" && process.env.SERVE_WEB == null) {
  process.env.SERVE_WEB = "1";
}

const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || "127.0.0.1";
const { httpServer } = await createApp();
httpServer.listen(port, host, () => {
  log("info", "server_listening", { host, port });
});
