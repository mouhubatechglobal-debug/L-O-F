import { useEffect, useMemo, useState } from "react";
import { games, CATS } from "./data/games.js";
import { useStore } from "./store.jsx";
import { Avatar } from "./components/Avatar.jsx";
import { Kitten } from "./components/Kitten.jsx";
import { fx, setSoundMuted, soundMuted } from "./fx.js";
import { Icon, LogoMark } from "./components/Icons.jsx";
import { IconBtn } from "./components/Ui.jsx";

export function norm(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function Home({ onOpen, onMenu }) {
  const { session, tr, data, toggleArchive } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("tous");
  const archives = data.archives[session.id] || [];
  const incoming = data.invites.filter((i) => i.to === session.id && i.status === "pending").length;

  const list = useMemo(() => {
    const n = norm(q);
    return games.filter((g) => {
      if (cat === "prets" && !g.playable) return false;
      if (cat !== "tous" && cat !== "prets" && g.cat !== cat) return false;
      if (!n) return true;
      const blob = norm(`${g.title} ${g.titleEn} ${g.blurb} ${g.blurbEn} ${g.cat} ${g.tags.join(" ")}`);
      return blob.includes(n);
    });
  }, [q, cat]);

  return (
    <div className="mx-auto w-full max-w-6xl px-3 pb-28 pt-3">
      <header className="topbar sticky top-0 z-20 -mx-3 mb-4 flex items-center gap-2 bg-[color:var(--bg)]/90 px-3 py-2 backdrop-blur">
        <LogoSlot user={session} />
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border-2 border-[var(--line)] bg-[var(--card)] px-3 py-2">
          <Icon name="search" size={18} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tr(`Chercher parmi ${games.length} jeux`, `Search ${games.length} games`)}
            className="w-full bg-transparent outline-none"
            aria-label={tr("Recherche", "Search")}
          />
        </label>
        <IconBtn name="users" label={tr("Amis", "Friends")} badge={incoming} onClick={() => onOpen({ name: "friends" })} />
        <IconBtn name="dots" label={tr("Menu", "Menu")} onClick={onMenu} />
      </header>

      <section className="stamp hero-card relative mb-5 overflow-hidden rounded-[28px] p-5">
        <div className="hero-copy">
        <LogoMark size={200} />
        <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{tr("Ce soir, au salon", "Tonight, at the salon")}</div>
        <h1 className="display mt-1 text-4xl leading-none">
          {tr("Bonjour", "Hello")}, <span className="italic-soft">{session.pseudo}</span>
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted">
          {tr(
            "Six jeux à la table, une bibliothèque derrière. En ligne, à plusieurs. Le hors ligne arrive bientôt, avec l'application réelle.",
            "Six games on the table, a library behind them. Online, with others. Offline is coming soon, with the real app."
          )}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="pressable stamp-rose rounded-full px-4 py-2 text-sm font-semibold" onClick={() => onOpen({ name: "setup" })}>
            <span className="zoom-inner">{tr("Jouer", "Play")}</span>
          </button>
          <button type="button" className="pressable rounded-full border-2 border-[var(--line)] bg-[var(--card)] px-4 py-2 text-sm font-semibold" onClick={() => onOpen({ name: "setup", gameId: "verite-gage" })}>
            <span className="zoom-inner">{tr("Vérité ou Gage", "Truth or Dare")}</span>
          </button>
        </div>
        </div>
        <div className="hero-kitten"><Kitten mode="sit" lookX={-0.4} /></div>
      </section>

      <div className="hide-scroll -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
        <Chip on={cat === "tous"} onClick={() => setCat("tous")}>{tr("Tous", "All")}</Chip>
        <Chip on={cat === "prets"} onClick={() => setCat("prets")}>{tr("Prêts", "Ready")}</Chip>
        {CATS.map((c) => (
          <Chip key={c.id} on={cat === c.id} onClick={() => setCat(c.id)}>{tr(c.fr, c.en)}</Chip>
        ))}
      </div>

      {!q && cat === "tous" && (
        <section className="mb-6">
          <h2 className="display mb-3 text-3xl">{tr("À la table", "On the table")}</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3">
            {games.filter((g) => g.playable).map((g) => (
              <GameCard key={g.id} game={g} tr={tr} archived={archives.includes(g.id)} onOpen={() => onOpen({ name: "setup", gameId: g.id })} onArchive={() => toggleArchive(g.id)} />
            ))}
          </div>
        </section>
      )}
      <p className="mb-3 text-sm text-muted">{!q && cat === "tous" ? tr("La bibliothèque", "The library") : `${list.length} ${tr("jeux", "games")}`}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 xl:grid-cols-4">
        {( !q && cat === "tous" ? list.filter((g) => !g.playable) : list ).map((g) => (
          <GameCard
            key={g.id}
            game={g}
            tr={tr}
            archived={archives.includes(g.id)}
            onOpen={() => onOpen({ name: "setup", gameId: g.id })}
            onArchive={() => toggleArchive(g.id)}
          />
        ))}
      </div>
      {list.length === 0 && <p className="mt-8 text-center text-sm text-muted">{tr("Aucun jeu pour cette recherche.", "No game for this search.")}</p>}
    </div>
  );
}

