import { log } from "./security.js";

export async function attachRedis(io) {
  if (!process.env.REDIS_URL) {
    if (process.env.VERCEL) log("warn", "redis_missing", { impact: "les salons temps réel restent sur une seule instance" });
    return false;
  }
  const { createClient } = await import("redis");
  const { createAdapter } = await import("@socket.io/redis-adapter");
  const pub = createClient({ url: process.env.REDIS_URL });
  const sub = pub.duplicate();
  pub.on("error", (err) => log("error", "redis", { message: err.message }));
  sub.on("error", (err) => log("error", "redis", { message: err.message }));
  await pub.connect();
  await sub.connect();
  io.adapter(createAdapter(pub, sub));
  log("info", "redis_adapter");
  return true;
}
