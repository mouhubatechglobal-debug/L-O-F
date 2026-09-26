import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { z } from "zod";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { createPool, migrate, seedBots } from "./db.js";
import { attachRedis } from "./pubsub.js";
import { getMedia, putMedia, removeMedia } from "./storage.js";
import { advancePierre, createMatch, officialResult, publicMatch, reduceMatch } from "./game.js";
import { makeCatalog } from "./catalog.js";
import { buildState, loadRoom, roomSummary, userPublic } from "./state.js";
import {
  checkPassword,
  clearSessionCookie,
  decodeDataUrl,
  hashPassword,
  hashToken,
  log,
  setSessionCookie,
  sniffImage,
  tokenPair,
  limited,
} from "./security.js";

const CODE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const THEMES = new Set(["amour", "amitie", "fun", "sombre", "clair", "joyeux", "lagune"]);

const registerSchema = z.object({
  nom: z.string().trim().min(1).max(80),
  prenom: z.string().trim().min(1).max(80),
  pseudo: z.string().trim().regex(/^[A-Za-zÀ-ÿ0-9_]{3,16}$/),
  email: z.string().trim().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).max(160),
  password: z.string().min(8).max(200),
  sexe: z.string().trim().min(1).max(40),
  avatar: z.unknown().optional(),
  seenWelcome: z.boolean().optional(),
});

const loginSchema = z.object({
  email: z.string().trim().max(160),
  password: z.string().min(1).max(200),
});

function nid(prefix) {
  return `${prefix}_${randomUUID()}`;
}

function roomCode() {
  const bytes = randomBytes(4);
  return `LOF-${[...bytes].map((b) => CODE[b % CODE.length]).join("")}`;
}

function parse(schema, body, res) {
  const result = schema.safeParse(body || {});
  if (!result.success) {
    res.status(400).json({ error: "invalid" });
    return null;
  }
  return result.data;
}

function presenceIds(io) {
  const ids = new Set();
  for (const sock of io.sockets.sockets.values()) {
    if (sock.data.userId) ids.add(sock.data.userId);
  }
  return [...ids];
}

function dirty(io, userIds) {
  for (const id of userIds) io.to(`user:${id}`).emit("state:dirty");
}

