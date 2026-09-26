import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { SEEDS } from "../src/data/seeds.js";

const { Pool } = pg;
const root = path.dirname(fileURLToPath(import.meta.url));

export function createPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error("DATABASE_URL manquant");
  const remote = process.env.DATABASE_SSL === "1" || /sslmode=require/i.test(connectionString);
  return new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX || 5),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ssl: remote ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "0" } : undefined,
  });
}

export async function migrate(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const dir = path.join(root, "migrations");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    const seen = await pool.query("SELECT 1 FROM schema_migrations WHERE version = $1", [version]);
    if (seen.rowCount) continue;
    const sql = await readFile(path.join(dir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING", [version]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

export async function seedBots(pool) {
  for (const s of SEEDS) {
    await pool.query(
      `INSERT INTO users (id, email, password_hash, nom, prenom, pseudo, sexe, bio, birth_place, avatar, role, is_seed, seen_welcome)
       VALUES ($1,$2,NULL,$3,$4,$5,$6,$7,$8,$9::jsonb,'player',TRUE,TRUE)
       ON CONFLICT (id) DO NOTHING`,
      [s.id, `${s.id}@salon.local`, s.nom, s.prenom, s.pseudo, s.sexe || null, s.bio || "", s.city || "", JSON.stringify(s.avatar || null)]
    );
  }
}

export async function resetTables(pool) {
  await pool.query(`TRUNCATE
    game_results, game_events, room_members, room_invites, rooms,
    messages, chat_members, chats, friend_requests, feedback, archives,
    admin_actions, sessions, login_attempts, media, reports, blocks, users
    RESTART IDENTITY CASCADE`);
  await seedBots(pool);
}
