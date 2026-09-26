import { useEffect, useMemo, useRef, useState } from "react";
import { SEEDS, personById } from "./data/seeds.js";
import { games } from "./data/games.js";
import { useStore } from "./store.jsx";
import { Avatar, AvatarEditor, defaultAvatar } from "./components/Avatar.jsx";
import { getSocket } from "./realtime.js";
import { Icon, LogoMark } from "./components/Icons.jsx";
import { Btn, Empty, Field, IllustratedHeader, Modal } from "./components/Ui.jsx";
import { GameCard, norm } from "./home.jsx";

const STOP = new Set(["dans", "avec", "pour", "jeux", "aime", "suis", "tout", "plus", "cette", "comme", "toujours", "juste", "les", "des", "une", "que", "qui"]);

function tokens(s) {
  return norm(s).split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !STOP.has(w));
}

export function ScreenHead({ title, onBack, extra }) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 bg-[color:var(--bg)]/90 px-3 py-3 backdrop-blur">
      <button type="button" className="pressable grid h-11 w-11 place-items-center rounded-2xl border-2 border-[var(--line)] bg-[var(--card)]" onClick={onBack} aria-label="Retour">
        <span className="zoom-inner"><Icon name="back" /></span>
      </button>
      <LogoMark size={36} />
      <h1 className="display min-w-0 flex-1 truncate text-3xl leading-none">{title}</h1>
      {extra}
    </header>
  );
}

