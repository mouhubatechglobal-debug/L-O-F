import { useEffect, useRef, useState } from "react";
import { Kitten, Petals } from "./components/Kitten.jsx";
import { AvatarEditor, defaultAvatar } from "./components/Avatar.jsx";
import { Btn, Field } from "./components/Ui.jsx";
import { LogoMark } from "./components/Icons.jsx";
import { useStore } from "./store.jsx";

const SEXES = ["Femme", "Homme", "Autre", "Ne pas dire"];

export function AuthScreens() {
  const store = useStore();
  const { session, tr } = store;
  if (session && !session.seenWelcome) return <Welcome />;
  if (session) return null;
  return <AuthFlow />;
}

function AuthFlow() {
  const { tr, register, login, pseudoTaken, emailTaken } = useStore();
  const [step, setStep] = useState("landing");
  const [draft, setDraft] = useState({
    prenom: "",
    nom: "",
    email: "",
    password: "",
    sexe: "",
    pseudo: "",
    avatar: null,
  });
  const [errors, setErrors] = useState({});
  const [pwdFocus, setPwdFocus] = useState(false);
  const [formOn, setFormOn] = useState(false);
  const [spark, setSpark] = useState(false);
  const [pos, setPos] = useState({ x: -120, y: 280 });
  const [moving, setMoving] = useState(false);
  const [dir, setDir] = useState(1);
  const [hop, setHop] = useState(0);
  const [look, setLook] = useState({ x: 0.4, y: 0.2 });
  const stageRef = useRef(null);
  const frameRef = useRef(null);
  const prev = useRef(pos);

  function walkTo(next, ms = 1450) {
    setDir(next.x >= prev.current.x ? 1 : -1);
    setMoving(true);
    setPos(next);
    prev.current = next;
    window.setTimeout(() => setMoving(false), ms);
  }

  function placeAt(next) {
    setPos(next);
    prev.current = next;
    setMoving(false);
  }

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stage = stageRef.current;
    if (!stage) return;
    const sr = stage.getBoundingClientRect();
    if (step === "landing") {
      const target = { x: Math.min(sr.width - 110, sr.width * 0.62), y: 168 };
      if (reduce) placeAt(target);
      else {
        placeAt({ x: -110, y: 210 });
        const t = setTimeout(() => walkTo(target), 60);
        return () => clearTimeout(t);
      }
    }
    if (step === "register") {
      const frame = frameRef.current;
      if (!frame) return;
      const fr = frame.getBoundingClientRect();
      const start = { x: -100, y: fr.bottom - sr.top - 78 };
      const corner = { x: fr.right - sr.left - 36, y: fr.bottom - sr.top - 78 };
      const perch = { x: fr.left - sr.left - 28, y: fr.top - sr.top - 36 };
      if (reduce) {
        placeAt(perch);
        setFormOn(true);
        return;
      }
      placeAt(start);
      setFormOn(false);
      const t1 = setTimeout(() => walkTo(corner, 1500), 80);
      const t2 = setTimeout(() => {
        setFormOn(true);
        setSpark(true);
      }, 1650);
      const t3 = setTimeout(() => walkTo(perch, 1100), 2000);
      const t4 = setTimeout(() => setDir(1), 3200);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    }
    if (step === "pseudo" || step === "login") {
      const target = { x: 8, y: 78 };
      walkTo(target, 900);
    }
    if (step === "welcome") {
      placeAt({ x: -120, y: 48 });
      const t = setTimeout(() => walkTo({ x: 6, y: 36 }, 1100), 40);
      return () => clearTimeout(t);
    }
    if (step === "avatar") {
      walkTo({ x: 12, y: 70 }, 800);
    }
  }, [step]);

  function submitRegister(e) {
    e.preventDefault();
    const next = {};
    if (!draft.prenom.trim()) next.prenom = tr("Le prénom est obligatoire.", "First name is required.");
    if (!draft.nom.trim()) next.nom = tr("Le nom est obligatoire.", "Last name is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) next.email = tr("Email invalide.", "Invalid email.");
    else if (emailTaken(draft.email)) next.email = tr("Cet email a déjà un compte ici.", "This email already has an account here.");
    if (draft.password.length < 8) next.password = tr("8 caractères minimum.", "8 characters minimum.");
    if (!draft.sexe) next.sexe = tr("Choisis une option.", "Pick an option.");
    setErrors(next);
    if (Object.keys(next).length) {
      setHop((n) => n + 1);
      return;
    }
    setStep("pseudo");
  }

  function submitPseudo(e) {
    e.preventDefault();
    const pseudo = draft.pseudo.trim();
    if (!/^[A-Za-zÀ-ÿ0-9_]{3,16}$/.test(pseudo)) {
      setErrors({ pseudo: tr("3 à 16 lettres, chiffres ou _.", "3 to 16 letters, numbers or _.") });
      return;
    }
    if (pseudoTaken(pseudo)) {
      setErrors({ pseudo: tr("Ce pseudo-name est déjà dans le salon.", "This nickname is already in the salon.") });
      setHop((n) => n + 1);
      return;
    }
    setDraft((d) => ({ ...d, pseudo }));
    setStep("welcome");
  }

  async function finish(avatar) {
    const res = await register({ ...draft, avatar: avatar || null, seenWelcome: true });
    if (res?.error) setStep(res.error === "pseudo" ? "pseudo" : "register");
  }

  if (step === "landing") {
    return (
      <div ref={stageRef} className="relative min-h-dvh">
        <Landing onRegister={() => setStep("register")} onLogin={() => setStep("login")} tr={tr} />
        <Kitten mode={moving ? "walk" : "wave"} lookX={look.x} lookY={look.y} hop={hop} dir={dir} style={{ left: pos.x, top: pos.y }} />
      </div>
    );
  }

  return (
    <div ref={stageRef} className="relative mx-auto min-h-dvh w-full max-w-xl px-4 pb-10 pt-6">
      <Kitten
        mode={moving ? "walk" : step === "welcome" ? "wave" : "sit"}
        covering={pwdFocus}
        lookX={look.x}
        lookY={look.y}
        hop={hop}
        dir={dir}
        style={{ left: pos.x, top: pos.y }}
      />
      {step === "register" && (
        <section className="pt-6">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Love or Friendship</p>
          <h1 className="display mt-2 text-center text-4xl leading-none">{tr("Inscription", "Sign up")}</h1>
          <p className="mx-auto mt-2 max-w-sm text-center text-sm text-muted">
            {tr("Le chaton ouvre le cadre. Il sourit toujours, et ferme les yeux pour ton mot de passe.", "The kitten opens the frame. It always smiles, and covers its eyes for your password.")}
          </p>
          <div ref={frameRef} className={`stamp stage-frame relative mt-6 min-h-[430px] rounded-[28px] p-4 ${formOn ? "pt-16" : "pt-8"}`}>
            {spark && (
              <>
                <span className="spark" style={{ right: 8, bottom: 8 }} />
                <span className="spark" style={{ right: 22, bottom: 18, background: "var(--leaf)", animationDelay: ".1s" }} />
              </>
            )}
            {!formOn ? (
              <div className="grid min-h-[360px] place-items-center text-center text-sm text-muted">
                {tr("Le chaton marche vers l'angle…", "The kitten is walking to the corner…")}
              </div>
            ) : (
              <form onSubmit={submitRegister} className="space-y-3">
                <div className="field-in grid grid-cols-2 gap-3">
                  <Field label={tr("Prénom", "First name")} error={errors.prenom}>
                    <input className="field" value={draft.prenom} onChange={(e) => setDraft({ ...draft, prenom: e.target.value })} onFocus={() => setLook({ x: -0.2, y: 0.4 })} />
                  </Field>
                  <Field label={tr("Nom", "Last name")} error={errors.nom}>
                    <input className="field" value={draft.nom} onChange={(e) => setDraft({ ...draft, nom: e.target.value })} onFocus={() => setLook({ x: 0.6, y: 0.4 })} />
                  </Field>
                </div>
                <div className="field-in" style={{ animationDelay: ".08s" }}>
                  <Field label="Email" error={errors.email}>
                    <input className="field" type="email" autoComplete="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} onFocus={() => setLook({ x: 0.2, y: 0.7 })} />
                  </Field>
                </div>
                <div className="field-in" style={{ animationDelay: ".14s" }}>
                  <Field label={tr("Mot de passe", "Password")} error={errors.password}>
                    <input
                      className="field"
                      type="password"
                      autoComplete="new-password"
                      value={draft.password}
                      onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                      onFocus={() => { setPwdFocus(true); setLook({ x: 0.1, y: 0.8 }); }}
                      onBlur={() => setPwdFocus(false)}
                    />
                  </Field>
                </div>
                <div className="field-in" style={{ animationDelay: ".2s" }}>
                  <div className="label">{tr("Sexe", "Gender")}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {SEXES.map((s) => (
                      <button type="button" key={s} className={`pressable rounded-xl border-2 px-2 py-2 text-sm ${draft.sexe === s ? "stamp-ink" : "border-[var(--line)]"}`} onClick={() => setDraft({ ...draft, sexe: s })}>
                        <span className="zoom-inner">{s}</span>
                      </button>
                    ))}
                  </div>
                  {errors.sexe && <span className="mt-1 block text-sm text-[var(--danger)]">{errors.sexe}</span>}
                </div>
                <button type="button" className="text-xs underline" onClick={() => setDraft({ ...draft, prenom: "Afi", nom: "Lawson", email: "afi@salon.love", password: "plaisir", sexe: "Femme" })}>
                  {tr("Remplir un exemple", "Fill an example")}
                </button>
                <Btn type="submit" className="field-in w-full" style={{ animationDelay: ".26s" }}>{tr("Suivant", "Next")}</Btn>
              </form>
            )}
          </div>
          <button type="button" className="mt-4 text-sm underline" onClick={() => setStep("landing")}>{tr("Retour", "Back")}</button>
        </section>
      )}
      {step === "pseudo" && (
        <section className="pt-28">
          <h1 className="display text-4xl leading-none">{tr("Ton pseudo-name", "Your nickname")}</h1>
          <p className="mt-2 text-sm text-muted">{tr("Deux personnes ne peuvent pas partager le même pseudo-name.", "Two people cannot share the same nickname.")}</p>
          <form onSubmit={submitPseudo} className="mt-6 space-y-4">
            <Field label="Pseudo-name" error={errors.pseudo} hint={draft.pseudo ? `@${draft.pseudo}` : "@…"}>
              <input className="field text-lg" value={draft.pseudo} onChange={(e) => setDraft({ ...draft, pseudo: e.target.value.replace(/\s/g, "") })} onFocus={() => setLook({ x: 0.8, y: 0.2 })} autoFocus />
            </Field>
            <Btn type="submit" className="w-full">{tr("Suivant", "Next")}</Btn>
          </form>
        </section>
      )}
      {step === "login" && (
        <Login
          tr={tr}
          login={login}
          onBack={() => setStep("landing")}
          onPassword={setPwdFocus}
          onDodge={() => setHop((n) => n + 1)}
          onLook={setLook}
        />
      )}
      {step === "welcome" && (
        <section className="relative pt-28">
          <Petals />
          <div className="bubble max-w-md">
            <p className="display text-[1.65rem] leading-snug">
              « Bienvenu, dans l'univers du plaisir, Nous vous souhaitons une bonne aventure »
            </p>
            <p className="mt-2 text-sm text-muted">@{draft.pseudo}</p>
          </div>
          <div className="mt-8 flex flex-col gap-3">
            <Btn onClick={() => setStep("avatar")}>{tr("Créer mon avatar", "Create my avatar")}</Btn>
            <Btn kind="ghost" onClick={() => finish(null)}>{tr("Plus tard", "Later")}</Btn>
          </div>
        </section>
      )}
      {step === "avatar" && (
        <section className="pt-28">
          <h1 className="display text-4xl">{tr("Ton avatar", "Your avatar")}</h1>
          <div className="stamp mt-4 rounded-3xl p-4">
            <AvatarEditor value={draft.avatar || defaultAvatar()} onChange={(avatar) => setDraft({ ...draft, avatar })} tr={tr} />
            <Btn className="mt-4 w-full" onClick={() => finish(draft.avatar || defaultAvatar())}>{tr("Entrer dans le salon", "Enter the salon")}</Btn>
          </div>
        </section>
      )}
    </div>
  );
}

