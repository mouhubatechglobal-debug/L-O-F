import { io } from "socket.io-client";

let socket;

export function getSocket() {
  if (!socket) {
    const prod = import.meta.env.PROD;
    const onVercel = typeof location !== "undefined" && /\.vercel\.app$/.test(location.hostname);
    socket = io({
      path: import.meta.env.VITE_SOCKET_PATH || (onVercel ? "/api/socket.io" : "/socket.io"),
      withCredentials: true,
      autoConnect: false,
      transports: prod ? ["websocket"] : ["websocket", "polling"],
      reconnection: true,
    });
  }
  return socket;
}

export function reconnectSocket() {
  const current = getSocket();
  if (current.connected) current.disconnect();
  current.connect();
  return current;
}
