import { useEffect, useRef, useState } from "react";
import { StoreProvider, useStore } from "./store.jsx";
import { AuthScreens } from "./auth.jsx";
import { MenuSheet } from "./home.jsx";
import { GamesHub, NeonHome, Profile, Settings, Shop } from "./neon.jsx";
import { Account, Admin, Archive, Avis, Chats, Friends, Thread } from "./social.jsx";
import { PlayFlow } from "./play.jsx";
import { Toasts } from "./components/Ui.jsx";
import { Icon, LogoMark } from "./components/Icons.jsx";

export function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const store = useStore();
  const { session, theme, wallpaper, toasts, tr } = store;
  const [nav, setNav] = useState([{ name: "home" }]);
  const [menu, setMenu] = useState(false);
  const awaOnce = useRef(false);
  const view = nav[nav.length - 1];

  useEffect(() => {
    document.documentElement.dataset.theme = theme || "amour";
    document.documentElement.lang = session?.lang === "en" ? "en" : "fr";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "amour" || !theme ? "#0b0820" : theme === "sombre" ? "#14080d" : "#f7f4ef");
  }, [theme, session?.lang]);

  useEffect(() => {
    awaOnce.current = false;
  }, [session?.id]);

  useEffect(() => {
    if (!session?.seenWelcome || awaOnce.current || session.awaInvited) return;
    awaOnce.current = true;
    store.maybeAwaInvite();
  }, [session?.id, session?.seenWelcome, session?.awaInvited]);

  useEffect(() => {
    let last = null;
    const down = (e) => {
      last = e.target.closest?.(".pressable");
    };
    const up = () => {
      if (!last) return;
      const inner = last.querySelector(".zoom-inner") || last;
      inner.classList.add("releasing");
      const el = inner;
      setTimeout(() => el.classList.remove("releasing"), 180);
      last = null;
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  function open(v) {
    setNav((n) => [...n, v]);
  }
  function back() {
    setNav((n) => (n.length > 1 ? n.slice(0, -1) : [{ name: "home" }]));
  }
  function home() {
    setNav([{ name: "home" }]);
  }

  const salonCode = new URLSearchParams(window.location.search).get("salon");
  const showNav = session?.seenWelcome && !["thread", "setup"].includes(view.name);

  return (
    <div className={`desk ${wallpaper ? "has-wall" : ""}`}>
      {wallpaper && (
        <>
          <div className="wall" style={{ backgroundImage: `url(${wallpaper})` }} />
          <div className="wall-scrim" />
        </>
      )}
      <div className="wax" />
      <div className="app-shell">
        {!session || !session.seenWelcome ? (
          <div className="mx-auto grid min-h-dvh w-full lg:grid-cols-[0.9fr_560px]">
            <aside className="hidden flex-col justify-between p-10 lg:flex">
              <LogoMark size={200} />
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em]">Lomé · salon</p>
              <div>
                <p className="display text-7xl leading-[0.85]">Love<br />or<br />Friendship</p>
                <p className="italic-soft mt-4 text-3xl text-[var(--rose)]">Toujours souriant.</p>
                <p className="mt-4 max-w-sm text-sm text-muted">
                  {tr("Un salon de jeux pour l'amour, l'amitié, et tout ce qu'il y a entre les deux.", "A game salon for love, friendship, and everything in between.")}
                </p>
              </div>
              <p className="text-xs text-muted">6 {tr("jeux à la table", "games on the table")} · 116 {tr("dans la bibliothèque", "in the library")}</p>
            </aside>
            <AuthScreens />
          </div>
        ) : (
          <>
            {salonCode && view.name === "home" && (
              <div className="mx-auto mt-3 w-[min(720px,calc(100%-16px))] rounded-2xl border-2 border-[var(--line)] bg-[var(--card)] px-4 py-3 text-sm">
                {tr("Code salon", "Salon code")} <b>{salonCode}</b>. {tr("Ouvre Jouer, choisis En ligne, puis Rejoindre.", "Open Play, choose Online, then Join.")}
                <button type="button" className="ml-2 underline" onClick={() => open({ name: "setup", salon: salonCode })}>{tr("Rejoindre", "Join")}</button>
              </div>
            )}
            {view.name === "home" && <NeonHome onOpen={open} />}
            {view.name === "games" && <GamesHub onOpen={open} />}
            {view.name === "shop" && <Shop onOpen={open} />}
            {view.name === "friends" && <Friends onBack={back} onOpen={open} />}
            {view.name === "chats" && <Chats onBack={back} onOpen={open} />}
            {view.name === "thread" && <Thread chatId={view.chatId} onBack={back} />}
            {view.name === "profile" && <Profile onOpen={open} />}
            {view.name === "account" && <Account onBack={back} onOpen={open} />}
            {view.name === "settings" && <Settings onOpen={open} />}
            {view.name === "avis" && <Avis onBack={back} />}
            {view.name === "archive" && <Archive onBack={back} onOpen={open} />}
            {view.name === "admin" && session.role === "admin" && <Admin onBack={back} />}
            {view.name === "admin" && session.role !== "admin" && (
              <div className="mx-auto max-w-xl px-4 pt-16">
                <p className="display text-3xl">{tr("Accès refusé", "Access refused")}</p>
                <button type="button" className="mt-4 underline" onClick={back}>{tr("Retour", "Back")}</button>
              </div>
            )}
            {view.name === "setup" && <PlayFlow gameId={view.gameId || null} salonCode={view.salon || salonCode} onBack={back} />}
            {showNav && (
              <nav className="bottom-nav" aria-label={tr("Navigation", "Navigation")}>
                <NavBtn icon="home" label={tr("Accueil", "Home")} onClick={() => setNav([{ name: "home" }])} active={view.name === "home"} />
                <NavBtn icon="dice" label={tr("Jeux", "Games")} onClick={() => setNav([{ name: "games" }])} active={view.name === "games" || view.name === "setup"} />
                <NavBtn icon="users" label={tr("Amis", "Friends")} onClick={() => setNav([{ name: "friends" }])} active={view.name === "friends"} />
                <NavBtn icon="chat" label={tr("Messages", "Messages")} onClick={() => setNav([{ name: "chats" }])} active={view.name === "chats" || view.name === "thread"} />
                <NavBtn icon="user" label={tr("Profil", "Profile")} onClick={() => setNav([{ name: "profile" }])} active={view.name === "profile" || view.name === "account" || view.name === "shop" || view.name === "settings"} />
              </nav>
            )}
            {menu && <MenuSheet onClose={() => setMenu(false)} onOpen={open} />}
          </>
        )}
      </div>
      <Toasts items={toasts} />
    </div>
  );
}

function NavBtn({ icon, label, onClick, active }) {
  return (
    <button type="button" className={`nav-btn pressable ${active ? "on" : ""}`} onClick={onClick}>
      <span className="zoom-inner"><Icon name={icon} size={20} /> {label}</span>
    </button>
  );
}
