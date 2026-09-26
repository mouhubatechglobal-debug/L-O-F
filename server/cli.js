import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPool, migrate, seedBots } from "./db.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
try {
  const text = readFileSync(path.join(root, ".env"), "utf8");
  for (const line of text.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
} catch {
  // DATABASE_URL may already be in the environment.
}

const pool = createPool();
await migrate(pool);
if (process.argv.includes("--seed")) await seedBots(pool);
await pool.end();
console.log(process.argv.includes("--seed") ? "seed_ok" : "migrate_ok");