function Landing({ onRegister, onLogin, tr }) {
  return (
    <div className="splash" style={{ backgroundImage: "url(/art-splash.jpg)" }}>
      <div className="relative z-10 mx-auto w-full max-w-md text-center text-white">
        <LogoMark size={120} />
        <h1 className="mt-3 text-4xl font-extrabold leading-none">Love or Friendship</h1>
        <p className="mt-2 text-sm text-[#f3d7ea]">{tr("Joue · Rencontre · Partage", "Play · Meet · Share")}</p>
        <button type="button" className="pink-btn mt-6 w-full" onClick={onRegister}>{tr("Commencer", "Start")}</button>
        <button type="button" className="mt-3 text-sm font-bold text-white/80" onClick={onLogin}>{tr("J'ai déjà un compte", "I already have an account")}</button>
      </div>
    </div>
  );
}

function Login({ tr, login, onBack, onPassword, onDodge, onLook }) {
  const { checkLogin } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (password.length < 8 || !email.includes("@")) {
      setOk(false);
      return undefined;
    }
    let cancel = false;
    const timer = setTimeout(async () => {
      const match = await checkLogin(email, password);
      if (!cancel) setOk(match);
    }, 280);
    return () => {
      cancel = true;
      clearTimeout(timer);
    };
  }, [email, password, checkLogin]);

  useEffect(() => {
    if (ok) setPos({ x: 0, y: 0 });
  }, [ok]);

  function dodge() {
    onDodge();
    setPos((p) => {
      let x = (Math.random() > 0.5 ? 1 : -1) * (70 + Math.random() * 50);
      let y = (Math.random() > 0.5 ? 1 : -1) * (36 + Math.random() * 40);
      if (Math.abs(x - p.x) < 40) x = -x;
      return { x, y };
    });
  }

  async function tryNext(e) {
    e.preventDefault();
    const entered = await login(email, password);
    if (!entered) dodge();
  }

  return (
    <section className="pt-28">
      <h1 className="display text-4xl leading-none">{tr("Connexion", "Log in")}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        {tr("Changement de téléphone ? Le bouton Suivant s'échappe tant que le compte n'est pas reconnu.", "New phone? Next slips away until the account is recognized.")}
      </p>
      <form onSubmit={tryNext} className="mt-6 space-y-3">
        <Field label="Email">
          <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => onLook({ x: 0.7, y: 0.3 })} autoComplete="username" />
        </Field>
        <Field label={tr("Mot de passe", "Password")}>
          <input
            className="field"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => { onPassword(true); onLook({ x: 0.5, y: 0.6 }); }}
            onBlur={() => onPassword(false)}
            autoComplete="current-password"
          />
        </Field>
        <div className="relative h-36">
          <button
            type="submit"
            className={`absolute left-1/2 top-8 -translate-x-1/2 rounded-2xl px-6 py-3 font-semibold transition-transform duration-200 ${ok ? "stamp-leaf" : "stamp-ink"}`}
            style={{ transform: `translate(calc(-50% + ${pos.x}px), ${pos.y}px)` }}
            onPointerDown={(e) => {
              if (!ok) {
                e.preventDefault();
                dodge();
              }
            }}
          >
            {ok ? tr("Suivant · compte reconnu", "Next · account found") : tr("Suivant", "Next")}
          </button>
        </div>
        <p className="sr-only" aria-live="polite">{ok ? tr("Informations correctes, bouton immobile.", "Details match, the button stays still.") : tr("Le bouton se déplace si les informations ne correspondent pas.", "The button moves if the details do not match.")}</p>
      </form>
      <button type="button" className="text-sm underline" onClick={onBack}>{tr("Retour", "Back")}</button>
    </section>
  );
}

