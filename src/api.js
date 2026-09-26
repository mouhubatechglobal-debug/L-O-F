export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: {
      "x-lof-client": "web",
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "request_failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function applySnap(prev, snap) {
  const users = [...(snap.users || [])];
  if (snap.user) {
    const index = users.findIndex((user) => user.id === snap.user.id);
    if (index >= 0) users[index] = { ...users[index], ...snap.user };
    else users.unshift(snap.user);
  }
  return {
    users,
    sessionId: snap.user?.id || null,
    invites: snap.invites || [],
    chats: snap.chats || [],
    feedback: snap.feedback || [],
    archives: snap.archives || {},
    rooms: snap.rooms || [],
    recentPlayers: prev?.recentPlayers || [],
    audit: snap.audit || [],
    reports: snap.reports || [],
    presence: snap.presence || [],
  };
}
