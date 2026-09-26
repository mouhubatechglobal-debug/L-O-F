import { useMemo } from "react";
import { useStore } from "./store.jsx";
import { Avatar } from "./components/Avatar.jsx";
import { Icon, LogoMark } from "./components/Icons.jsx";
import { Home } from "./home.jsx";

function ago(ts, tr) {
  if (!ts) return "";
  const min = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (min < 60) return tr(`Il y a ${min} min`, `${min} min ago`);
  const h = Math.round(min / 60);
  if (h < 24) return tr(`Il y a ${h} h`, `${h} h ago`);
  return tr("Hier", "Yesterday");
}

export function NeonHome({ onOpen }) {
  const { session, tr, data, personById } = useStore();
  const incoming = data.invites.filter((i) => i.to === session.id && i.status === "pending");
  const online = (data.presence || []).includes(session.id);
  const activity = useMemo(() => {
    const rows = [];
    incoming.forEach((i) => {
      const p = personById(i.from);
      rows.push({
        id: `inv-${i.id}`,
        who: p,
        title: p?.pseudo || tr("Quelqu'un", "Someone"),
        text: tr("vous a envoyé une demande d'amis", "sent you a friend request"),
        when: i.createdAt,
        dest: "friends",
      });
    });
    data.chats.forEach((c) => {
      const last = [...(c.messages || [])].reverse().find((m) => !(m.hiddenFor || []).includes(session.id));
      if (!last) return;
      const who = personById(last.authorId);
      rows.push({
        id: `msg-${last.id || c.id}`,
        who,
        title: who?.pseudo || c.name || tr("Message", "Message"),
        text: last.text || tr("a envoyé un message", "sent a message"),
        when: last.createdAt || 0,
        dest: "chats",
      });
    });
    return rows.sort((a, b) => (b.when || 0) - (a.when || 0)).slice(0, 6);
  }, [data.chats, incoming, personById, session.id, tr]);

  return (
    <div className="neon-page">
      <header className="mb-4 flex items-center justify-between">
        <LogoMark size={54} />
        <button type="button" className="pressable relative grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-[var(--card)]" onClick={() => onOpen({ name: "friends" })} aria-label={tr("Notifications", "Notifications")}>
          <Icon name="heart" size={18} />
          {incoming.length > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--rose)] px-1 text-[10px] font-bold">{incoming.length}</span>}
        </button>
      </header>
      <div className="mb-4 flex items-center gap-3">
        <button type="button" className="avatar-frame" onClick={() => onOpen({ name: "profile" })} aria-label={tr("Profil", "Profile")}>
          <Avatar config={session.avatar} size={56} alt={session.pseudo} />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold">{session.pseudo}</h1>
          <p className="text-sm text-[#3dd68c]">{online ? tr("En ligne", "Online") : tr("Connecté", "Signed in")}</p>
          <p className="text-sm text-muted">{tr("Prêt pour une nouvelle partie ?", "Ready for a new match?")}</p>
        </div>
      </div>

      <section className="neon-hero">
        <img src="/art-splash.jpg" alt="" />
        <div className="cap">
          <h2 className="text-2xl font-extrabold">{tr("Jouer maintenant", "Play now")}</h2>
          <p className="text-sm text-[#f3d7ea]">{tr("Trouver une partie", "Find a match")}</p>
          <button type="button" className="pink-btn mt-3" onClick={() => onOpen({ name: "setup" })}>{tr("Jouer maintenant", "Play now")}</button>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          ["dice", tr("Jeux", "Games"), "games"],
          ["users", tr("Amis", "Friends"), "friends"],
          ["chat", tr("Messages", "Messages"), "chats"],
        ].map(([icon, label, name]) => (
          <button key={name} type="button" className="rounded-2xl border border-white/10 bg-[var(--card)] px-2 py-4 text-sm font-bold" onClick={() => onOpen({ name })}>
            <Icon name={icon} size={20} />
            <span className="mt-1 block">{label}</span>
          </button>
        ))}
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-extrabold">{tr("Activité récente", "Recent activity")}</h2>
        {activity.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-[var(--card)] px-4 py-4 text-sm text-muted">
            {tr("Rien pour l'instant. Tes invitations et messages apparaîtront ici.", "Nothing yet. Your invites and messages will show up here.")}
          </p>
        ) : activity.map((row) => (
          <button key={row.id} type="button" className="activity-row mb-2 flex w-full items-center gap-3 px-3 py-3 text-left" onClick={() => onOpen({ name: row.dest })}>
            <Avatar config={row.who?.avatar} size={40} alt="" />
            <span className="min-w-0 flex-1">
              <b className="block truncate">{row.title}</b>
              <span className="block truncate text-sm text-muted">{row.text}</span>
            </span>
            <span className="text-xs text-muted">{ago(row.when, tr)}</span>
          </button>
        ))}
      </section>
    </div>
  );
}