function Chip({ children, on, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`pressable shrink-0 rounded-full border-2 border-[var(--line)] px-3 py-1.5 text-sm ${on ? "stamp-ink" : "bg-[var(--card)]"}`}>
      <span className="zoom-inner">{children}</span>
    </button>
  );
}

export function GameCard({ game, tr, archived, onOpen, onArchive }) {
  const cat = CATS.find((c) => c.id === game.cat);
  return (
    <div className="relative pb-3">
      <button type="button" onClick={onOpen} className={`card-game cat-${game.cat} ${game.playable ? "is-ready" : ""} block w-full p-3 text-left`}>
        <span className="card-mark">{tr(game.title, game.titleEn).slice(0, 1)}</span>
        <span className="relative z-[1] block">
          <span className="mb-8 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
            <span>{cat ? tr(cat.fr, cat.en) : game.cat}</span>
            {game.playable ? <span className="rounded-full bg-[var(--leaf)] px-2 py-0.5 text-white">{tr("Prêt", "Ready")}</span> : <span className="text-muted">{tr("Tour", "Round")}</span>}
          </span>
          <span className="display block text-xl leading-tight">{tr(game.title, game.titleEn)}</span>
          <span className="mt-2 block text-xs text-muted">{game.players} · {game.minutes} min</span>
        </span>
      </button>
      <button type="button" className="bookmark-tab pressable grid h-9 w-9 place-items-center rounded-xl border-2 border-[var(--line)] bg-[var(--card)]" onClick={onArchive} aria-label={tr("Archiver", "Archive")}>
        <span className="zoom-inner" style={{ color: archived ? "var(--rose)" : "inherit" }}><Icon name="bookmark" size={18} /></span>
      </button>
    </div>
  );
}

function LogoSlot({ user }) {
  const [showAvatar, setShowAvatar] = useState(false);
  useEffect(() => {
    if (!user?.avatar) return undefined;
    const t = setInterval(() => setShowAvatar((v) => !v), 15000);
    return () => clearInterval(t);
  }, [user?.avatar]);
  const shift = Boolean(user?.avatar && showAvatar);
  return (
    <button type="button" className="logo-slot" onClick={() => user?.avatar && setShowAvatar((v) => !v)} aria-label="Logo">
      <div className={`logo-reel ${shift ? "shift" : ""}`}>
        <LogoMark size={40} />
        <Avatar config={user?.avatar} size={48} alt={user?.pseudo || ""} />
      </div>
    </button>
  );
}

