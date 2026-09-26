export function userPublic(row, { includeEmail = false } = {}) {
  if (!row) return null;
  const user = {
    id: row.id,
    nom: row.nom || "",
    prenom: row.prenom || "",
    pseudo: row.pseudo,
    sexe: row.sexe || "",
    bio: row.bio || "",
    birthDate: row.birth_date || "",
    birthPlace: row.birth_place || "",
    avatar: row.avatar || null,
    theme: row.theme || "amour",
    lang: row.lang || "fr",
    wallpaper: row.wallpaper || null,
    role: row.role,
    seenWelcome: row.seen_welcome,
    awaInvited: row.awa_invited,
    lastPlayed: row.last_played || {},
    createdAt: new Date(row.created_at).getTime(),
    suspended: Boolean(row.suspended_at),
    isSeed: row.is_seed,
  };
  if (includeEmail) user.email = row.email;
  return user;
}

function stamp(value) {
  if (!value) return 0;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export async function buildState(pool, user, presence = []) {
  const usersRes = await pool.query(
    `SELECT * FROM users WHERE is_seed = FALSE ORDER BY created_at ASC`
  );
  const admin = user?.role === "admin";
  const users = usersRes.rows.map((row) =>
    userPublic(row, { includeEmail: admin || row.id === user?.id })
  );
  const me = user ? users.find((u) => u.id === user.id) || userPublic(user, { includeEmail: true }) : null;

  let invites = [];
  let chats = [];
  let feedback = [];
  let archives = {};
  let rooms = [];
  let audit = [];
  let reports = [];
  if (user) {
    const inv = await pool.query(
      `SELECT * FROM friend_requests WHERE from_id = $1 OR to_id = $1 ORDER BY created_at ASC`,
      [user.id]
    );
    invites = inv.rows.map((row) => ({
      id: row.id,
      from: row.from_id,
      to: row.to_id,
      status: row.status,
      createdAt: stamp(row.created_at),
    }));
    chats = await loadChats(pool, user.id);
    const fb = admin
      ? await pool.query(
          `SELECT f.*, u.pseudo FROM feedback f JOIN users u ON u.id = f.user_id ORDER BY f.created_at DESC LIMIT 200`
        )
      : await pool.query(
          `SELECT f.*, u.pseudo FROM feedback f JOIN users u ON u.id = f.user_id WHERE f.user_id = $1 ORDER BY f.created_at DESC`,
          [user.id]
        );
    feedback = fb.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      pseudo: row.pseudo,
      text: row.text,
      reply: row.reply || "",
      createdAt: stamp(row.created_at),
      repliedAt: row.replied_at ? stamp(row.replied_at) : null,
    }));
    const arch = await pool.query(`SELECT user_id, game_id FROM archives`);
    archives = {};
    for (const row of arch.rows) {
      archives[row.user_id] = archives[row.user_id] || [];
      archives[row.user_id].push(row.game_id);
    }
    const roomRows = admin
      ? await pool.query(`SELECT * FROM rooms ORDER BY created_at DESC LIMIT 50`)
      : await pool.query(
          `SELECT r.* FROM rooms r
           JOIN room_members m ON m.room_id = r.id
           WHERE m.user_id = $1
           ORDER BY r.created_at DESC LIMIT 30`,
          [user.id]
        );
    rooms = [];
    for (const row of roomRows.rows) rooms.push(await roomSummary(pool, row));
    if (admin) {
      const actions = await pool.query(
        `SELECT * FROM admin_actions ORDER BY created_at DESC LIMIT 50`
      );
      audit = actions.rows.map((row) => ({
        id: row.id,
        adminId: row.admin_id,
        action: row.action,
        targetId: row.target_id,
        metadata: row.metadata || {},
        createdAt: stamp(row.created_at),
      }));
      const reps = await pool.query(`SELECT * FROM reports ORDER BY created_at DESC LIMIT 50`);
      reports = reps.rows.map((row) => ({
        id: row.id,
        reporterId: row.reporter_id,
        targetId: row.target_id,
        reason: row.reason,
        createdAt: stamp(row.created_at),
      }));
    }
  }
  return {
    user: me,
    users,
    invites,
    chats,
    feedback,
    archives,
    rooms,
    audit,
    reports,
    presence,
  };
}

async function loadChats(pool, userId) {
  const rows = await pool.query(
    `SELECT c.* FROM chats c
     JOIN chat_members m ON m.chat_id = c.id
     WHERE m.user_id = $1
     ORDER BY c.created_at ASC`,
    [userId]
  );
  const chats = [];
  for (const row of rows.rows) {
    const members = await pool.query(`SELECT user_id FROM chat_members WHERE chat_id = $1`, [row.id]);
    const msgs = await pool.query(
      `SELECT * FROM messages WHERE chat_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC`,
      [row.id]
    );
    const now = Date.now();
    chats.push({
      id: row.id,
      type: row.type,
      name: row.name,
      members: members.rows.map((m) => m.user_id),
      pinUntil: Number(row.pin_until) || 0,
      ephemeralMs: Number(row.ephemeral_ms) || 0,
      createdAt: stamp(row.created_at),
      messages: msgs.rows
        .filter((m) => !m.expires_at || stamp(m.expires_at) > now)
        .filter((m) => !(m.hidden_for || []).includes(userId))
        .map((m) => ({
          id: m.id,
          authorId: m.author_id,
          text: m.text,
          createdAt: stamp(m.created_at),
          hiddenFor: m.hidden_for || [],
          forwarded: m.forwarded,
          expiresAt: m.expires_at ? stamp(m.expires_at) : null,
        })),
    });
  }
  return chats;
}

export async function roomSummary(pool, row) {
  const members = await pool.query(
    `SELECT u.id, u.pseudo FROM room_members m JOIN users u ON u.id = m.user_id WHERE m.room_id = $1 ORDER BY m.joined_at ASC`,
    [row.id]
  );
  const invites = await pool.query(`SELECT user_id FROM room_invites WHERE room_id = $1`, [row.id]);
  return {
    id: row.id,
    code: row.code,
    hostId: row.host_id,
    gameId: row.game_id,
    difficulty: row.difficulty,
    category: row.category,
    status: row.status,
    invites: invites.rows.map((i) => i.user_id),
    members: members.rows.map((m) => ({ id: m.id, pseudo: m.pseudo })),
    createdAt: stamp(row.created_at),
  };
}

export async function loadRoom(pool, id) {
  const res = await pool.query(`SELECT * FROM rooms WHERE id = $1 OR code = $1`, [id]);
  return res.rows[0] || null;
}