export function Friends({ onBack, onOpen }) {
  const store = useStore();
  const { session, data, tr, invite, acceptInvite, declineInvite } = store;
  const [q, setQ] = useState("");
  const [heart, setHeart] = useState(false);
  const people = useMemo(() => {
    const users = data.users
      .filter((u) => u.id !== session.id)
      .map((u) => ({ ...u, city: u.birthPlace }));
    return [...SEEDS, ...users];
  }, [data.users, session.id]);

  const suggestions = useMemo(() => {
    const mine = tokens(`${session.bio || ""} ${session.birthPlace || ""}`);
    return people
      .map((p) => {
        const common = tokens(p.bio || "").filter((t) => mine.includes(t));
        return { ...p, common, score: common.length };
      })
      .sort((a, b) => b.score - a.score || a.pseudo.localeCompare(b.pseudo));
  }, [people, session.bio, session.birthPlace]);

  const results = useMemo(() => {
    const n = norm(q);
    if (!n) return [];
    return people.filter((p) => norm(`${p.pseudo} ${p.bio} ${p.city || ""}`).includes(n));
  }, [q, people]);

  const incoming = data.invites.filter((i) => i.to === session.id && i.status === "pending");
  const outgoing = data.invites.filter((i) => i.from === session.id && i.status === "pending");
  const ready = data.invites.filter((i) => i.status === "accepted" && (i.from === session.id || i.to === session.id));

  function statusFor(id) {
    const inv = data.invites.find((i) => (i.from === session.id && i.to === id) || (i.from === id && i.to === session.id));
    if (!inv || inv.status === "declined") return "none";
    if (inv.status === "accepted") return "friend";
    if (inv.from === session.id) return "sent";
    return "incoming";
  }

  function openChat(otherId) {
    const chat = data.chats.find((c) => c.type === "dm" && c.members.includes(session.id) && c.members.includes(otherId));
    if (chat) onOpen({ name: "thread", chatId: chat.id });
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl pb-28">
      <ScreenHead title={tr("Amis", "Friends")} onBack={onBack} />
      <div className="space-y-4 px-3">
        <IllustratedHeader text={tr("Faite de nouvelle experiences", "Make new experiences")} />
        <div className="flex items-center gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border-2 border-[var(--line)] bg-[var(--card)] px-3 py-2">
            <Icon name="search" size={18} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Rechercher un ami...", "Search a friend...")} className="w-full bg-transparent outline-none" />
          </label>
          <button type="button" className="pressable relative grid h-12 w-12 place-items-center rounded-2xl border-2 border-[var(--line)] bg-[var(--card)] text-xl" onClick={() => setHeart((v) => !v)} aria-label={tr("Invitations", "Invites")}>
            <span className="zoom-inner">❤️</span>
            {(incoming.length + outgoing.length) > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--rose)] px-1 text-[10px] font-bold text-white">{incoming.length + outgoing.length}</span>}
          </button>
        </div>

        <section>
          <h2 className="text-lg font-extrabold">{tr("Demandes d'amis", "Friend requests")}</h2>
          {incoming.length === 0 ? <p className="mt-1 text-sm text-muted">{tr("Aucune invitation reçue.", "No incoming invite.")}</p> : (
            <div className="mt-2 space-y-2">
              {incoming.map((i) => {
                const p = personById(i.from, data.users);
                return (
                  <Row key={i.id} person={p} note={tr("Vous a envoyé une demande", "Sent you a request")} action={
                    <div className="flex gap-1">
                      <button type="button" className="pressable stamp-leaf rounded-full px-3 py-1 text-xs" onClick={() => acceptInvite(i.id)}><span className="zoom-inner">{tr("Accepter", "Accept")}</span></button>
                      <button type="button" className="pressable rounded-full border-2 px-3 py-1 text-xs" onClick={() => declineInvite(i.id)}><span className="zoom-inner">{tr("Refuser", "Decline")}</span></button>
                    </div>
                  } />
                );
              })}
            </div>
          )}
        </section>
        {heart ? (
          <div className="space-y-4">
            <InviteBlock title={tr("Ils t'invitent", "They invited you")} empty={tr("Aucune invitation reçue.", "No incoming invite.")} items={incoming} render={(i) => {
              const p = personById(i.from, data.users);
              return (
                <Row key={i.id} person={p} action={
                  <div className="flex gap-1">
                    <button type="button" className="pressable stamp-leaf rounded-full px-3 py-1 text-xs" onClick={() => acceptInvite(i.id)}><span className="zoom-inner">{tr("Accepter", "Accept")}</span></button>
                    <button type="button" className="pressable rounded-full border-2 px-3 py-1 text-xs" onClick={() => declineInvite(i.id)}><span className="zoom-inner">{tr("Refuser", "Decline")}</span></button>
                  </div>
                } />
              );
            }} />
            <InviteBlock title={tr("En attente de leur oui", "Waiting for their yes")} empty={tr("Aucune invitation en attente.", "No pending invite.")} items={outgoing} render={(i) => {
              const p = personById(i.to, data.users);
              return <Row key={i.id} person={p} action={<span className="text-xs text-muted">{tr("Invité", "Invited")}</span>} />;
            }} />
            <p className="text-xs text-muted">{tr("Milo hésite toujours. Les autres profils du salon acceptent au bout de quelques secondes.", "Milo always hesitates. The other salon profiles accept after a few seconds.")}</p>
          </div>
        ) : (
          <>
            {!session.bio && !q && (
              <p className="text-sm text-muted">{tr("Ajoute une biographie dans Mon compte pour affiner les suggestions.", "Add a biography in My account to refine suggestions.")}</p>
            )}
            <h2 className="display text-2xl">{q ? tr("Résultats", "Results") : tr("Suggestions", "Suggestions")}</h2>
            <div className="space-y-2">
              {(q ? results : suggestions).map((p) => {
                const st = statusFor(p.id);
                return (
                  <Row
                    key={p.id}
                    person={p}
                    note={p.common?.length ? p.common.slice(0, 3).join(" · ") : p.city}
                    action={
                      st === "friend" ? (
                        <span className="flex gap-1">
                          <button type="button" className="pressable rounded-full border border-white/15 px-3 py-1 text-sm" onClick={() => openChat(p.id)}><span className="zoom-inner">{tr("Message", "Message")}</span></button>
                          <button type="button" className="pressable stamp-ink rounded-full px-3 py-1 text-sm" onClick={() => onOpen({ name: "setup" })}><span className="zoom-inner">{tr("Jouer", "Play")}</span></button>
                        </span>
                      ) : st === "sent" ? (
                        <span className="text-xs text-muted">{tr("Envoyé", "Sent")}</span>
                      ) : st === "incoming" ? (
                        <button type="button" className="pressable stamp-rose rounded-full px-3 py-1 text-sm" onClick={() => { const inv = data.invites.find((i) => i.from === p.id && i.to === session.id); if (inv) acceptInvite(inv.id); }}><span className="zoom-inner">{tr("Accepter", "Accept")}</span></button>
                      ) : (
                        <button type="button" className="pressable stamp-ink rounded-full px-3 py-1 text-sm" onClick={() => invite(p.id)}><span className="zoom-inner">{tr("Invitez", "Invite")}</span></button>
                      )
                    }
                  />
                );
              })}
            </div>
            {q && results.length === 0 && <Empty title={tr("Personne", "No one")} text={tr("Aucun pseudo-name ne correspond.", "No nickname matches.")} />}
          </>
        )}
        {ready.length > 0 && !heart && (
          <p className="text-xs text-muted">{ready.length} {tr("lien(s) déjà ouvert(s). Retrouve-les dans Chats.", "connection(s) already open. Find them in Chats.")}</p>
        )}
      </div>
    </div>
  );
}