export function MenuSheet({ onClose, onOpen }) {
  const { session, tr, updateProfile, installApp, installReady } = useStore();
  const [wallNote, setWallNote] = useState("");
  const themes = [
    ["amour", "Amour", "Love"],
    ["clair", "Clair", "Light"],
    ["sombre", "Sombre", "Dark"],
    ["joyeux", "Joyeux", "Joyful"],
    ["lagune", "Lagune", "Lagoon"],
  ];
  async function onWall(file) {
    if (!file) return;
    const dataUrl = await compress(file);
    updateProfile({ wallpaper: dataUrl });
    setWallNote(tr("Fond importé depuis ta galerie.", "Wallpaper imported from your gallery."));
  }
  return (
    <div className="sheet-bg" onClick={onClose}>
      <aside className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-4">
          <span className="flex items-center gap-2"><LogoMark size={36} /><h2 className="display text-3xl">{tr("Menu", "Menu")}</h2></span>
          <button type="button" className="pressable" onClick={onClose} aria-label={tr("Fermer", "Close")}><span className="zoom-inner"><Icon name="close" /></span></button>
        </div>
        <div className="space-y-6 px-4 pb-16">
          <section>
            <div className="label">{tr("Thème", "Theme")}</div>
            <div className="grid grid-cols-2 gap-2">
              {themes.map(([id, fr, en]) => (
                <button key={id} type="button" className={`pressable rounded-2xl border-2 px-3 py-3 text-left ${session.theme === id ? "stamp-ink" : "border-[var(--line)] bg-[var(--card)]"}`} onClick={() => updateProfile({ theme: id })}>
                  <span className="zoom-inner justify-start">{tr(fr, en)}</span>
                </button>
              ))}
            </div>
          </section>
          <section>
            <div className="label">{tr("Fonds d'écran", "Wallpaper")}</div>
            <div className="flex flex-wrap gap-2">
              <label className="pressable stamp cursor-pointer rounded-2xl px-3 py-2 text-sm">
                <span className="zoom-inner"><Icon name="image" size={16} /> {tr("Importer", "Import")}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onWall(e.target.files?.[0])} />
              </label>
              {session.wallpaper && (
                <button type="button" className="pressable rounded-2xl border-2 border-[var(--line)] px-3 py-2 text-sm" onClick={() => updateProfile({ wallpaper: null })}>
                  <span className="zoom-inner">{tr("Retirer", "Remove")}</span>
                </button>
              )}
            </div>
            {wallNote && <p className="mt-2 text-sm text-muted">{wallNote}</p>}
          </section>
          <section className="grid gap-2">
            <SoundRow tr={tr} />
            <MenuLink icon="bookmark" label={tr("Archive", "Archive")} onClick={() => { onOpen({ name: "archive" }); onClose(); }} />
            <div>
              <div className="label">{tr("Langues", "Languages")}</div>
              <div className="flex gap-2">
                <button type="button" className={`pressable rounded-full border-2 px-4 py-2 ${session.lang !== "en" ? "stamp-ink" : ""}`} onClick={() => updateProfile({ lang: "fr" })}><span className="zoom-inner">Français</span></button>
                <button type="button" className={`pressable rounded-full border-2 px-4 py-2 ${session.lang === "en" ? "stamp-ink" : ""}`} onClick={() => updateProfile({ lang: "en" })}><span className="zoom-inner">English</span></button>
              </div>
            </div>
            <MenuLink icon="star" label={tr("Avis", "Feedback")} onClick={() => { onOpen({ name: "avis" }); onClose(); }} />
            <MenuLink icon="globe" label={tr("Cloner sur téléphone ou ordinateur", "Clone to phone or computer")} onClick={installApp} />
            <p className="text-xs text-muted">
              {installReady
                ? tr("L'installation PWA est disponible sur cet appareil.", "PWA install is available on this device.")
                : tr("Le lien de l'app sera copié. Sur iPhone : Partager, puis Sur l'écran d'accueil. Sur ordinateur : installer depuis le navigateur.", "The app link will be copied. On iPhone: Share, then Add to Home Screen. On a computer: install from the browser.")}
            </p>
            <p className="text-xs text-muted">{tr("L'application réelle, avec le mode hors ligne, arrive bientôt.", "The real app, with offline mode, is coming soon.")}</p>
            {session.role === "admin" && (
              <MenuLink icon="star" label={tr("Back-office", "Back office")} onClick={() => { onOpen({ name: "admin" }); onClose(); }} />
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

function SoundRow({ tr }) {
  const [muted, setMuted] = useState(soundMuted());
  return (
    <button type="button" className="pressable flex w-full items-center gap-3 rounded-2xl border-2 border-[var(--line)] bg-[var(--card)] px-3 py-3 text-left font-semibold" onClick={() => { const next = !soundMuted(); setSoundMuted(next); setMuted(next); if (!next) fx.tap(); }}>
      <span className="zoom-inner justify-start">{muted ? tr("Son du jeu : coupé", "Game sound: off") : tr("Son du jeu : ouvert", "Game sound: on")}</span>
    </button>
  );
}

function MenuLink({ icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="pressable flex w-full items-center gap-3 rounded-2xl border-2 border-[var(--line)] bg-[var(--card)] px-3 py-3 text-left font-semibold">
      <span className="zoom-inner justify-start"><Icon name={icon} /> {label}</span>
    </button>
  );
}

function compress(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const max = 1280;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.src = URL.createObjectURL(file);
  });
}
