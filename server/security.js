import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

export function log(level, msg, extra = {}) {
  const safe = { ...extra };
  delete safe.password;
  delete safe.password_hash;
  delete safe.token;
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...safe }));
}

export function tokenPair() {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function rounds() {
  const n = Number(process.env.BCRYPT_ROUNDS || 12);
  return Number.isFinite(n) ? Math.min(14, Math.max(6, n)) : 12;
}

export function hashPassword(password) {
  return bcrypt.hash(password, rounds());
}

export function checkPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

export function setSessionCookie(res, token) {
  res.cookie("lof_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "1" || process.env.VERCEL === "1",
    maxAge: 14 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearSessionCookie(res) {
  res.clearCookie("lof_session", { path: "/" });
}

export function sniffImage(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

export function decodeDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return null;
  const buf = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!buf.length || buf.length > 900_000) return null;
  const mime = sniffImage(buf);
  if (!mime) return null;
  return { buf, mime };
}

const hits = new Map();

export function tooMany(key, limit, windowMs) {
  const now = Date.now();
  const prev = (hits.get(key) || []).filter((t) => now - t < windowMs);
  prev.push(now);
  hits.set(key, prev);
  return prev.length > limit;
}

let redisRate;

async function sharedCount(key, windowMs) {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const base = process.env.UPSTASH_REDIS_REST_URL.replace(/\/$/, "");
    const headers = {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
    };
    const redisKey = `lof:rl:${key}`;
    const incr = await fetch(base, { method: "POST", headers, body: JSON.stringify(["INCR", redisKey]) });
    if (!incr.ok) return null;
    const data = await incr.json();
    const count = Number(data.result);
    if (count === 1) {
      await fetch(base, {
        method: "POST",
        headers,
        body: JSON.stringify(["EXPIRE", redisKey, Math.max(1, Math.ceil(windowMs / 1000))]),
      });
    }
    return count;
  }
  if (!process.env.REDIS_URL) return null;
  const { createClient } = await import("redis");
  if (!redisRate) {
    redisRate = createClient({ url: process.env.REDIS_URL });
    redisRate.on("error", (err) => log("error", "redis_rate", { message: err.message }));
    await redisRate.connect();
  }
  const redisKey = `lof:rl:${key}`;
  const count = await redisRate.incr(redisKey);
  if (count === 1) await redisRate.expire(redisKey, Math.max(1, Math.ceil(windowMs / 1000)));
  return count;
}

export async function limited(key, limit, windowMs) {
  try {
    const count = await sharedCount(key, windowMs);
    if (count != null) return count > limit;
  } catch (err) {
    log("error", "rate_shared", { message: err.message });
  }
  return tooMany(key, limit, windowMs);
}
