import { createApp } from "../server/app.js";

export const config = { maxDuration: 60 };

const httpServer = process.env.DATABASE_URL
  ? (await createApp({ skipMigrate: true, socketPath: "/api/socket.io" })).httpServer
  : null;

export default httpServer || function missingConfig(_req, res) {
  res.statusCode = 503;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ error: "config" }));
};
