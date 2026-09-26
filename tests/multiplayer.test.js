import { io as ioClient } from "socket.io-client";
import request from "supertest";
import { afterAll, beforeAll, expect, test } from "vitest";
import { createApp } from "../server/app.js";
import { resetTables } from "../server/db.js";

process.env.BCRYPT_ROUNDS = "6";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://lof:lof_local_dev_only@127.0.0.1:5432/lof_test";

let app;
let pool;
let httpServer;
let port;

beforeAll(async () => {
  const created = await createApp();
  app = created.app;
  pool = created.pool;
  httpServer = created.httpServer;
  await resetTables(pool);
  await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  port = httpServer.address().port;
});

afterAll(async () => {
  if (httpServer) await new Promise((resolve) => httpServer.close(resolve));
  if (pool) await pool.end();
});

function cookieOf(res) {
  const raw = res.headers["set-cookie"]?.find((item) => item.startsWith("lof_session="));
  return raw.split(";")[0];
}

function connect(cookie) {
  return new Promise((resolve, reject) => {
    const socket = ioClient(`http://127.0.0.1:${port}`, {
      path: "/socket.io",
      transports: ["websocket"],
      extraHeaders: { cookie },
    });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", reject);
  });
}

test("two connected clients share a server-owned morpion", async () => {
  const ada = await request(app).post("/api/auth/register").set("x-lof-client", "web").send({
    nom: "Koffi", prenom: "Ada", pseudo: "AdaLive", email: "ada.live@example.com", password: "motdepasse", sexe: "Femme", seenWelcome: true,
  });
  const beo = await request(app).post("/api/auth/register").set("x-lof-client", "web").send({
    nom: "Diallo", prenom: "Beo", pseudo: "BeoLive", email: "beo.live@example.com", password: "motdepasse", sexe: "Homme", seenWelcome: true,
  });
  expect(ada.status).toBe(201);
  expect(beo.status).toBe(201);
  const room = await request(app).post("/api/rooms").set("x-lof-client", "web").set("Cookie", cookieOf(ada)).send({ gameId: "morpion", difficulty: "doux" });
  await request(app).post("/api/rooms/join").set("x-lof-client", "web").set("Cookie", cookieOf(beo)).send({ code: room.body.room.code });
  const left = await connect(cookieOf(ada));
  const right = await connect(cookieOf(beo));
  const seen = new Promise((resolve) => {
    right.on("room:state", (payload) => {
      if (payload.state?.status === "playing" || payload.state?.cells) resolve(payload);
    });
  });
  left.emit("room:join", room.body.room.id);
  right.emit("room:join", room.body.room.id);
  await request(app).post(`/api/rooms/${room.body.room.id}/start`).set("x-lof-client", "web").set("Cookie", cookieOf(ada)).send({});
  const payload = await seen;
  expect(payload.state.kind).toBe("morpion");
  expect(payload.state.cells).toHaveLength(9);
  expect(payload.state.winnerId).toBeNull();
  left.close();
  right.close();
});