function Row({ person, action, note }) {
  const { data } = useStore();
  if (!person) return null;
  const online = (data.presence || []).includes(person.id);
  return (
    <div className="person-row flex items-center gap-3 rounded-2xl border-2 border-[var(--line)] bg-[var(--card)] px-3 py-2">
      <span className="relative">
        <Avatar config={person.avatar} size={44} alt={person.pseudo} />
        {online && <span className="presence-dot" aria-label="en ligne" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">@{person.pseudo}</div>
        {note && <div className="truncate text-xs text-muted">{note}</div>}
      </div>
      {action}
    </div>
  );
}

function InviteBlock({ title, items, render, empty }) {
  return (
    <section>
      <h2 className="display mb-2 text-2xl">{title}</h2>
      {items.length === 0 ? <p className="text-sm text-muted">{empty}</p> : <div className="space-y-2">{items.map(render)}</div>}
    </section>
  );
}

export function Chats({ onBack, onOpen }) {
  const { session, data, tr, createGroup, friendsOf } = useStore();
  const [groupOn, setGroupOn] = useState(false);
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [picked, setPicked] = useState([]);
  const friends = friendsOf();
  const chats = [...data.chats]
    .filter((c) => c.members.includes(session.id))
    .sort((a, b) => {
      const ap = a.pinUntil > Date.now() ? 1 : 0;
      const bp = b.pinUntil > Date.now() ? 1 : 0;
      if (ap !== bp) return bp - ap;
      const at = a.messages.at(-1)?.createdAt || 0;
      const bt = b.messages.at(-1)?.createdAt || 0;
      return bt - at;
    });

  async function makeGroup(e) {
    e.preventDefault();
    if (!name.trim() || picked.length < 2) return;
    const id = await createGroup(name, picked);
    setGroupOn(false);
    if (id) onOpen({ name: "thread", chatId: id });
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl pb-28">
      <ScreenHead
        title={tr("Messages", "Messages")}
        onBack={onBack}
        extra={<button type="button" className="pressable stamp-ink rounded-2xl px-3 py-2 text-sm" onClick={() => setGroupOn(true)}><span className="zoom-inner">{tr("Groupe", "Group")}</span></button>}
      />
      <div className="space-y-2 px-3">
        <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[var(--card)] px-3 py-2">
          <Icon name="search" size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Rechercher...", "Search...")} className="w-full bg-transparent outline-none" />
        </label>
        {chats.length === 0 && <Empty title={tr("Aucune discussion", "No chats")} text={tr("Invite quelqu'un depuis Amis. Le cœur ❤️ suit les invitations.", "Invite someone from Friends. The heart tracks invites.")} />}
        {chats.filter((c) => {
          const otherId = c.members.find((id) => id !== session.id);
          const other = personById(otherId, data.users);
          const blob = `${c.name || ""} ${other?.pseudo || ""}`.toLowerCase();
          return blob.includes(q.trim().toLowerCase());
        }).map((c) => {
          const otherId = c.members.find((id) => id !== session.id);
          const other = personById(otherId, data.users);
          const last = [...c.messages].reverse().find((m) => !(m.hiddenFor || []).includes(session.id) && !(m.expiresAt && m.expiresAt < Date.now()));
          return (
            <button key={c.id} type="button" onClick={() => onOpen({ name: "thread", chatId: c.id })} className="pressable flex w-full items-center gap-3 rounded-2xl border-2 border-[var(--line)] bg-[var(--card)] px-3 py-3 text-left">
              <span className="zoom-inner justify-start">
                {c.type === "group" ? <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--leaf)] text-white"><Icon name="users" /></span> : <Avatar config={other?.avatar} size={44} />}
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-semibold">
                    {c.type === "group" ? c.name : `@${other?.pseudo || c.name}`}
                    {c.pinUntil > Date.now() && <Icon name="pin" size={14} />}
                    {c.ephemeralMs > 0 && <Icon name="clock" size={14} />}
                  </span>
                  <span className="block truncate text-xs text-muted">{last?.text || tr("Nouveau", "New")}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {groupOn && (
        <Modal title={tr("Nouveau groupe", "New group")} onClose={() => setGroupOn(false)}>
          <form onSubmit={makeGroup} className="space-y-3">
            <Field label={tr("Nom du groupe", "Group name")}>
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="label">{tr("Au moins deux ami·es", "At least two friends")}</div>
            <div className="max-h-56 space-y-2 overflow-auto">
              {friends.length === 0 && <p className="text-sm text-muted">{tr("Invite d'abord des ami·es.", "Invite friends first.")}</p>}
              {friends.map((id) => {
                const p = personById(id, data.users);
                const on = picked.includes(id);
                return (
                  <button type="button" key={id} className={`flex w-full items-center gap-2 rounded-xl border-2 px-2 py-2 ${on ? "stamp-ink" : "border-[var(--line)]"}`} onClick={() => setPicked((arr) => on ? arr.filter((x) => x !== id) : [...arr, id])}>
                    <Avatar config={p?.avatar} size={32} /> @{p?.pseudo || id}
                  </button>
                );
              })}
            </div>
            <Btn type="submit" className="w-full" disabled={picked.length < 2 || !name.trim()}>{tr("Créer", "Create")}</Btn>
          </form>
        </Modal>
      )}
    </div>
  );
}

const PIN = [
  ["24h", 24 * 3600 * 1000],
  ["7j", 7 * 24 * 3600 * 1000],
  ["1 mois", 30 * 24 * 3600 * 1000],
];
const EPHEMERAL = [
  ["24h", 24 * 3600 * 1000],
  ["7j", 7 * 24 * 3600 * 1000],
  ["1 mois", 30 * 24 * 3600 * 1000],
  ["90j", 90 * 24 * 3600 * 1000],
];

export function Thread({ chatId, onBack }) {
  const store = useStore();
  const { session, data, tr, sendMessage, deleteMessage, forwardMessage, setPin, setEphemeral } = store;
  const chat = data.chats.find((c) => c.id === chatId);
  const [text, setText] = useState("");
  const [menu, setMenu] = useState(null);
  const [forwardTo, setForwardTo] = useState(null);
  const [tools, setTools] = useState(null);
  const [typingId, setTypingId] = useState(null);
  const hold = useRef(null);
  useEffect(() => {
    if (!chatId) return undefined;
    const socket = getSocket();
    socket.emit("chat:join", chatId);
    const onType = (payload) => {
      if (payload?.chatId !== chatId || payload.userId === session?.id) return;
      setTypingId(payload.typing ? payload.userId : null);
    };
    socket.on("chat:typing", onType);
    return () => {
      socket.emit("chat:typing", { chatId, typing: false });
      socket.off("chat:typing", onType);
    };
  }, [chatId, session?.id]);
  if (!chat) return <div className="p-6">{tr("Discussion introuvable.", "Chat not found.")}</div>;
  const otherId = chat.members.find((id) => id !== session.id);
  const other = personById(otherId, data.users);
  const title = chat.type === "group" ? chat.name : `@${other?.pseudo || chat.name}`;
  const otherOnline = chat.type !== "group" && (data.presence || []).includes(otherId);
  const messages = chat.messages.filter((m) => !(m.hiddenFor || []).includes(session.id) && !(m.expiresAt && m.expiresAt < Date.now()));

  function openMenu(msg) {
    if (msg.authorId === "system") return;
    setMenu(msg);
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col pb-24">
      <ScreenHead
        title={title}
        onBack={onBack}
        extra={
          <div className="flex gap-1">
            <button type="button" className="pressable grid h-10 w-10 place-items-center rounded-xl border-2" onClick={() => setTools(tools === "pin" ? null : "pin")} aria-label={tr("Épingler", "Pin")}><span className="zoom-inner"><Icon name="pin" size={18} /></span></button>
            <button type="button" className="pressable grid h-10 w-10 place-items-center rounded-xl border-2" onClick={() => setTools(tools === "time" ? null : "time")} aria-label={tr("Éphémère", "Ephemeral")}><span className="zoom-inner"><Icon name="clock" size={18} /></span></button>
          </div>
        }
      />
      {tools === "pin" && (
        <div className="mx-3 mb-2 flex flex-wrap gap-2">
          {PIN.map(([label, ms]) => (
            <button key={label} type="button" className="pressable rounded-full border-2 px-3 py-1 text-sm" onClick={() => { setPin(chat.id, ms); setTools(null); }}><span className="zoom-inner">{label}</span></button>
          ))}
          <button type="button" className="pressable rounded-full border-2 px-3 py-1 text-sm" onClick={() => { setPin(chat.id, 0); setTools(null); }}><span className="zoom-inner">{tr("Retirer", "Unpin")}</span></button>
        </div>
      )}
      {tools === "time" && (
        <div className="mx-3 mb-2 flex flex-wrap gap-2">
          {EPHEMERAL.map(([label, ms]) => (
            <button key={label} type="button" className="pressable rounded-full border-2 px-3 py-1 text-sm" onClick={() => { setEphemeral(chat.id, ms); setTools(null); }}><span className="zoom-inner">{label}</span></button>
          ))}
          <button type="button" className="pressable rounded-full border-2 px-3 py-1 text-sm" onClick={() => { setEphemeral(chat.id, 0); setTools(null); }}><span className="zoom-inner">{tr("Désactiver", "Off")}</span></button>
        </div>
      )}
      {chat.ephemeralMs > 0 && <p className="px-4 text-xs text-muted">{tr("Messages éphémères activés pour les prochains envois.", "Ephemeral messages are on for the next sends.")}</p>}
      {otherOnline && <p className="px-4 text-xs text-[var(--good)]">{tr("En ligne", "Online")}</p>}
      {typingId && <p className="px-4 text-xs text-muted">{tr("écrit…", "typing…")}</p>}
      <div className="thread-pane flex flex-1 flex-col gap-2 px-3 py-3">
        {messages.map((m) => {
          if (m.authorId === "system") return <p key={m.id} className="text-center text-xs text-muted">{m.text}</p>;
          const mine = m.authorId === session.id;
          const author = personById(m.authorId, data.users);
          return (
            <div key={m.id} className={`msg-in flex max-w-[88%] items-end gap-2 ${mine ? "self-end flex-row-reverse" : "self-start"}`}>
              {!mine && <Avatar config={author?.avatar} size={28} alt={author?.pseudo || ""} mood={typingId === m.authorId ? "talk" : "idle"} />}
              <div
              className={`max-w-full px-3.5 py-2.5 text-[15px] leading-snug ${mine ? "msg-me" : "msg-them"}`}
              onContextMenu={(e) => { e.preventDefault(); openMenu(m); }}
              onPointerDown={() => { hold.current = setTimeout(() => openMenu(m), 480); }}
              onPointerUp={() => clearTimeout(hold.current)}
              onPointerLeave={() => clearTimeout(hold.current)}
            >
              {!mine && chat.type === "group" && <div className="mb-1 text-[11px] font-bold">@{author?.pseudo}</div>}
              {m.forwarded && <div className="mb-1 text-[10px] uppercase tracking-wider opacity-70">{tr("Transféré", "Forwarded")}</div>}
              {m.text}
              </div>
            </div>
          );
        })}
      </div>
      <form className="composer fixed bottom-4 left-1/2 z-20 flex w-[min(720px,calc(100%-16px))] -translate-x-1/2 gap-2" onSubmit={(e) => { e.preventDefault(); sendMessage(chat.id, text); setText(""); getSocket().emit("chat:typing", { chatId: chat.id, typing: false }); }}>
        <input className="field flex-1" value={text} onChange={(e) => { setText(e.target.value); getSocket().emit("chat:typing", { chatId: chat.id, typing: e.target.value.trim().length > 0 }); }} placeholder={tr("Écrire un message...", "Write a message...")} />
        <button type="submit" className="pressable stamp-ink grid h-12 w-12 place-items-center rounded-2xl" aria-label={tr("Envoyer", "Send")}><span className="zoom-inner"><Icon name="send" size={18} /></span></button>
      </form>
      {menu && (
        <Modal title={tr("Message", "Message")} onClose={() => setMenu(null)}>
          <div className="grid gap-2">
            <Btn kind="ghost" onClick={() => { deleteMessage(chat.id, menu.id, "me"); setMenu(null); }}>{tr("Supprimer pour moi", "Delete for me")}</Btn>
            <Btn kind="ghost" disabled={menu.authorId !== session.id} onClick={() => { if (menu.authorId === session.id) { deleteMessage(chat.id, menu.id, "all"); setMenu(null); } }}>
              {tr("Supprimer pour tous", "Delete for everyone")}
            </Btn>
            <Btn kind="ghost" onClick={async () => { try { await navigator.clipboard.writeText(menu.text); } catch { /* ignore */ } setMenu(null); }}>{tr("Copier", "Copy")}</Btn>
            <Btn kind="ghost" onClick={() => { setForwardTo(menu); setMenu(null); }}>{tr("Transférer", "Forward")}</Btn>
            {menu.authorId !== session.id && <p className="text-xs text-muted">{tr("Supprimer pour tous n'est possible que sur tes propres messages.", "Delete for everyone only works on your own messages.")}</p>}
          </div>
        </Modal>
      )}
      {forwardTo && (
        <Modal title={tr("Transférer vers", "Forward to")} onClose={() => setForwardTo(null)}>
          <div className="grid max-h-72 gap-2 overflow-auto">
            {data.chats.filter((c) => c.members.includes(session.id) && c.id !== chat.id).map((c) => (
              <button key={c.id} type="button" className="rounded-xl border-2 px-3 py-2 text-left" onClick={() => { forwardMessage(chat.id, forwardTo.id, c.id); setForwardTo(null); }}>
                {c.type === "group" ? c.name : `@${personById(c.members.find((id) => id !== session.id), data.users)?.pseudo || c.name}`}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

const SEXES = ["Femme", "Homme", "Autre", "Ne pas dire"];

export function Account({ onBack, onOpen }) {
  const { session, tr, updateProfile, logout } = useStore();
  const [form, setForm] = useState({ ...session, password: "" });
  const [avatarOn, setAvatarOn] = useState(false);
  const [avatar, setAvatar] = useState(session.avatar || defaultAvatar());
  const [msg, setMsg] = useState("");
  const [pwdFocus, setPwdFocus] = useState(false);

  async function save(e) {
    e.preventDefault();
    const patch = {
      nom: form.nom,
      prenom: form.prenom,
      pseudo: form.pseudo,
      email: form.email,
      sexe: form.sexe,
      birthDate: form.birthDate,
      birthPlace: form.birthPlace,
      bio: form.bio,
    };
    if (form.password) patch.password = form.password;
    const res = await updateProfile(patch);
    setMsg(res?.error === "pseudo" ? tr("Pseudo-name déjà pris.", "Nickname already taken.") : res?.error ? tr("Mise à jour refusée.", "Update refused.") : tr("Compte mis à jour.", "Account updated."));
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-xl pb-28">
      <ScreenHead title={tr("Mon compte", "My account")} onBack={onBack} />
      <form onSubmit={save} className="space-y-4 px-4">
        <LogoMark size={120} />
        <div className="flex items-center gap-3">
          <span className="avatar-frame"><Avatar config={session.avatar} size={96} alt={session.pseudo} /></span>
          <div>
            <button type="button" className="pressable text-sm underline" onClick={() => setAvatarOn((v) => !v)}><span className="zoom-inner">{tr("Avatar", "Avatar")}</span></button>
            {onOpen && <button type="button" className="pressable mt-2 block text-sm font-bold text-[var(--rose)]" onClick={() => onOpen({ name: "shop" })}><span className="zoom-inner">{tr("Boutique", "Shop")}</span></button>}
            {onOpen && <button type="button" className="pressable mt-1 block text-sm underline" onClick={() => onOpen({ name: "settings" })}><span className="zoom-inner">{tr("Paramètres", "Settings")}</span></button>}
            <p className="mt-1 text-xs capitalize text-muted">{session.avatar?.expression || tr("heureux", "happy")}</p>
            <p className="text-xs text-muted">{Object.keys(session.lastPlayed || {}).length} {tr("jeux touchés", "games touched")}</p>
            {session.role === "admin" && <span className="stamp-rose mt-2 inline-block rounded-full px-2 py-1 text-xs">Admin</span>}
          </div>
        </div>
        {avatarOn && (
          <div className="stamp rounded-3xl p-3">
            <AvatarEditor value={avatar} onChange={setAvatar} tr={tr} />
            <Btn className="mt-3" onClick={() => { updateProfile({ avatar }); setAvatarOn(false); }}>{tr("Enregistrer l'avatar", "Save avatar")}</Btn>
          </div>
        )}
        <Badge>{tr("Obligatoire", "Required")}</Badge>
        <Field label={tr("Nom", "Last name")}><input className="field" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></Field>
        <Field label={tr("Prénom", "First name")}><input className="field" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} /></Field>
        <Field label="Pseudo-name"><input className="field" value={form.pseudo} onChange={(e) => setForm({ ...form, pseudo: e.target.value })} /></Field>
        <Field label="Email"><input className="field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <div>
          <div className="label">{tr("Sexe", "Gender")}</div>
          <div className="grid grid-cols-2 gap-2">
            {SEXES.map((s) => (
              <button type="button" key={s} className={`rounded-xl border-2 px-2 py-2 text-sm ${form.sexe === s ? "stamp-ink" : ""}`} onClick={() => setForm({ ...form, sexe: s })}>{s}</button>
            ))}
          </div>
        </div>
        <Badge>{tr("Nécessaire", "Needed")}</Badge>
        <Field label={tr("Date de naissance", "Birth date")}><input className="field" type="date" value={form.birthDate || ""} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} /></Field>
        <Field label={tr("Lieu de naissance", "Birth place")}><input className="field" value={form.birthPlace || ""} onChange={(e) => setForm({ ...form, birthPlace: e.target.value })} placeholder="Lomé" /></Field>
        <Badge>{tr("Facultatif", "Optional")}</Badge>
        <Field label={tr("Biographie", "Biography")} hint={tr("Elle nourrit les suggestions d'amis.", "It feeds friend suggestions.")}>
          <textarea className="field min-h-24" value={form.bio || ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </Field>
        <Field label={tr("Nouveau mot de passe", "New password")} hint={tr("Le chaton ferme les yeux.", "The kitten covers its eyes.")}>
          <input className="field" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} onFocus={() => setPwdFocus(true)} onBlur={() => setPwdFocus(false)} />
        </Field>
        {pwdFocus && <p className="text-sm italic text-muted">{tr("Le chaton a posé ses pattes sur ses yeux. Il sourit quand même.", "The kitten has covered its eyes with its paws. It is still smiling.")}</p>}
        {msg && <p className="text-sm">{msg}</p>}
        <Btn type="submit" className="w-full">{tr("Enregistrer", "Save")}</Btn>
        <Btn kind="danger" className="w-full" onClick={logout}>{tr("Déconnexion", "Log out")}</Btn>
        <p className="text-xs text-muted">{tr("Prototype : le mot de passe reste sur cet appareil seulement.", "Prototype: the password stays on this device only.")}</p>
      </form>
    </div>
  );
}

function Badge({ children }) {
  return <div className="pt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--rose)]">{children}</div>;
}

export function Avis({ onBack }) {
  const { session, data, tr, addFeedback } = useStore();
  const [text, setText] = useState("");
  const mine = data.feedback.filter((f) => f.userId === session.id);
  return (
    <div className="mx-auto min-h-dvh w-full max-w-xl pb-28">
      <ScreenHead title={tr("Avis", "Feedback")} onBack={onBack} />
      <form className="space-y-3 px-4" onSubmit={(e) => { e.preventDefault(); addFeedback(text); setText(""); }}>
        <Field label={tr("Ton avis", "Your feedback")}>
          <textarea className="field min-h-28" value={text} onChange={(e) => setText(e.target.value)} placeholder={tr("Une idée, un bug, un jeu qui manque…", "An idea, a bug, a missing game…")} />
        </Field>
        <Btn type="submit" className="w-full">{tr("Envoyer", "Send")}</Btn>
      </form>
      <div className="mt-6 space-y-3 px-4">
        {mine.map((f) => (
          <article key={f.id} className="stamp rounded-2xl p-3 text-sm">
            <p>{f.text}</p>
            {f.reply ? <p className="mt-2 border-t border-[var(--line)] pt-2 italic">Admin : {f.reply}</p> : <p className="mt-2 text-xs text-muted">{tr("En attente d'une réponse.", "Waiting for a reply.")}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}

export function Archive({ onBack, onOpen }) {
  const { session, data, tr, toggleArchive } = useStore();
  const ids = data.archives[session.id] || [];
  const list = games.filter((g) => ids.includes(g.id));
  return (
    <div className="mx-auto min-h-dvh w-full max-w-6xl pb-28">
      <ScreenHead title={tr("Archive", "Archive")} onBack={onBack} />
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 px-3 md:grid-cols-3">
        {list.map((g) => (
          <GameCard key={g.id} game={g} tr={tr} archived onOpen={() => onOpen({ name: "setup", gameId: g.id })} onArchive={() => toggleArchive(g.id)} />
        ))}
      </div>
      {list.length === 0 && <div className="px-4"><Empty title={tr("Rien d'archivé", "Nothing archived")} text={tr("Le marque-page sous chaque jeu range ta sélection ici.", "The bookmark under each game stores your selection here.")} /></div>}
    </div>
  );
}

export function Admin({ onBack }) {
  const { data, tr, replyFeedback, resetDemo, suspendUser, session } = useStore();
  const [tab, setTab] = useState("avis");
  const [drafts, setDrafts] = useState({});
  const unanswered = data.feedback.filter((f) => !f.reply).length;
  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl pb-28">
      <ScreenHead title={tr("Back-office", "Back office")} onBack={onBack} />
      <div className="flex gap-2 px-3">
        {[
          ["avis", `${tr("Avis", "Feedback")} (${unanswered})`],
          ["users", tr("Joueurs", "Players")],
          ["jeux", tr("Jeux", "Games")],
          ["rooms", tr("Salons", "Rooms")],
          ["audit", tr("Audit", "Audit")],
        ].map(([id, label]) => (
          <button key={id} type="button" className={`pressable rounded-full border-2 px-3 py-1 text-sm ${tab === id ? "stamp-ink" : ""}`} onClick={() => setTab(id)}><span className="zoom-inner">{label}</span></button>
        ))}
      </div>
      <div className="space-y-3 px-3 py-4">
        {tab === "avis" && data.feedback.length === 0 && <Empty title={tr("Boîte vide", "Empty inbox")} text={tr("Les avis du menu arrivent ici.", "Feedback from the menu arrives here.")} />}
        {tab === "avis" && data.feedback.map((f) => (
          <article key={f.id} className="stamp rounded-2xl p-3">
            <div className="text-xs text-muted">@{f.pseudo}</div>
            <p className="mt-1">{f.text}</p>
            {f.reply && <p className="mt-2 text-sm italic">{tr("Réponse", "Reply")} : {f.reply}</p>}
            <div className="mt-2 flex gap-2">
              <input className="field" value={drafts[f.id] || ""} onChange={(e) => setDrafts({ ...drafts, [f.id]: e.target.value })} placeholder={tr("Répondre…", "Reply…")} />
              <Btn onClick={() => replyFeedback(f.id, drafts[f.id] || "")}>{tr("OK", "OK")}</Btn>
            </div>
          </article>
        ))}
        {tab === "users" && data.users.map((u) => (
          <div key={u.id} className="flex items-center gap-3 rounded-2xl border-2 px-3 py-2">
            <Avatar config={u.avatar} size={40} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">@{u.pseudo} {u.role === "admin" && "· admin"} {u.suspended && "· suspendu"}</div>
              <div className="text-xs text-muted">{u.email} · {u.sexe}</div>
            </div>
            {u.id !== session.id && (
              <button type="button" className="pressable text-xs underline" onClick={() => suspendUser(u.id, !u.suspended)}>
                {u.suspended ? tr("Rétablir", "Restore") : tr("Suspendre", "Suspend")}
              </button>
            )}
          </div>
        ))}
        {tab === "audit" && (data.audit || []).length === 0 && <p className="text-sm text-muted">{tr("Aucune action admin.", "No admin action yet.")}</p>}
        {tab === "audit" && (data.audit || []).map((item) => (
          <div key={item.id} className="rounded-2xl border-2 px-3 py-2 text-sm">
            <b>{item.action}</b> · {item.targetId || "—"}
          </div>
        ))}
        {tab === "jeux" && <p className="text-sm">{games.length} {tr("jeux au catalogue, dont", "games in the catalog, including")} {games.filter((g) => g.playable).length} {tr("jouables.", "playable.")}</p>}
        {tab === "rooms" && data.rooms.length === 0 && <p className="text-sm text-muted">{tr("Aucun salon en ligne créé.", "No online salon created yet.")}</p>}
        {tab === "rooms" && data.rooms.map((r) => (
          <div key={r.id} className="rounded-2xl border-2 px-3 py-2 text-sm">
            <b>{r.code}</b> · {r.gameId} · {r.difficulty} · {r.invites?.length || 0} {tr("invités", "invited")}
          </div>
        ))}
        <button type="button" className="text-sm text-[var(--danger)] underline" onClick={resetDemo}>{tr("Réinitialiser la démo sur cet appareil", "Reset the demo on this device")}</button>
      </div>
    </div>
  );
}