export function GamesHub({ onOpen }) {
  const { tr } = useStore();
  const modes = [
    { id: "verite-gage", title: "Love", art: "/art-love.jpg", blurb: tr("Testez votre complicité", "Test your chemistry") },
    { id: "qui-est", title: "Friendship", art: "/art-friend.jpg", blurb: tr("Découvrez votre niveau d'amitié", "See your friendship level") },
    { id: "pierre", title: "Challenge", art: "/art-challenge.jpg", blurb: tr("Défiez un ami", "Challenge a friend") },
  ];
  return (
    <div className="neon-page">
      <h1 className="text-4xl font-extrabold">{tr("Jeux", "Games")}</h1>
      <p className="mb-4 text-muted">{tr("Choisis ton défi", "Choose your challenge")}</p>
      <div className="grid gap-3">
        {modes.map((m) => (
          <article key={m.id} className="mode-card">
            <img src={m.art} alt="" />
            <div className="cap flex items-end justify-between gap-3">
              <span>
                <b className="block text-2xl">{m.title}</b>
                <span className="text-sm text-[#f3d7ea]">{m.blurb}</span>
              </span>
              <button type="button" className="pink-btn" onClick={() => onOpen({ name: "setup", gameId: m.id })}>{tr("Jouer", "Play")}</button>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-6">
        <Home onOpen={onOpen} onMenu={() => onOpen({ name: "settings" })} />
      </div>
    </div>
  );
}

export function Profile({ onOpen }) {
  const { session, tr, friendsOf, data } = useStore();
  const online = (data.presence || []).includes(session.id);
  const friends = friendsOf().length;
  const played = Object.keys(session.lastPlayed || {}).length;
  const rows = [
    ["dice", tr("Mes parties", "My matches"), "setup"],
    ["star", tr("Mes résultats", "My results"), "archive"],
    ["users", tr("Mes amis", "My friends"), "friends"],
    ["bookmark", tr("Paramètres", "Settings"), "settings"],
    ["heart", tr("Boutique", "Shop"), "shop"],
  ];
  return (
    <div className="neon-page">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-4xl font-extrabold">{tr("Profil", "Profile")}</h1>
        <button type="button" className="grid h-11 w-11 place-items-center rounded-full border border-white/10" onClick={() => onOpen({ name: "settings" })} aria-label={tr("Paramètres", "Settings")}>
          <Icon name="dots" />
        </button>
      </div>
      <div className="mb-4 flex items-center gap-3">
        <span className="avatar-frame"><Avatar config={session.avatar} size={84} alt={session.pseudo} /></span>
        <div>
          <b className="text-2xl">{session.pseudo}</b>
          <p className="text-sm text-[#3dd68c]">{online ? tr("En ligne", "Online") : tr("Connecté", "Signed in")}</p>
          <p className="text-sm text-muted">{session.email}</p>
        </div>
      </div>
      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <Stat n={friends} label={tr("amis", "friends")} />
        <Stat n={played} label={tr("parties", "matches")} />
        <Stat n="—" label={tr("compatibilité", "compatibility")} />
      </div>
      <p className="mb-4 text-xs text-muted">{tr("La compatibilité n'est pas calculée par le serveur. Aucun pourcentage n'est inventé.", "Compatibility is not computed by the server. No percentage is invented.")}</p>
      <div className="grid gap-2">
        {rows.map(([icon, label, name]) => (
          <button key={name} type="button" className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[var(--card)] px-4 py-3 text-left font-bold" onClick={() => onOpen({ name })}>
            <Icon name={icon} size={18} /> {label}
          </button>
        ))}
        <button type="button" className="text-left text-sm font-bold text-[#ff6fb5]" onClick={() => onOpen({ name: "account" })}>{tr("Modifier le compte", "Edit account")}</button>
      </div>
    </div>
  );
}

function Stat({ n, label }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--card)] px-2 py-3">
      <b className="block text-xl">{n}</b>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

const LOOKS = [
  { id: "vetements", fr: "Vêtements", en: "Clothes", patch: { outfit: "hoodie", outfitColor: "#ff3fa4" } },
  { id: "cheveux", fr: "Cheveux", en: "Hair", patch: { hair: "long", hairColor: "#E7A0A8" } },
  { id: "accessoires", fr: "Accessoires", en: "Accessories", patch: { accessory: "glasses" } },
  { id: "effets", fr: "Effets", en: "Effects", patch: { accessory: "coeur", expression: "heureux" } },
];

export function Shop({ onOpen }) {
  const { session, tr, updateProfile, toast } = useStore();
  async function wear(look) {
    const avatar = { ...(session.avatar || {}), ...look.patch };
    const res = await updateProfile({ avatar });
    if (res?.ok) toast(tr("Look enregistré sur ton profil.", "Look saved on your profile."));
    else toast(tr("La boutique a besoin du serveur pour enregistrer.", "The shop needs the server to save."));
  }
  return (
    <div className="neon-page">
      <h1 className="text-4xl font-extrabold">{tr("Boutique", "Shop")}</h1>
      <p className="mb-4 text-sm text-muted">{tr("Personnalise ton avatar. Rien n'est vendu et aucune monnaie n'est inventée.", "Customize your avatar. Nothing is sold and no currency is invented.")}</p>
      <div className="grid grid-cols-2 gap-3">
        {LOOKS.map((look) => (
          <article key={look.id} className="shop-card p-3">
            <div className="mb-3 grid place-items-center rounded-2xl bg-[#22143c] py-3">
              <Avatar config={{ ...(session.avatar || {}), ...look.patch }} size={88} alt="" />
            </div>
            <b>{tr(look.fr, look.en)}</b>
            <button type="button" className="pink-btn mt-3 w-full" onClick={() => wear(look)}>{tr("Porter", "Wear")}</button>
          </article>
        ))}
      </div>
      <button type="button" className="mt-4 text-sm font-bold text-[#ff6fb5]" onClick={() => onOpen({ name: "account" })}>{tr("Ouvrir le créateur complet", "Open the full creator")}</button>
    </div>
  );
}

export function Settings({ onOpen }) {
  const { session, tr, updateProfile, logout, installApp } = useStore();
  const themes = [
    ["amour", "Nuit rose", "Rose night"],
    ["sombre", "Sombre", "Dark"],
    ["clair", "Clair", "Light"],
    ["joyeux", "Joyeux", "Joyful"],
    ["lagune", "Lagune", "Lagoon"],
  ];
  return (
    <div className="neon-page">
      <h1 className="text-4xl font-extrabold">{tr("Paramètres", "Settings")}</h1>
      <div className="my-4 flex items-center gap-3">
        <Avatar config={session.avatar} size={52} alt="" />
        <div>
          <b>{session.pseudo}</b>
          <p className="text-sm text-muted">{session.email}</p>
        </div>
      </div>
      <div className="grid gap-2">
        <button type="button" className="set-row" onClick={() => onOpen({ name: "account" })}><Icon name="user" size={18} /> {tr("Compte", "Account")}</button>
        <button type="button" className="set-row" onClick={() => onOpen({ name: "friends" })}><Icon name="heart" size={18} /> {tr("Notifications", "Notifications")}</button>
        <button type="button" className="set-row" onClick={() => onOpen({ name: "account" })}><Icon name="lock" size={18} /> {tr("Confidentialité", "Privacy")}</button>
        <div className="rounded-2xl border border-white/10 bg-[var(--card)] p-3">
          <p className="mb-2 text-sm font-bold"><Icon name="moon" size={16} /> {tr("Apparence", "Appearance")}</p>
          <div className="flex flex-wrap gap-2">
            {themes.map(([id, fr, en]) => (
              <button key={id} type="button" className={`rounded-full border px-3 py-1 text-sm ${session.theme === id || (!session.theme && id === "amour") ? "stamp-ink" : "border-white/15"}`} onClick={() => updateProfile({ theme: id })}>{tr(fr, en)}</button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[var(--card)] p-3">
          <p className="mb-2 text-sm font-bold"><Icon name="globe" size={16} /> {tr("Langue", "Language")}</p>
          <div className="flex gap-2">
            <button type="button" className={`rounded-full border px-3 py-1 text-sm ${session.lang !== "en" ? "stamp-ink" : "border-white/15"}`} onClick={() => updateProfile({ lang: "fr" })}>Français</button>
            <button type="button" className={`rounded-full border px-3 py-1 text-sm ${session.lang === "en" ? "stamp-ink" : "border-white/15"}`} onClick={() => updateProfile({ lang: "en" })}>English</button>
          </div>
        </div>
        <button type="button" className="set-row" onClick={() => onOpen({ name: "avis" })}><Icon name="star" size={18} /> {tr("Aide & Support", "Help & support")}</button>
        <button type="button" className="set-row" onClick={installApp}><Icon name="globe" size={18} /> {tr("Installer l'application", "Install the app")}</button>
        {session.role === "admin" && <button type="button" className="set-row" onClick={() => onOpen({ name: "admin" })}><Icon name="star" size={18} /> {tr("Back-office", "Back office")}</button>}
        <button type="button" className="set-row text-[#ff5d7a]" onClick={logout}><Icon name="close" size={18} /> {tr("Déconnexion", "Log out")}</button>
      </div>
    </div>
  );
}
