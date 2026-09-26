import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { SEEDS, personById } from "./data/seeds.js";
import { api, applySnap } from "./api.js";
import { getSocket, reconnectSocket } from "./realtime.js";
import { LogoMark } from "./components/Icons.jsx";

const KEY = "lof-v1";
const StoreContext = createContext(null);

const empty = {
  users: [],
  sessionId: null,
  invites: [],
  chats: [],
  feedback: [],
  archives: {},
  rooms: [],
  recentPlayers: [],
  audit: [],
  reports: [],
  presence: [],
};

function loadCache() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      ...empty,
      ...parsed,
      users: (parsed.users || []).map(({ password, passwordHash, ...user }) => user),
    };
  } catch {
    return null;
  }
}

export function StoreProvider({ children }) {
  const [data, setData] = useState(empty);
  const [toasts, setToasts] = useState([]);
  const [installEvt, setInstallEvt] = useState(null);
  const [ready, setReady] = useState(false);
  const [backend, setBackend] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  function toast(msg) {
    const id = `toast-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }

  function take(snap) {
    setData((prev) => applySnap(prev, snap));
    setBackend(true);
  }

  useEffect(() => {
    const safe = {
      ...data,
      users: data.users.map(({ password, passwordHash, ...user }) => user),
    };
    localStorage.setItem(KEY, JSON.stringify(safe));
  }, [data]);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallEvt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const cached = loadCache();
        const raw = localStorage.getItem(KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed?.users?.some((user) => user.password)) {
          await api("/api/migrate", { method: "POST", body: { users: parsed.users, sessionId: parsed.sessionId } });
          localStorage.setItem(KEY, JSON.stringify({ ...parsed, users: parsed.users.map(({ password, ...user }) => user) }));
        }
        const snap = await api("/api/state");
        if (!stop) {
          setData((prev) => applySnap({ ...prev, recentPlayers: cached?.recentPlayers || [] }, snap));
          setBackend(true);
          if (snap.user) reconnectSocket();
        }
      } catch {
        if (!stop) {
          const cached = loadCache();
          if (cached) setData(cached);
          setBackend(false);
        }
      } finally {
        if (!stop) setReady(true);
      }
    })();
    return () => {
      stop = true;
    };
  }, []);

  useEffect(() => {
    if (!backend) return undefined;
    const socket = getSocket();
    const onDirty = () => {
      api("/api/state").then(take).catch(() => {});
    };
    socket.on("state:dirty", onDirty);
    return () => socket.off("state:dirty", onDirty);
  }, [backend]);

  const session = data.users.find((u) => u.id === data.sessionId) || null;

  const apiStore = useMemo(() => {
    const tr = (fr, en) => (session?.lang === "en" ? en : fr);

    function offline() {
      toast(tr("Le salon est hors ligne.", "The salon is offline."));
      return { error: "offline" };
    }

    function pseudoTaken(pseudo, exceptId) {
      const n = pseudo.trim().toLowerCase();
      if (SEEDS.some((s) => s.pseudo.toLowerCase() === n)) return true;
      return data.users.some((u) => u.id !== exceptId && u.pseudo.toLowerCase() === n);
    }
    function emailTaken(email, exceptId) {
      const n = email.trim().toLowerCase();
      return data.users.some((u) => u.id !== exceptId && u.email?.toLowerCase() === n);
    }

    async function register(draft) {
      if (!backend) return offline();
      try {
        const snap = await api("/api/auth/register", { method: "POST", body: draft });
        take(snap);
        reconnectSocket();
        return { ok: true, user: snap.user };
      } catch (err) {
        return { error: err.data?.error || "fail" };
      }
    }

    async function login(email, password) {
      if (!backend) {
        offline();
        return false;
      }
      try {
        const snap = await api("/api/auth/login", { method: "POST", body: { email, password } });
        take(snap);
        reconnectSocket();
        return true;
      } catch {
        return false;
      }
    }

    async function checkLogin(email, password) {
      if (!backend) return false;
      try {
        const res = await api("/api/auth/check", { method: "POST", body: { email, password } });
        return Boolean(res.ok);
      } catch {
        return false;
      }
    }

    async function logout() {
      try {
        await api("/api/auth/logout", { method: "POST", body: {} });
      } catch {
        // Local session still ends.
      }
      getSocket().disconnect();
      setData((d) => ({ ...d, sessionId: null }));
    }

    async function updateProfile(patch) {
      if (!session) return { error: "auth" };
      if (!backend) return offline();
      try {
        const snap = await api("/api/me", { method: "PATCH", body: patch });
        take(snap);
        return { ok: true };
      } catch (err) {
        return { error: err.data?.error || "fail" };
      }
    }

    async function markWelcome() {
      if (!session || !backend) return;
      const snap = await api("/api/me/welcome", { method: "POST", body: {} }).catch(() => null);
      if (snap) take(snap);
    }

    function maybeAwaInvite() {
      if (!session || session.awaInvited || !backend) return;
      setTimeout(() => {
        api("/api/social/awa", { method: "POST", body: {} }).then(take).catch(() => {});
      }, 1600);
    }

    function friendsOf(userId = session?.id) {
      if (!userId) return [];
      return data.invites
        .filter((i) => i.status === "accepted" && (i.from === userId || i.to === userId))
        .map((i) => (i.from === userId ? i.to : i.from));
    }

    async function invite(toId) {
      if (!session || !backend) return offline();
      try {
        take(await api("/api/social/invites", { method: "POST", body: { toId } }));
        toast(tr("Invitation envoyée.", "Invite sent."));
      } catch (err) {
        toast(err.data?.error === "blocked" ? tr("Invitation impossible.", "Invite blocked.") : tr("Invitation refusée par le serveur.", "The server refused the invite."));
      }
    }

    async function acceptInvite(inviteId) {
      if (!backend) return offline();
      try {
        take(await api(`/api/social/invites/${inviteId}/accept`, { method: "POST", body: {} }));
        toast(tr("Invitation acceptée. La discussion est prête.", "Invite accepted. The chat is ready."));
      } catch {
        toast(tr("Impossible d'accepter.", "Could not accept."));
      }
    }

    async function declineInvite(inviteId) {
      if (!backend) return offline();
      const snap = await api(`/api/social/invites/${inviteId}/decline`, { method: "POST", body: {} }).catch(() => null);
      if (snap?.user) take(snap);
    }

    async function createGroup(name, memberIds) {
      if (!session || !backend) return offline();
      try {
        const snap = await api("/api/chats", { method: "POST", body: { name, memberIds } });
        take(snap);
        toast(tr("Groupe créé.", "Group created."));
        return snap.createdId;
      } catch {
        toast(tr("Le serveur a refusé le groupe.", "The server refused the group."));
        return null;
      }
    }

    async function sendMessage(chatId, text) {
      if (!session || !text.trim() || !backend) return;
      try {
        take(await api(`/api/chats/${chatId}/messages`, { method: "POST", body: { text } }));
      } catch {
        toast(tr("Message refusé.", "Message refused."));
      }
    }

    async function deleteMessage(chatId, messageId, scope) {
      if (!backend) return;
      try {
        take(await api(`/api/chats/${chatId}/messages/${messageId}/delete`, { method: "POST", body: { scope } }));
      } catch (err) {
        if (err.data?.error === "forbidden") toast(tr("Tu ne peux supprimer pour tout le monde que tes messages.", "You can delete for everyone only your own messages."));
      }
    }

    async function forwardMessage(fromChatId, messageId, toChatId) {
      if (!backend) return;
      try {
        take(await api(`/api/chats/${fromChatId}/messages/${messageId}/forward`, { method: "POST", body: { toChatId } }));
        toast(tr("Message transféré.", "Message forwarded."));
      } catch {
        toast(tr("Transfert refusé.", "Forward refused."));
      }
    }

    async function setPin(chatId, ms) {
      if (!backend) return;
      const snap = await api(`/api/chats/${chatId}`, { method: "PATCH", body: { pinMs: ms } }).catch(() => null);
      if (snap?.user) take(snap);
    }

    async function setEphemeral(chatId, ms) {
      if (!backend) return;
      const snap = await api(`/api/chats/${chatId}`, { method: "PATCH", body: { ephemeralMs: ms } }).catch(() => null);
      if (snap?.user) take(snap);
    }

    async function toggleArchive(gameId) {
      if (!session || !backend) return;
      const snap = await api("/api/archives", { method: "POST", body: { gameId } }).catch(() => null);
      if (snap?.user) take(snap);
    }

    async function addFeedback(text) {
      if (!session || !text.trim() || !backend) return;
      take(await api("/api/feedback", { method: "POST", body: { text } }));
      toast(tr("Avis envoyé à l'administration.", "Feedback sent to the admin."));
    }

    async function replyFeedback(id, reply) {
      if (!backend) return;
      try {
        take(await api(`/api/admin/feedback/${id}/reply`, { method: "POST", body: { reply } }));
        toast(tr("Réponse enregistrée.", "Reply saved."));
      } catch {
        toast(tr("Réservé à l'administration.", "Admin only."));
      }
    }

    async function suspendUser(id, suspended = true) {
      if (!backend) return;
      try {
        take(await api(`/api/admin/users/${id}/suspend`, { method: "POST", body: { suspended } }));
        toast(suspended ? tr("Compte suspendu.", "Account suspended.") : tr("Compte rétabli.", "Account restored."));
      } catch {
        toast(tr("Action refusée.", "Action refused."));
      }
    }

    async function createRoom({ gameId, difficulty, invites, category }) {
      if (!session || !backend) return offline();
      try {
        const snap = await api("/api/rooms", { method: "POST", body: { gameId, difficulty, invites, category } });
        take(snap);
        return snap.room;
      } catch {
        toast(tr("Le serveur n'a pas ouvert le salon.", "The server did not open the salon."));
        return null;
      }
    }

    async function joinRoom(code) {
      if (!backend) return offline();
      try {
        const snap = await api("/api/rooms/join", { method: "POST", body: { code } });
        take(snap);
        return snap.room;
      } catch {
        toast(tr("Code salon introuvable.", "Salon code not found."));
        return null;
      }
    }

    function fetchRoom(id) {
      return api(`/api/rooms/${id}`);
    }

    function startRoom(id) {
      return api(`/api/rooms/${id}/start`, { method: "POST", body: {} });
    }

    function roomAction(id, action) {
      return api(`/api/rooms/${id}/action`, { method: "POST", body: action });
    }

    function rememberPlayers(names) {
      setData((d) => ({
        ...d,
        recentPlayers: [...new Set([...names, ...d.recentPlayers])].slice(0, 12),
      }));
    }

    async function markPlayed(gameId) {
      if (!session || !backend) return;
      api("/api/me/played", { method: "POST", body: { gameId } }).catch(() => {});
    }

    async function resetDemo() {
      localStorage.removeItem(KEY);
      await logout();
      toast(tr("Cache local effacé. Le compte serveur reste.", "Local cache cleared. The server account remains."));
    }

    async function installApp() {
      if (installEvt) {
        installEvt.prompt();
        await installEvt.userChoice;
        setInstallEvt(null);
        return "prompt";
      }
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast(tr("Lien copié. Ouvre-le sur ton téléphone ou ton ordinateur.", "Link copied. Open it on your phone or computer."));
      } catch {
        toast(window.location.href);
      }
      return "link";
    }

    return {
      tr,
      toast,
      backend,
      pseudoTaken,
      emailTaken,
      register,
      login,
      checkLogin,
      logout,
      updateProfile,
      markWelcome,
      maybeAwaInvite,
      friendsOf,
      invite,
      acceptInvite,
      declineInvite,
      createGroup,
      sendMessage,
      deleteMessage,
      forwardMessage,
      setPin,
      setEphemeral,
      toggleArchive,
      addFeedback,
      replyFeedback,
      suspendUser,
      createRoom,
      joinRoom,
      fetchRoom,
      startRoom,
      roomAction,
      rememberPlayers,
      markPlayed,
      resetDemo,
      installApp,
      installReady: Boolean(installEvt),
      personById: (id) => personById(id, data.users),
    };
  }, [data, session, installEvt, backend]);

  const value = {
    ...apiStore,
    data,
    session,
    toasts,
    theme: session?.theme || "amour",
    wallpaper: session?.wallpaper || null,
  };

  if (!ready) {
    return (
      <div className="desk">
        <div className="app-shell mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-6 text-center">
          <LogoMark size={220} />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em]">Love or Friendship</p>
          <p className="display mt-3 text-4xl">Le salon se prépare</p>
        </div>
      </div>
    );
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}