function Welcome() {
  const { session, tr, markWelcome, updateProfile } = useStore();
  const [avatarOn, setAvatarOn] = useState(false);
  const [avatar, setAvatar] = useState(session.avatar || defaultAvatar());
  return (
    <div className="relative mx-auto min-h-dvh max-w-xl overflow-hidden px-4 pb-16 pt-8">
      <Petals />
      <div className="relative pt-4">
        <Kitten mode="wave" style={{ position: "relative", left: 0, top: 0 }} />
        <div className="bubble mt-2 max-w-md">
          <p className="display text-[1.7rem] leading-snug">
            « Bienvenu, dans l'univers du plaisir, Nous vous souhaitons une bonne aventure »
          </p>
          {session?.lang === "en" && (
            <p className="mt-2 text-sm text-muted">Welcome to the universe of delight. We wish you a good adventure.</p>
          )}
        </div>
        <p className="mt-6 text-sm text-muted">@{session?.pseudo}</p>
        {!avatarOn ? (
          <div className="mt-6 flex flex-col gap-3">
            <Btn onClick={() => setAvatarOn(true)}>{tr("Créer mon avatar", "Create my avatar")}</Btn>
            <Btn kind="ghost" onClick={markWelcome}>{tr("Plus tard", "Later")}</Btn>
          </div>
        ) : (
          <div className="stamp mt-6 rounded-3xl p-4">
            <AvatarEditor value={avatar} onChange={setAvatar} tr={tr} />
            <div className="mt-4 flex gap-2">
              <Btn className="flex-1" onClick={() => { updateProfile({ avatar }); markWelcome(); }}>{tr("Entrer dans le salon", "Enter the salon")}</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AvatarStep() {
  return null;
}
