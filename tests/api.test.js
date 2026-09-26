import request from "supertest";
import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { createApp } from "../server/app.js";
import { resetTables } from "../server/db.js";

process.env.BCRYPT_ROUNDS = "6";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://lof:lof_local_dev_only@127.0.0.1:5432/lof_test";

let app;
let pool;

const person = (n, extra = {}) => ({
  nom: "Mensah",
  prenom: "Ada",
  pseudo: `Ada${n}`,
  email: `ada${n}@example.com`,
  password: "motdepasse",
  sexe: "Femme",
  seenWelcome: true,
  ...extra,
});

beforeAll(async () => {
  const created = await createApp();
  app = created.app;
  pool = created.pool;
});

beforeEach(async () => {
  await resetTables(pool);
});

afterAll(async () => {
  if (pool) await pool.end();
});

function client() {
  return request.agent(app);
}

async function register(agent, n, extra) {
  return agent.post("/api/auth/register").set("x-lof-client", "web").send(person(n, extra));
}

test("registration rejects a missing client header and never returns a password", async () => {
  const naked = await request(app).post("/api/auth/register").send(person(1));
  expect(naked.status).toBe(403);
  const agent = client();
  const res = await register(agent, 1);
  expect(res.status).toBe(201);
  expect(res.body.user.role).toBe("admin");
  expect(res.body.user.email).toBe("ada1@example.com");
  const raw = JSON.stringify(res.body);
  expect(raw).not.toContain("password");
  expect(raw).not.toContain("motdepasse");
});

test("pseudo is unique and a client cannot grant itself admin", async () => {
  const first = client();
  await register(first, 1);
  const second = client();
  const clash = await register(second, 2, { pseudo: "Ada1" });
  expect(clash.status).toBe(409);
  expect(clash.body.error).toBe("pseudo");
  const created = await register(second, 2, { role: "admin" });
  expect(created.status).toBe(201);
  expect(created.body.user.role).toBe("player");
  const state = await second.get("/api/state");
  expect(state.body.user.role).toBe("player");
  expect(state.body.users.find((u) => u.id === created.body.user.id).role).toBe("player");
});

test("login, suspend, and admin audit are enforced by the server", async () => {
  const admin = client();
  const created = await register(admin, 1);
  const player = client();
  const other = await register(player, 2);
  const bad = await player.post("/api/auth/login").set("x-lof-client", "web").send({ email: "ada2@example.com", password: "mauvais-mot" });
  expect(bad.status).toBe(401);
  const reply = await player.post(`/api/admin/feedback/${created.body.user.id}/reply`).set("x-lof-client", "web").send({ reply: "non" });
  expect(reply.status).toBe(403);
  await player.post("/api/feedback").set("x-lof-client", "web").send({ text: "Le chaton sourit." });
  const feedbackId = (await admin.get("/api/state")).body.feedback[0].id;
  const answered = await admin.post(`/api/admin/feedback/${feedbackId}/reply`).set("x-lof-client", "web").send({ reply: "Bien reçu." });
  expect(answered.status).toBe(200);
  expect(answered.body.audit.some((item) => item.action === "reply_feedback")).toBe(true);
  const suspended = await admin.post(`/api/admin/users/${other.body.user.id}/suspend`).set("x-lof-client", "web").send({ suspended: true });
  expect(suspended.status).toBe(200);
  const again = await player.get("/api/state");
  expect(again.status).toBe(401);
  const relog = await player.post("/api/auth/login").set("x-lof-client", "web").send({ email: "ada2@example.com", password: "motdepasse" });
  expect(relog.status).toBe(403);
});

test("delete-for-everyone is limited to the author", async () => {
  const a = client();
  const b = client();
  await register(a, 1);
  await register(b, 2);
  await a.post("/api/social/invites").set("x-lof-client", "web").send({ toId: (await b.get("/api/state")).body.user.id });
  const bId = (await b.get("/api/state")).body.user.id;
  await b.post("/api/social/invites").set("x-lof-client", "web").send({ toId: (await a.get("/api/state")).body.user.id });
  const chat = (await a.get("/api/state")).body.chats.find((item) => item.type === "dm");
  expect(chat).toBeTruthy();
  await a.post(`/api/chats/${chat.id}/messages`).set("x-lof-client", "web").send({ text: "un secret" });
  const message = (await a.get("/api/state")).body.chats[0].messages.find((item) => item.text === "un secret");
  const denied = await b.post(`/api/chats/${chat.id}/messages/${message.id}/delete`).set("x-lof-client", "web").send({ scope: "all" });
  expect(denied.status).toBe(403);
  const hidden = await a.get("/api/state");
  expect(hidden.body.chats[0].messages.some((item) => item.text === "un secret")).toBe(true);
  const removed = await a.post(`/api/chats/${chat.id}/messages/${message.id}/delete`).set("x-lof-client", "web").send({ scope: "all" });
  expect(removed.status).toBe(200);
  expect(removed.body.chats[0].messages.some((item) => item.text === "un secret")).toBe(false);
  expect(bId).toBeTruthy();
});

test("online morpion winner is stored by the server, not declared by the client", async () => {
  const a = client();
  const b = client();
  await register(a, 1);
  await register(b, 2);
  const created = await a.post("/api/rooms").set("x-lof-client", "web").send({ gameId: "morpion", difficulty: "doux" });
  expect(created.status).toBe(201);
  const code = created.body.room.code;
  await b.post("/api/rooms/join").set("x-lof-client", "web").send({ code });
  const roomId = created.body.room.id;
  const started = await a.post(`/api/rooms/${roomId}/start`).set("x-lof-client", "web").send({});
  expect(started.status).toBe(200);
  expect(started.body.state.kind).toBe("morpion");
  const cheat = await a.post(`/api/rooms/${roomId}/action`).set("x-lof-client", "web").send({ type: "declare_winner", winnerId: started.body.state.players[0].id });
  expect(cheat.status).toBe(409);
  expect(cheat.body.error).toBe("client_result_rejected");
  const aId = (await a.get("/api/state")).body.user.id;
  const first = started.body.state.turn;
  const second = started.body.state.players.find((p) => p.id !== first).id;
  const sequence = [
    [first, 0],
    [second, 3],
    [first, 1],
    [second, 4],
    [first, 2],
  ];
  let last;
  for (const [id, cell] of sequence) {
    const actor = id === aId ? a : b;
    last = await actor.post(`/api/rooms/${roomId}/action`).set("x-lof-client", "web").send({ type: "move", cell });
    expect(last.status).toBe(200);
  }
  expect(last.body.state.status).toBe("done");
  expect(last.body.state.winnerId).toBe(first);
  const row = await pool.query(`SELECT winner_id FROM game_results WHERE room_id = $1`, [roomId]);
  expect(row.rows[0].winner_id).toBe(first);
});