async function userFromReq(pool, req) {
  const token = req.cookies?.lof_session;
  if (!token) return null;
  const res = await pool.query(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > NOW()`,
    [hashToken(token)]
  );
  return res.rows[0] || null;
}

async function audit(pool, adminId, action, targetId, metadata = {}) {
  await pool.query(
    `INSERT INTO admin_actions (id, admin_id, action, target_id, metadata) VALUES ($1,$2,$3,$4,$5::jsonb)`,
    [nid("audit"), adminId, action, targetId, JSON.stringify(metadata)]
  );
}

async function openDm(pool, a, b, greeting, authorId) {
  const members = [a, b].sort();
  const existing = await pool.query(
    `SELECT c.id FROM chats c
     JOIN chat_members m1 ON m1.chat_id = c.id AND m1.user_id = $1
     JOIN chat_members m2 ON m2.chat_id = c.id AND m2.user_id = $2
     WHERE c.type = 'dm' LIMIT 1`,
    members
  );
  if (existing.rows[0]) return existing.rows[0].id;
  const chatId = nid("chat");
  const names = await pool.query(`SELECT id, pseudo FROM users WHERE id = ANY($1)`, [[a, b]]);
  const label = names.rows.find((row) => row.id === b)?.pseudo || "Salon";
  await pool.query(`INSERT INTO chats (id, type, name) VALUES ($1,'dm',$2)`, [chatId, label]);
  await pool.query(`INSERT INTO chat_members (chat_id, user_id) VALUES ($1,$2),($1,$3)`, [chatId, a, b]);
  await pool.query(
    `INSERT INTO messages (id, chat_id, author_id, text) VALUES ($1,$2,'system',$3),($4,$2,$5,$6)`,
    [nid("msg"), chatId, "Discussion ouverte.", nid("msg"), authorId || b, greeting]
  );
  return chatId;
}

export async function createApp(options = {}) {
  const pool = options.pool || createPool(options.databaseUrl);
  if (!options.skipMigrate) {
    await migrate(pool);
    await seedBots(pool);
  }
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN || true, credentials: true },
    path: options.socketPath || "/socket.io",
  });
  await attachRedis(io);
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: false,
    frameguard: false,
  }));
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    const started = Date.now();
    res.on("finish", () => {
      if (req.path === "/api/health") return;
      log("info", "http", { method: req.method, path: req.originalUrl || req.path, status: res.statusCode, ms: Date.now() - started });
    });
    next();
  });
  app.use((req, res, next) => {
    if (req.path.startsWith("/socket.io") || req.path.startsWith("/api/socket.io")) return next();
    if (["POST", "PATCH", "DELETE"].includes(req.method) && req.get("x-lof-client") !== "web") {
      return res.status(403).json({ error: "csrf" });
    }
    next();
  });

  async function snapshot(user) {
    const state = await buildState(pool, user, presenceIds(io));
    return state;
  }

  async function broadcastRoom(roomId) {
    const row = await loadRoom(pool, roomId);
    if (!row) return;
    const sockets = await io.in(`room:${row.id}`).fetchSockets();
    for (const sock of sockets) {
      sock.emit("room:state", await publicRoom(row, sock.data.userId));
    }
  }

  async function publicRoom(row, userId) {
    const summary = await roomSummary(pool, row);
    return { ...summary, state: publicMatch(row.state || {}, userId) };
  }

  app.get("/api/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ ok: true, db: true, time: new Date().toISOString() });
    } catch (err) {
      log("error", "health_failed", { message: err.message });
      res.status(503).json({ ok: false, db: false });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    if (await limited(`register:${req.ip}`, 30, 15 * 60 * 1000)) return res.status(429).json({ error: "rate" });
    const body = parse(registerSchema, req.body, res);
    if (!body) return;
    const email = body.email.toLowerCase();
    const pseudo = body.pseudo;
    const taken = await pool.query(
      `SELECT pseudo, email FROM users WHERE lower(pseudo) = lower($1) OR lower(email) = $2`,
      [pseudo, email]
    );
    if (taken.rows.some((row) => row.pseudo.toLowerCase() === pseudo.toLowerCase())) {
      return res.status(409).json({ error: "pseudo" });
    }
    if (taken.rows.some((row) => row.email?.toLowerCase() === email)) {
      return res.status(409).json({ error: "email" });
    }
    const avatar = body.avatar && typeof body.avatar === "object" ? body.avatar : null;
    if (avatar && JSON.stringify(avatar).length > 8000) return res.status(400).json({ error: "invalid" });
    const passwordHash = await hashPassword(body.password);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(14021)");
      const count = await client.query(`SELECT COUNT(*)::int AS n FROM users WHERE is_seed = FALSE`);
      const role = count.rows[0].n === 0 ? "admin" : "player";
      const id = nid("user");
      await client.query(
        `INSERT INTO users (id, email, password_hash, nom, prenom, pseudo, sexe, avatar, role, seen_welcome)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)`,
        [id, email, passwordHash, body.nom, body.prenom, pseudo, body.sexe, avatar ? JSON.stringify(avatar) : null, role, Boolean(body.seenWelcome)]
      );
      const session = tokenPair();
      await client.query(
        `INSERT INTO sessions (id, user_id, token_hash, expires_at, user_agent) VALUES ($1,$2,$3, NOW() + INTERVAL '14 days', $4)`,
        [nid("ses"), id, session.tokenHash, req.get("user-agent") || ""]
      );
      await client.query("COMMIT");
      setSessionCookie(res, session.token);
      const user = (await pool.query(`SELECT * FROM users WHERE id = $1`, [id])).rows[0];
      res.status(201).json(await snapshot(user));
    } catch (err) {
      await client.query("ROLLBACK");
      if (err.code === "23505") return res.status(409).json({ error: "pseudo" });
      throw err;
    } finally {
      client.release();
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const body = parse(loginSchema, req.body, res);
    if (!body) return;
    const email = body.email.toLowerCase();
    if (await limited(`login:${req.ip}:${email}`, 8, 15 * 60 * 1000)) return res.status(429).json({ error: "rate" });
    const found = await pool.query(`SELECT * FROM users WHERE lower(email) = $1 AND is_seed = FALSE`, [email]);
    const user = found.rows[0];
    const ok = user ? await checkPassword(body.password, user.password_hash) : false;
    await pool.query(`INSERT INTO login_attempts (email, ip, success) VALUES ($1,$2,$3)`, [email, req.ip, ok && !user?.suspended_at]);
    if (!ok) return res.status(401).json({ error: "auth" });
    if (user.suspended_at) return res.status(403).json({ error: "suspended" });
    const session = tokenPair();
    await pool.query(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at, user_agent) VALUES ($1,$2,$3, NOW() + INTERVAL '14 days', $4)`,
      [nid("ses"), user.id, session.tokenHash, req.get("user-agent") || ""]
    );
    setSessionCookie(res, session.token);
    res.json(await snapshot(user));
  });

  app.post("/api/auth/check", async (req, res) => {
    const body = parse(loginSchema, req.body, res);
    if (!body) return;
    const email = body.email.toLowerCase();
    if (await limited(`check:${req.ip}:${email}`, 12, 15 * 60 * 1000)) return res.status(429).json({ error: "rate" });
    const found = await pool.query(`SELECT password_hash, suspended_at, is_seed FROM users WHERE lower(email) = $1`, [email]);
    const user = found.rows[0];
    const ok = user && !user.is_seed && !user.suspended_at ? await checkPassword(body.password, user.password_hash) : false;
    res.json({ ok });
  });

  app.post("/api/auth/logout", async (req, res) => {
    const token = req.cookies?.lof_session;
    if (token) await pool.query(`UPDATE sessions SET revoked_at = NOW() WHERE token_hash = $1`, [hashToken(token)]);
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.post("/api/migrate", async (req, res) => {
    if (await limited(`migrate:${req.ip}`, 6, 60 * 60 * 1000)) return res.status(429).json({ error: "rate" });
    const users = Array.isArray(req.body?.users) ? req.body.users.slice(0, 20) : [];
    let logged = null;
    for (const raw of users) {
      if (!raw?.email || !raw?.password || !raw?.pseudo) continue;
      const email = String(raw.email).trim().toLowerCase();
      const pseudo = String(raw.pseudo).trim();
      if (raw.password.length < 8 || raw.password.length > 200) continue;
      const existing = await pool.query(`SELECT * FROM users WHERE lower(email) = $1 OR lower(pseudo) = lower($2)`, [email, pseudo]);
      if (existing.rows[0]) {
        const row = existing.rows.find((item) => item.email?.toLowerCase() === email);
        if (row && (await checkPassword(raw.password, row.password_hash)) && raw.id === req.body.sessionId) logged = row;
        continue;
      }
      const passwordHash = await hashPassword(raw.password);
      const count = await pool.query(`SELECT COUNT(*)::int AS n FROM users WHERE is_seed = FALSE`);
      const id = nid("user");
      await pool.query(
        `INSERT INTO users (id, email, password_hash, nom, prenom, pseudo, sexe, bio, birth_date, birth_place, avatar, theme, lang, role, seen_welcome)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$15)`,
        [
          id,
          email,
          passwordHash,
          String(raw.nom || "").slice(0, 80),
          String(raw.prenom || "").slice(0, 80),
          pseudo.slice(0, 16),
          raw.sexe || null,
          String(raw.bio || "").slice(0, 500),
          raw.birthDate || null,
          raw.birthPlace || null,
          raw.avatar ? JSON.stringify(raw.avatar) : null,
          raw.theme || "amour",
          raw.lang || "fr",
          count.rows[0].n === 0 ? "admin" : "player",
          Boolean(raw.seenWelcome),
        ]
      );
      if (raw.id === req.body.sessionId || users.length === 1) {
        logged = (await pool.query(`SELECT * FROM users WHERE id = $1`, [id])).rows[0];
      }
    }
    if (logged && !req.cookies?.lof_session) {
      const session = tokenPair();
      await pool.query(
        `INSERT INTO sessions (id, user_id, token_hash, expires_at, user_agent) VALUES ($1,$2,$3, NOW() + INTERVAL '14 days', $4)`,
        [nid("ses"), logged.id, session.tokenHash, "migrate"]
      );
      setSessionCookie(res, session.token);
    }
    const current = logged || (await userFromReq(pool, req));
    res.json(await snapshot(current));
  });

  app.use("/api", async (req, res, next) => {
    if (req.path === "/health" || req.path.startsWith("/auth") || req.path === "/migrate") return next();
    const user = await userFromReq(pool, req);
    if (!user) return res.status(401).json({ error: "auth" });
    if (user.suspended_at) return res.status(403).json({ error: "suspended" });
    req.user = user;
    next();
  });

  app.get("/api/state", async (req, res) => {
    res.json(await snapshot(req.user));
  });

  app.patch("/api/me", async (req, res) => {
    const patch = req.body || {};
    if ("role" in patch || "is_seed" in patch || "password_hash" in patch) {
      await audit(pool, req.user.id, "rejected_privilege", req.user.id, { keys: Object.keys(patch) });
    }
    const next = {};
    if (typeof patch.nom === "string") next.nom = patch.nom.trim().slice(0, 80);
    if (typeof patch.prenom === "string") next.prenom = patch.prenom.trim().slice(0, 80);
    if (typeof patch.sexe === "string") next.sexe = patch.sexe.slice(0, 40);
    if (typeof patch.bio === "string") next.bio = patch.bio.slice(0, 500);
    if (typeof patch.birthDate === "string") next.birth_date = patch.birthDate.slice(0, 40);
    if (typeof patch.birthPlace === "string") next.birth_place = patch.birthPlace.slice(0, 80);
    if (typeof patch.theme === "string" && THEMES.has(patch.theme)) next.theme = patch.theme;
    if (typeof patch.lang === "string" && ["fr", "en"].includes(patch.lang)) next.lang = patch.lang;
    if (patch.seenWelcome === true) next.seen_welcome = true;
    if (patch.avatar && typeof patch.avatar === "object") {
      if (JSON.stringify(patch.avatar).length > 8000) return res.status(400).json({ error: "invalid" });
      next.avatar = JSON.stringify(patch.avatar);
    }
    if (patch.wallpaper === null) next.wallpaper = null;
    if (typeof patch.wallpaper === "string" && patch.wallpaper.startsWith("data:")) {
      const decoded = decodeDataUrl(patch.wallpaper);
      if (!decoded) return res.status(400).json({ error: "media" });
      const mediaId = nid("media");
      const ext = decoded.mime === "image/png" ? "png" : decoded.mime === "image/webp" ? "webp" : "jpg";
      let stored;
      try {
        stored = await putMedia(mediaId, ext, decoded.mime, decoded.buf);
      } catch (err) {
        if (err.code === "storage_unconfigured") return res.status(503).json({ error: "storage" });
        throw err;
      }
      await pool.query(`INSERT INTO media (id, owner_id, mime, bytes, path) VALUES ($1,$2,$3,$4,$5)`, [
        mediaId,
        req.user.id,
        decoded.mime,
        decoded.buf.length,
        stored,
      ]);
      next.wallpaper = `/api/media/${mediaId}`;
    }
    if (typeof patch.pseudo === "string" && patch.pseudo !== req.user.pseudo) {
      if (!/^[A-Za-zÀ-ÿ0-9_]{3,16}$/.test(patch.pseudo)) return res.status(400).json({ error: "invalid" });
      const taken = await pool.query(`SELECT 1 FROM users WHERE lower(pseudo) = lower($1) AND id <> $2`, [patch.pseudo, req.user.id]);
      if (taken.rowCount) return res.status(409).json({ error: "pseudo" });
      next.pseudo = patch.pseudo;
    }
    if (typeof patch.email === "string") {
      const email = patch.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "invalid" });
      const taken = await pool.query(`SELECT 1 FROM users WHERE lower(email) = $1 AND id <> $2`, [email, req.user.id]);
      if (taken.rowCount) return res.status(409).json({ error: "email" });
      next.email = email;
    }
    if (typeof patch.password === "string" && patch.password) {
      if (patch.password.length < 8) return res.status(400).json({ error: "invalid" });
      next.password_hash = await hashPassword(patch.password);
    }
    const cols = Object.keys(next);
    if (cols.length) {
      const sets = cols.map((col, i) => `${col} = $${i + 2}${col === "avatar" ? "::jsonb" : ""}`);
      await pool.query(`UPDATE users SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $1`, [req.user.id, ...cols.map((col) => next[col])]);
    }
    const user = (await pool.query(`SELECT * FROM users WHERE id = $1`, [req.user.id])).rows[0];
    res.json(await snapshot(user));
  });

  app.post("/api/me/played", async (req, res) => {
    const gameId = String(req.body?.gameId || "").slice(0, 80);
    if (!gameId) return res.status(400).json({ error: "invalid" });
    await pool.query(
      `UPDATE users SET last_played = last_played || $2::jsonb, updated_at = NOW() WHERE id = $1`,
      [req.user.id, JSON.stringify({ [gameId]: Date.now() })]
    );
    res.json({ ok: true });
  });

  app.post("/api/me/welcome", async (req, res) => {
    await pool.query(`UPDATE users SET seen_welcome = TRUE, updated_at = NOW() WHERE id = $1`, [req.user.id]);
    const user = (await pool.query(`SELECT * FROM users WHERE id = $1`, [req.user.id])).rows[0];
    res.json(await snapshot(user));
  });

  app.post("/api/social/awa", async (req, res) => {
    if (!req.user.awa_invited) {
      const id = nid("inv");
      await pool.query(
        `INSERT INTO friend_requests (id, from_id, to_id, status) VALUES ($1,'seed-awa',$2,'pending')
         ON CONFLICT DO NOTHING`,
        [id, req.user.id]
      );
      await pool.query(`UPDATE users SET awa_invited = TRUE WHERE id = $1`, [req.user.id]);
    }
    const user = (await pool.query(`SELECT * FROM users WHERE id = $1`, [req.user.id])).rows[0];
    dirty(io, [req.user.id]);
    res.json(await snapshot(user));
  });

  app.post("/api/social/invites", async (req, res) => {
    const toId = String(req.body?.toId || "");
    if (!toId || toId === req.user.id) return res.status(400).json({ error: "invalid" });
    const target = await pool.query(`SELECT * FROM users WHERE id = $1`, [toId]);
    if (!target.rows[0]) return res.status(404).json({ error: "missing" });
    const blocked = await pool.query(
      `SELECT 1 FROM blocks WHERE (user_id = $1 AND blocked_id = $2) OR (user_id = $2 AND blocked_id = $1)`,
      [req.user.id, toId]
    );
    if (blocked.rowCount) return res.status(403).json({ error: "blocked" });
    const reverse = await pool.query(
      `SELECT * FROM friend_requests WHERE from_id = $1 AND to_id = $2 AND status = 'pending'`,
      [toId, req.user.id]
    );
    if (reverse.rows[0]) {
      await acceptInvite(reverse.rows[0]);
    } else {
      const existing = await pool.query(
        `SELECT * FROM friend_requests WHERE from_id = $1 AND to_id = $2`,
        [req.user.id, toId]
      );
      if (!existing.rows[0]) {
        const id = nid("inv");
        await pool.query(`INSERT INTO friend_requests (id, from_id, to_id, status) VALUES ($1,$2,$3,'pending')`, [id, req.user.id, toId]);
        if (target.rows[0].is_seed && toId !== "seed-milo") await acceptInvite({ id, from_id: req.user.id, to_id: toId });
      } else if (existing.rows[0].status === "declined") {
        await pool.query(`UPDATE friend_requests SET status = 'pending' WHERE id = $1`, [existing.rows[0].id]);
      }
    }
    dirty(io, [req.user.id, toId]);
    res.json(await snapshot(req.user));
  });

  async function acceptInvite(inv) {
    await pool.query(`UPDATE friend_requests SET status = 'accepted' WHERE id = $1`, [inv.id]);
    const people = await pool.query(`SELECT id, is_seed FROM users WHERE id = ANY($1)`, [[inv.from_id, inv.to_id]]);
    const seed = people.rows.find((row) => row.is_seed);
    const authorId = seed?.id || inv.from_id;
    const greeting = seed
      ? "Salut ! Contente que tu sois dans le salon. Un gage, un morpion, ou juste discuter ?"
      : "Salut ! La discussion est ouverte.";
    await openDm(pool, inv.from_id, inv.to_id, greeting, authorId);
  }

  app.post("/api/social/invites/:id/accept", async (req, res) => {
    const inv = await pool.query(`SELECT * FROM friend_requests WHERE id = $1`, [req.params.id]);
    const row = inv.rows[0];
    if (!row || row.to_id !== req.user.id) return res.status(403).json({ error: "forbidden" });
    await acceptInvite(row);
    dirty(io, [row.from_id, row.to_id]);
    res.json(await snapshot(req.user));
  });

  app.post("/api/social/invites/:id/decline", async (req, res) => {
    const inv = await pool.query(`SELECT * FROM friend_requests WHERE id = $1`, [req.params.id]);
    const row = inv.rows[0];
    if (!row || row.to_id !== req.user.id) return res.status(403).json({ error: "forbidden" });
    await pool.query(`UPDATE friend_requests SET status = 'declined' WHERE id = $1`, [row.id]);
    dirty(io, [row.from_id, row.to_id]);
    res.json(await snapshot(req.user));
  });

  app.post("/api/chats", async (req, res) => {
    const name = String(req.body?.name || "").trim().slice(0, 60);
    const memberIds = Array.isArray(req.body?.memberIds) ? [...new Set(req.body.memberIds)].slice(0, 12) : [];
    if (!name || memberIds.length < 2) return res.status(400).json({ error: "invalid" });
    for (const memberId of memberIds) {
      const friend = await pool.query(
        `SELECT 1 FROM friend_requests WHERE status = 'accepted' AND ((from_id = $1 AND to_id = $2) OR (from_id = $2 AND to_id = $1))`,
        [req.user.id, memberId]
      );
      if (!friend.rowCount) return res.status(403).json({ error: "forbidden" });
    }
    const chatId = nid("chat");
    await pool.query(`INSERT INTO chats (id, type, name) VALUES ($1,'group',$2)`, [chatId, name]);
    const members = [req.user.id, ...memberIds];
    for (const memberId of members) {
      await pool.query(`INSERT INTO chat_members (chat_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [chatId, memberId]);
    }
    await pool.query(`INSERT INTO messages (id, chat_id, author_id, text) VALUES ($1,$2,'system',$3)`, [
      nid("msg"),
      chatId,
      `Groupe « ${name} » créé.`,
    ]);
    dirty(io, members);
    const state = await snapshot(req.user);
    res.status(201).json({ ...state, createdId: chatId });
  });

  async function memberOf(chatId, userId) {
    const res = await pool.query(`SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2`, [chatId, userId]);
    return Boolean(res.rowCount);
  }

  app.post("/api/chats/:id/messages", async (req, res) => {
    if (await limited(`msg:${req.user.id}`, 30, 60 * 1000)) return res.status(429).json({ error: "rate" });
    const text = String(req.body?.text || "").trim();
    if (!text || text.length > 2000) return res.status(400).json({ error: "invalid" });
    if (!(await memberOf(req.params.id, req.user.id))) return res.status(403).json({ error: "forbidden" });
    const members = await pool.query(`SELECT user_id FROM chat_members WHERE chat_id = $1`, [req.params.id]);
    const ids = members.rows.map((row) => row.user_id);
    const blocked = await pool.query(
      `SELECT 1 FROM blocks WHERE (user_id = ANY($1) AND blocked_id = $2) OR (user_id = $2 AND blocked_id = ANY($1))`,
      [ids, req.user.id]
    );
    if (blocked.rowCount) return res.status(403).json({ error: "blocked" });
    const chat = await pool.query(`SELECT ephemeral_ms FROM chats WHERE id = $1`, [req.params.id]);
    const ms = Number(chat.rows[0]?.ephemeral_ms) || 0;
    const messageId = nid("msg");
    await pool.query(
      `INSERT INTO messages (id, chat_id, author_id, text, expires_at) VALUES ($1,$2,$3,$4, CASE WHEN $5::bigint > 0 THEN NOW() + ($5::text || ' milliseconds')::interval ELSE NULL END)`,
      [messageId, req.params.id, req.user.id, text, ms]
    );
    io.to(`chat:${req.params.id}`).emit("chat:message", { chatId: req.params.id, id: messageId, authorId: req.user.id, text });
    dirty(io, ids);
    res.status(201).json(await snapshot(req.user));
  });

  app.post("/api/chats/:chatId/messages/:messageId/delete", async (req, res) => {
    const scope = req.body?.scope === "all" ? "all" : "me";
    if (!(await memberOf(req.params.chatId, req.user.id))) return res.status(403).json({ error: "forbidden" });
    const msg = await pool.query(`SELECT * FROM messages WHERE id = $1 AND chat_id = $2`, [req.params.messageId, req.params.chatId]);
    const row = msg.rows[0];
    if (!row) return res.status(404).json({ error: "missing" });
    if (scope === "all") {
      if (row.author_id !== req.user.id) return res.status(403).json({ error: "forbidden" });
      await pool.query(`UPDATE messages SET deleted_at = NOW(), text = '' WHERE id = $1`, [row.id]);
    } else {
      const hidden = Array.isArray(row.hidden_for) ? row.hidden_for : [];
      if (!hidden.includes(req.user.id)) hidden.push(req.user.id);
      await pool.query(`UPDATE messages SET hidden_for = $2::jsonb WHERE id = $1`, [row.id, JSON.stringify(hidden)]);
    }
    const members = await pool.query(`SELECT user_id FROM chat_members WHERE chat_id = $1`, [req.params.chatId]);
    dirty(io, members.rows.map((m) => m.user_id));
    res.json(await snapshot(req.user));
  });

  app.post("/api/chats/:chatId/messages/:messageId/forward", async (req, res) => {
    const toChatId = String(req.body?.toChatId || "");
    if (!(await memberOf(req.params.chatId, req.user.id)) || !(await memberOf(toChatId, req.user.id))) {
      return res.status(403).json({ error: "forbidden" });
    }
    const msg = await pool.query(`SELECT text FROM messages WHERE id = $1 AND chat_id = $2 AND deleted_at IS NULL`, [req.params.messageId, req.params.chatId]);
    if (!msg.rows[0]) return res.status(404).json({ error: "missing" });
    await pool.query(
      `INSERT INTO messages (id, chat_id, author_id, text, forwarded) VALUES ($1,$2,$3,$4,TRUE)`,
      [nid("msg"), toChatId, req.user.id, msg.rows[0].text]
    );
    const members = await pool.query(`SELECT user_id FROM chat_members WHERE chat_id = $1`, [toChatId]);
    dirty(io, members.rows.map((m) => m.user_id));
    res.json(await snapshot(req.user));
  });

  app.patch("/api/chats/:id", async (req, res) => {
    if (!(await memberOf(req.params.id, req.user.id))) return res.status(403).json({ error: "forbidden" });
    if (req.body?.pinMs != null) {
      const ms = Number(req.body.pinMs) || 0;
      await pool.query(`UPDATE chats SET pin_until = $2 WHERE id = $1`, [req.params.id, ms ? Date.now() + ms : 0]);
    }
    if (req.body?.ephemeralMs != null) {
      const allowed = [0, 30000, 300000, 3600000, 86400000];
      const ms = Number(req.body.ephemeralMs) || 0;
      if (!allowed.includes(ms)) return res.status(400).json({ error: "invalid" });
      await pool.query(`UPDATE chats SET ephemeral_ms = $2 WHERE id = $1`, [req.params.id, ms]);
    }
    res.json(await snapshot(req.user));
  });

  app.post("/api/feedback", async (req, res) => {
    const text = String(req.body?.text || "").trim();
    if (!text || text.length > 2000) return res.status(400).json({ error: "invalid" });
    await pool.query(`INSERT INTO feedback (id, user_id, text) VALUES ($1,$2,$3)`, [nid("avis"), req.user.id, text]);
    res.status(201).json(await snapshot(req.user));
  });

  app.post("/api/archives", async (req, res) => {
    const gameId = String(req.body?.gameId || "").slice(0, 80);
    if (!gameId) return res.status(400).json({ error: "invalid" });
    const existing = await pool.query(`SELECT 1 FROM archives WHERE user_id = $1 AND game_id = $2`, [req.user.id, gameId]);
    if (existing.rowCount) await pool.query(`DELETE FROM archives WHERE user_id = $1 AND game_id = $2`, [req.user.id, gameId]);
    else await pool.query(`INSERT INTO archives (user_id, game_id) VALUES ($1,$2)`, [req.user.id, gameId]);
    res.json(await snapshot(req.user));
  });

  app.post("/api/blocks", async (req, res) => {
    const blockedId = String(req.body?.userId || "");
    if (!blockedId || blockedId === req.user.id) return res.status(400).json({ error: "invalid" });
    await pool.query(`INSERT INTO blocks (user_id, blocked_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [req.user.id, blockedId]);
    res.json({ ok: true });
  });

  app.post("/api/reports", async (req, res) => {
    const reason = String(req.body?.reason || "").trim().slice(0, 500);
    const targetId = String(req.body?.targetId || "");
    if (!reason || !targetId) return res.status(400).json({ error: "invalid" });
    await pool.query(`INSERT INTO reports (id, reporter_id, target_id, reason) VALUES ($1,$2,$3,$4)`, [nid("report"), req.user.id, targetId, reason]);
    res.status(201).json({ ok: true });
  });

  app.get("/api/media/:id", async (req, res) => {
    const row = await pool.query(`SELECT * FROM media WHERE id = $1`, [req.params.id]);
    if (!row.rows[0]) return res.status(404).json({ error: "missing" });
    let buf;
    try {
      buf = await getMedia(row.rows[0].path);
    } catch (err) {
      log("error", "media_read", { message: err.message });
      return res.status(404).json({ error: "missing" });
    }
    const mime = sniffImage(buf) || row.rows[0].mime;
    if (!sniffImage(buf)) return res.status(415).json({ error: "media" });
    res.setHeader("Content-Type", mime);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(buf);
  });

  app.delete("/api/media/:id", async (req, res) => {
    const row = await pool.query(`SELECT * FROM media WHERE id = $1`, [req.params.id]);
    if (!row.rows[0]) return res.status(404).json({ error: "missing" });
    if (row.rows[0].owner_id !== req.user.id && req.user.role !== "admin") return res.status(403).json({ error: "forbidden" });
    await removeMedia(row.rows[0].path);
    await pool.query(`DELETE FROM media WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  });

  app.post("/api/rooms", async (req, res) => {
    const gameId = String(req.body?.gameId || "").slice(0, 80);
    const difficulty = ["doux", "malin", "intense"].includes(req.body?.difficulty) ? req.body.difficulty : "doux";
    const category = ["amour", "amitie", "fun", "audace"].includes(req.body?.category) ? req.body.category : "fun";
    if (!gameId) return res.status(400).json({ error: "invalid" });
    const id = nid("room");
    const code = roomCode();
    await pool.query(
      `INSERT INTO rooms (id, code, host_id, game_id, difficulty, category, status, state) VALUES ($1,$2,$3,$4,$5,$6,'open','{}')`,
      [id, code, req.user.id, gameId, difficulty, category]
    );
    await pool.query(`INSERT INTO room_members (room_id, user_id) VALUES ($1,$2)`, [id, req.user.id]);
    const invites = Array.isArray(req.body?.invites) ? req.body.invites.slice(0, 12) : [];
    for (const userId of invites) {
      if (typeof userId === "string") {
        await pool.query(`INSERT INTO room_invites (room_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [id, userId]).catch(() => {});
      }
    }
    const row = await loadRoom(pool, id);
    res.status(201).json({ ...(await snapshot(req.user)), room: await publicRoom(row, req.user.id) });
  });

  app.post("/api/rooms/join", async (req, res) => {
    const code = String(req.body?.code || "").trim().toUpperCase();
    const row = await pool.query(`SELECT * FROM rooms WHERE upper(code) = $1`, [code]);
    if (!row.rows[0]) return res.status(404).json({ error: "missing" });
    if (row.rows[0].status === "done") return res.status(409).json({ error: "finished" });
    await pool.query(`INSERT INTO room_members (room_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [row.rows[0].id, req.user.id]);
    await broadcastRoom(row.rows[0].id);
    const fresh = await loadRoom(pool, row.rows[0].id);
    res.json({ ...(await snapshot(req.user)), room: await publicRoom(fresh, req.user.id) });
  });

  app.get("/api/rooms/:id", async (req, res) => {
    const row = await loadRoom(pool, req.params.id);
    if (!row) return res.status(404).json({ error: "missing" });
    const member = await pool.query(`SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2`, [row.id, req.user.id]);
    if (!member.rowCount && req.user.role !== "admin") return res.status(403).json({ error: "forbidden" });
    res.json(await publicRoom(row, req.user.id));
  });

  app.post("/api/rooms/:id/start", async (req, res) => {
    const row = await loadRoom(pool, req.params.id);
    if (!row) return res.status(404).json({ error: "missing" });
    if (row.host_id !== req.user.id) return res.status(403).json({ error: "forbidden" });
    if (row.status !== "open") return res.status(409).json({ error: "started" });
    const members = await pool.query(
      `SELECT u.id, u.pseudo FROM room_members m JOIN users u ON u.id = m.user_id WHERE m.room_id = $1 AND u.is_seed = FALSE ORDER BY m.joined_at ASC`,
      [row.id]
    );
    if (members.rows.length < 2) return res.status(409).json({ error: "need_two" });
    const catalog = makeCatalog();
    const state = createMatch({
      kind: gameKind(row.game_id),
      players: members.rows.map((m) => ({ id: m.id, name: m.pseudo })),
      difficulty: row.difficulty,
      category: row.category,
      catalog,
    });
    await pool.query(`UPDATE rooms SET status = 'playing', state = $2::jsonb, updated_at = NOW() WHERE id = $1`, [row.id, JSON.stringify(state)]);
    await pool.query(`INSERT INTO game_events (id, room_id, user_id, type, payload) VALUES ($1,$2,$3,'start','{}')`, [nid("evt"), row.id, req.user.id]);
    await broadcastRoom(row.id);
    const fresh = await loadRoom(pool, row.id);
    res.json(await publicRoom(fresh, req.user.id));
  });

  app.post("/api/rooms/:id/action", async (req, res) => {
    if (await limited(`act:${req.user.id}`, 60, 60 * 1000)) return res.status(429).json({ error: "rate" });
    const row = await loadRoom(pool, req.params.id);
    if (!row) return res.status(404).json({ error: "missing" });
    const member = await pool.query(`SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2`, [row.id, req.user.id]);
    if (!member.rowCount) return res.status(403).json({ error: "forbidden" });
    if (row.status !== "playing") return res.status(409).json({ error: "not_playing" });
    let state = row.state || {};
    if (req.body?.type === "next" && state.kind === "pierre") {
      state = advancePierre(state);
      await pool.query(`UPDATE rooms SET state = $2::jsonb, updated_at = NOW() WHERE id = $1`, [row.id, JSON.stringify(state)]);
      await broadcastRoom(row.id);
      const fresh = await loadRoom(pool, row.id);
      return res.json(await publicRoom(fresh, req.user.id));
    }
    const result = reduceMatch(state, req.user.id, req.body || {}, makeCatalog());
    if (!result.ok) return res.status(409).json({ error: result.error, room: await publicRoom(row, req.user.id) });
    await pool.query(`UPDATE rooms SET state = $2::jsonb, status = $3, updated_at = NOW() WHERE id = $1`, [
      row.id,
      JSON.stringify(result.state),
      result.state.status === "done" ? "done" : "playing",
    ]);
    await pool.query(`INSERT INTO game_events (id, room_id, user_id, type, payload) VALUES ($1,$2,$3,$4,$5::jsonb)`, [
      nid("evt"),
      row.id,
      req.user.id,
      String(req.body?.type || "action").slice(0, 40),
      JSON.stringify({ cell: req.body?.cell, choice: req.body?.choice, vote: req.body?.vote, option: req.body?.option, index: req.body?.index }),
    ]);
    const official = officialResult(result.state);
    if (official) {
      await pool.query(
        `INSERT INTO game_results (id, room_id, game_id, winner_id, draw, scores) VALUES ($1,$2,$3,$4,$5,$6::jsonb)
         ON CONFLICT (room_id) DO NOTHING`,
        [nid("result"), row.id, row.game_id, official.winnerId, official.draw, JSON.stringify(official.scores)]
      );
    }
    await broadcastRoom(row.id);
    const fresh = await loadRoom(pool, row.id);
    res.json(await publicRoom(fresh, req.user.id));
  });

  function requireAdmin(req, res, next) {
    if (req.user?.role !== "admin") return res.status(403).json({ error: "forbidden" });
    next();
  }

  app.post("/api/admin/feedback/:id/reply", requireAdmin, async (req, res) => {
    const reply = String(req.body?.reply || "").trim().slice(0, 2000);
    if (!reply) return res.status(400).json({ error: "invalid" });
    const updated = await pool.query(`UPDATE feedback SET reply = $2, replied_at = NOW() WHERE id = $1 RETURNING user_id`, [req.params.id, reply]);
    if (!updated.rowCount) return res.status(404).json({ error: "missing" });
    await audit(pool, req.user.id, "reply_feedback", req.params.id, {});
    dirty(io, [updated.rows[0].user_id, req.user.id]);
    res.json(await snapshot(req.user));
  });

  app.post("/api/admin/users/:id/suspend", requireAdmin, async (req, res) => {
    if (req.params.id === req.user.id) return res.status(400).json({ error: "invalid" });
    const suspended = req.body?.suspended !== false;
    await pool.query(`UPDATE users SET suspended_at = CASE WHEN $2 THEN NOW() ELSE NULL END WHERE id = $1 AND is_seed = FALSE`, [req.params.id, suspended]);
    if (suspended) await pool.query(`UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [req.params.id]);
    await audit(pool, req.user.id, suspended ? "suspend" : "unsuspend", req.params.id, {});
    res.json(await snapshot(req.user));
  });

  app.get("/api/admin/audit", requireAdmin, async (req, res) => {
    const state = await snapshot(req.user);
    res.json({ audit: state.audit, reports: state.reports });
  });

  io.use(async (socket, next) => {
    try {
      const cookie = socket.handshake.headers.cookie || "";
      const match = cookie.match(/(?:^|;\s*)lof_session=([^;]+)/);
      if (!match) return next(new Error("auth"));
      const token = decodeURIComponent(match[1]);
      const res = await pool.query(
        `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > NOW() AND u.suspended_at IS NULL`,
        [hashToken(token)]
      );
      if (!res.rows[0]) return next(new Error("auth"));
      socket.data.userId = res.rows[0].id;
      socket.data.role = res.rows[0].role;
      next();
    } catch (err) {
      next(err);
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.data.userId}`);
    io.emit("presence", { userId: socket.data.userId, online: true });
    socket.on("room:join", async (roomId) => {
      const row = await loadRoom(pool, String(roomId || ""));
      if (!row) return;
      const member = await pool.query(`SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2`, [row.id, socket.data.userId]);
      if (!member.rowCount && socket.data.role !== "admin") return;
      socket.join(`room:${row.id}`);
      socket.emit("room:state", await publicRoom(row, socket.data.userId));
    });
    socket.on("chat:join", async (chatId) => {
      const member = await pool.query(`SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2`, [String(chatId || ""), socket.data.userId]);
      if (member.rowCount) socket.join(`chat:${chatId}`);
    });
    socket.on("chat:typing", async (payload) => {
      const chatId = String(payload?.chatId || "");
      if (!socket.rooms.has(`chat:${chatId}`)) return;
      socket.to(`chat:${chatId}`).emit("chat:typing", { chatId, userId: socket.data.userId, typing: Boolean(payload?.typing) });
    });
    socket.on("disconnect", async () => {
      const sockets = await io.fetchSockets();
      const still = sockets.some((sock) => sock.data.userId === socket.data.userId && sock.id !== socket.id);
      if (!still) io.emit("presence", { userId: socket.data.userId, online: false });
    });
  });

  if (process.env.SERVE_WEB === "1") {
    const distDir = path.resolve(process.cwd(), "dist");
    const indexFile = path.join(distDir, "index.html");
    if (existsSync(indexFile)) {
      app.use("/api", (_req, res) => {
        res.status(404).json({ error: "not_found" });
      });
      app.use(express.static(distDir, { index: false, fallthrough: true, maxAge: "1h" }));
      app.use((req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") return next();
        if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) return next();
        res.sendFile(indexFile, (err) => err && next(err));
      });
    } else {
      log("error", "web_missing", { distDir });
    }
  }

  app.use((err, req, res, next) => {
    log("error", "unhandled", { path: req.path, message: err.message });
    if (res.headersSent) return next(err);
    res.status(500).json({ error: "server" });
  });

  return { app, httpServer, io, pool };
}

function gameKind(gameId) {
  const map = {
    "verite-gage": "verite",
    verite: "verite",
    morpion: "morpion",
    memoire: "memory",
    memory: "memory",
    pierre: "pierre",
    "qui-est": "qui",
    qui: "qui",
    dilemme: "dilemme",
  };
  return map[gameId] || gameId;
}

export { userPublic };
