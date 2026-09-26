import { useEffect, useMemo, useRef, useState } from "react";
import { games, gameById, CATS } from "./data/games.js";
import { TRUTHS, DARES, WHO, DILEMMAS, line } from "./data/prompts.js";
import { useStore } from "./store.jsx";
import { Btn } from "./components/Ui.jsx";
import { Icon } from "./components/Icons.jsx";
import { ScreenHead } from "./social.jsx";
import { SEEDS, personById } from "./data/seeds.js";
import { fx, setSoundMuted, soundMuted } from "./fx.js";
import { OnlineTable } from "./online.jsx";
import { Avatar } from "./components/Avatar.jsx";

const LEVELS = [
  ["doux", "Doux", "Gentle", "Tendre, tout public.", "Tender, for everyone."],
  ["malin", "Malin", "Clever", "Taquin, plus personnel.", "Teasing, more personal."],
  ["intense", "Intense", "Bold", "Audacieux, toujours bienveillant.", "Bold, still kind."],
];

export function PlayFlow({ gameId, salonCode, onBack }) {
  const store = useStore();
  const { tr, session, data, friendsOf, createRoom, joinRoom, rememberPlayers, markPlayed } = store;
  const openingLibrary = Boolean(gameId && !gameById(gameId)?.playable);
  const [step, setStep] = useState(openingLibrary ? "difficulty" : "mode");
  const [mode, setMode] = useState(openingLibrary ? "table" : "online");
  const [level, setLevel] = useState("doux");
  const [who, setWho] = useState("cpu");
  const [names, setNames] = useState([session.pseudo]);
  const [pickedId, setPickedId] = useState(gameId || null);
  const [category, setCategory] = useState("amour");
  const [invited, setInvited] = useState([]);
  const [room, setRoom] = useState(null);
  const [starter, setStarter] = useState(0);
  const [copied, setCopied] = useState("");
  const [joinCode, setJoinCode] = useState(salonCode || "");

  const game = gameById(pickedId);
  const friends = friendsOf();

  function goWho() {
    setStep("who");
  }
  function begin(nextWho = who, playerNames = names) {
    const count = nextWho === "cpu" ? 2 : Math.max(playerNames.filter(Boolean).length, 2);
    setStarter(Math.floor(Math.random() * count));
    setStep("starter");
  }
  function afterPlayers() {
    const clean = names.map((n) => n.trim()).filter(Boolean);
    if (new Set(clean.map((n) => n.toLowerCase())).size !== clean.length) return;
    rememberPlayers(clean);
    setNames(clean);
    if (!pickedId) setStep("pick");
    else if (gameById(pickedId)?.kind === "verite") setStep("category");
    else begin("local", clean);
  }
  async function startOnline() {
    const created = await createRoom({ gameId: pickedId, difficulty: level, invites: invited, category });
    if (!created?.id) return;
    setRoom(created);
    setStep("table");
  }
  async function joinOnline() {
    const joined = await joinRoom(joinCode);
    if (!joined?.id) return;
    setRoom(joined);
    setPickedId(joined.gameId || pickedId);
    setStep("table");
  }

  if (step === "table" && room?.id) {
    return <OnlineTable roomId={room.id} onBack={() => setStep("lobby")} />;
  }

  if (step === "play" && game?.playable) {
    const players = who === "cpu"
      ? [{ id: "me", name: session.pseudo, cpu: false }, { id: "cpu", name: tr("L'ordinateur", "The computer"), cpu: true }]
      : names.map((n, i) => ({ id: `p${i}`, name: n, cpu: false }));
    return (
      <GameRunner
        game={game}
        players={players}
        starter={starter}
        level={level}
        category={category}
        tr={tr}
        lang={session.lang || "fr"}
        onBack={onBack}
        onPlayed={markPlayed}
      />
    );
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-xl pb-28">
      <ScreenHead title={game ? tr(game.title, game.titleEn) : tr("Jouer", "Play")} onBack={onBack} />
      <div className="space-y-4 px-4">
        {step === "mode" && (
          <>
            <h2 className="display text-3xl">{tr("Comment on joue ?", "How do we play?")}</h2>
            <Choice title={tr("À la table", "At the table")} text={tr("Sur cet écran, tout de suite. Ordinateur ou plusieurs personnes.", "On this screen, right now. Computer or several people.")} onClick={() => { setMode("table"); setStep("difficulty"); }} />
            <Choice title={tr("En ligne", "Online")} text={tr("Invite sur l'app ou par WhatsApp.", "Invite in the app or on WhatsApp.")} onClick={() => { setMode("online"); setStep(pickedId ? "lobby" : "pick"); }} />
            <Choice title={tr("Hors ligne", "Offline")} text={tr("Bientôt — lorsque le site sera une application réelle.", "Soon — when the site becomes a real app.")} onClick={() => { setMode("soon"); setStep("offline-soon"); }} />
          </>
        )}
        {step === "offline-soon" && (
          <article className="stamp rounded-3xl p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{tr("Bientôt", "Soon")}</p>
            <h2 className="display mt-2 text-3xl">{tr("Hors ligne", "Offline")}</h2>
            <p className="mt-3 text-sm leading-relaxed">
              {tr(
                "Le mode hors ligne arrivera lorsque le site sera transformé en application réelle. En attendant, la partie se joue en ligne.",
                "Offline mode will arrive when the site becomes a real app. Until then, play online."
              )}
            </p>
            <Btn className="mt-4 w-full" onClick={() => { setMode("table"); setStep("difficulty"); }}>{tr("Jouer à la table", "Play at the table")}</Btn>
          </article>
        )}
        {step === "difficulty" && (
          <>
            <h2 className="display text-3xl">{tr("Niveau de difficulté", "Difficulty")}</h2>
            {LEVELS.map(([id, fr, en, dfr, den]) => (
              <Choice key={id} title={tr(fr, en)} text={tr(dfr, den)} onClick={() => { setLevel(id); if (mode === "table") goWho(); else setStep("lobby"); }} />
            ))}
          </>
        )}
        {step === "who" && (
          <>
            <h2 className="display text-3xl">{tr("Avec qui ?", "With whom?")}</h2>
            <Choice title={tr("Avec l'ordinateur", "With the computer")} text={tr("Le premier coup est tiré au sort.", "The first move is random.")} onClick={() => { setWho("cpu"); if (!pickedId) setStep("pick"); else if (game?.kind === "verite") setStep("category"); else begin("cpu"); }} />
            <Choice title={tr("Entre plusieurs personnes", "Several people")} text={tr("2, 3, 4… sur le même écran.", "2, 3, 4… on the same screen.")} onClick={() => { setWho("local"); setStep("players"); }} />
          </>
        )}
        {step === "players" && (
          <PlayerManager tr={tr} names={names} setNames={setNames} recent={data.recentPlayers} onNext={afterPlayers} />
        )}
        {step === "pick" && (
          <>
            <h2 className="display text-3xl">{tr("Choisis un jeu", "Pick a game")}</h2>
            <div className="grid gap-2">
              {games.filter((g) => g.playable).map((g) => (
                <Choice key={g.id} title={tr(g.title, g.titleEn)} text={tr(g.blurb, g.blurbEn)} onClick={() => {
                  setPickedId(g.id);
                  if (mode === "online") setStep("lobby");
                  else if (g.kind === "verite") setStep("category");
                  else begin(who);
                }} />
              ))}
            </div>
            <p className="text-xs text-muted">{tr("Le reste du catalogue s'ouvrira ici à l'étape suivante.", "The rest of the catalog will open here in the next stage.")}</p>
          </>
        )}
        {step === "category" && (
          <>
            <h2 className="display text-3xl">{tr("Choix de catégorie", "Pick a category")}</h2>
            {[
              ["amour", "Amour", "Love"],
              ["amitie", "Amitié", "Friendship"],
              ["fun", "Fun", "Fun"],
              ["audace", "Audace", "Bold"],
            ].map(([id, fr, en]) => (
              <Choice key={id} title={tr(fr, en)} text={tr("Vérités et gages de cette couleur.", "Truths and dares in this color.")} onClick={() => { setCategory(id); begin(who); }} />
            ))}
          </>
        )}
        {step === "lobby" && (
          <Lobby
            tr={tr}
            friends={friends}
            users={data.users}
            invited={invited}
            setInvited={setInvited}
            pickedId={pickedId}
            onNeedGame={() => setStep("pick")}
            onNeedLevel={() => setStep("difficulty")}
            level={level}
            room={room}
            copied={copied}
            setCopied={setCopied}
            joinCode={joinCode}
            setJoinCode={setJoinCode}
            onJoin={joinOnline}
            onStart={startOnline}
          />
        )}
        {step === "starter" && (
          <Starter
            tr={tr}
            name={who === "cpu"
              ? (starter === 0 ? session.pseudo : tr("L'ordinateur", "The computer"))
              : names[starter] || session.pseudo}
            onGo={() => setStep("play")}
          />
        )}
        {game && !game.playable && step === "mode" && <SoonNote tr={tr} />}
      </div>
    </div>
  );
}

function Choice({ title, text, onClick }) {
  return (
    <button type="button" onClick={onClick} className="pressable stamp w-full rounded-3xl p-4 text-left">
      <span className="zoom-inner block justify-start">
        <span>
          <span className="display block text-2xl leading-none">{title}</span>
          <span className="mt-1 block text-sm text-muted">{text}</span>
        </span>
      </span>
    </button>
  );
}

function PlayerManager({ tr, names, setNames, recent, onNext }) {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  const dup = new Set(clean.map((n) => n.toLowerCase())).size !== clean.length;
  return (
    <div>
      <h2 className="display text-3xl">{tr("Gestion des joueurs", "Player management")}</h2>
      <p className="mt-1 text-sm text-muted">{tr("Ajoute autant de noms que vous êtes. Deux joueurs ne peuvent pas porter le même nom.", "Add as many names as there are people. Two players cannot share a name.")}</p>
      <div className="mt-4 space-y-2">
        {names.map((n, i) => (
          <div key={i} className="flex gap-2">
            <input className="field" value={n} onChange={(e) => setNames(names.map((x, idx) => idx === i ? e.target.value : x))} placeholder={`${tr("Joueur", "Player")} ${i + 1}`} />
            {names.length > 1 && <button type="button" className="pressable rounded-2xl border-2 px-3" onClick={() => setNames(names.filter((_, idx) => idx !== i))} aria-label={tr("Retirer", "Remove")}><span className="zoom-inner"><Icon name="close" /></span></button>}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="pressable stamp-ink rounded-full px-4 py-2 text-sm" onClick={() => setNames([...names, ""])}><span className="zoom-inner">+ {tr("Ajouter", "Add")}</span></button>
        {recent.filter((r) => !names.includes(r)).slice(0, 6).map((r) => (
          <button key={r} type="button" className="rounded-full border-2 px-3 py-1 text-sm" onClick={() => setNames([...names, r])}>{r}</button>
        ))}
      </div>
      {dup && <p className="mt-2 text-sm text-[var(--danger)]">{tr("Chaque nom doit être unique.", "Each name must be unique.")}</p>}
      <Btn className="mt-4 w-full" disabled={clean.length < 2 || dup} onClick={onNext}>{tr("Suivant", "Next")}</Btn>
    </div>
  );
}

function Lobby({ tr, friends, users, invited, setInvited, pickedId, onNeedGame, onNeedLevel, level, onStart, copied, setCopied, room, joinCode, setJoinCode, onJoin }) {
  const code = room?.code || "";
  const link = code ? `${window.location.origin}${window.location.pathname}?salon=${code}` : "";
  const message = code
    ? tr(
      `Rejoins-moi dans le salon Love or Friendship. Code : ${code}. ${link}`,
      `Join me in the Love or Friendship salon. Code: ${code}. ${link}`
    )
    : "";
  const wa = message ? `https://wa.me/?text=${encodeURIComponent(message)}` : "";
  return (
    <div className="space-y-3">
      <div className="mode-card">
        <img src="/art-love.jpg" alt="" />
        <div className="cap">
          <b className="block text-2xl">{tr("Partie en ligne", "Online match")}</b>
          <span className="text-sm">{tr("Le code vient du serveur.", "The code comes from the server.")}</span>
        </div>
      </div>
      <h2 className="display text-3xl">{tr("Partie en ligne", "Online match")}</h2>
      <p className="text-sm text-muted">{tr("Le code vient du serveur. Deux comptes rejoignent la table, puis l'hôte lance. Le score n'est pas décidé ici.", "The code comes from the server. Two accounts join the table, then the host starts. The score is not decided here.")}</p>
      <div className="stamp rounded-3xl p-4">
        <div className="text-xs uppercase tracking-wider text-muted">{tr("Code", "Code")}</div>
        <div className="display text-4xl">{code || "—"}</div>
        <div className="mt-2 text-sm">{tr("Niveau", "Level")} : {level} · {pickedId || tr("jeu à choisir", "game to pick")}</div>
      </div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); onJoin(); }}>
        <input className="field" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder={tr("Code reçu", "Received code")} />
        <Btn type="submit">{tr("Rejoindre", "Join")}</Btn>
      </form>
      {!pickedId && <Btn kind="ghost" onClick={onNeedGame}>{tr("Choisir le jeu", "Pick the game")}</Btn>}
      <Btn kind="ghost" onClick={onNeedLevel}>{tr("Changer le niveau", "Change level")}</Btn>
      <div className="label">{tr("Inviter sur l'app", "Invite in the app")}</div>
      {friends.length === 0 && <p className="text-sm text-muted">{tr("Aucun ami encore. Les profils du salon sont dans Amis.", "No friends yet. Salon profiles live in Friends.")}</p>}
      {friends.map((id) => {
        const p = personById(id, users) || SEEDS.find((s) => s.id === id);
        const on = invited.includes(id);
        return (
          <button key={id} type="button" className={`flex w-full items-center justify-between rounded-2xl border-2 px-3 py-2 ${on ? "stamp-ink" : ""}`} onClick={() => setInvited(on ? invited.filter((x) => x !== id) : [...invited, id])}>
            <span>@{p?.pseudo || id}</span>
            <span>{on ? tr("Invité", "Invited") : tr("Invitez", "Invite")}</span>
          </button>
        );
      })}
      {code && <a className="pressable stamp-leaf block rounded-2xl px-4 py-3 text-center font-semibold" href={wa} target="_blank" rel="noreferrer">{tr("Inviter via WhatsApp", "Invite via WhatsApp")}</a>}
      {code && <Btn kind="ghost" className="w-full" onClick={async () => {
        try { await navigator.clipboard.writeText(message); setCopied("ok"); } catch { setCopied(message); }
      }}>{tr("Copier le lien", "Copy the link")}</Btn>}
      {copied && copied !== "ok" && <p className="break-all text-xs">{copied}</p>}
      <Btn className="w-full" disabled={!pickedId} onClick={onStart}>{tr("Ouvrir la table", "Open the table")}</Btn>
    </div>
  );
}

function Starter({ tr, name, onGo }) {
  useEffect(() => {
    const t = setTimeout(onGo, 1600);
    return () => clearTimeout(t);
    // onGo only needs to fire once for this overlay
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="stamp rounded-[28px] p-6 text-center">
      <div className="text-xs uppercase tracking-[0.18em] text-muted">{tr("Le hasard a parlé", "Chance has spoken")}</div>
      <h2 className="display mt-2 text-4xl leading-none">{name}</h2>
      <p className="mt-2">{tr("commence.", "starts.")}</p>
      <Btn className="mt-5" onClick={onGo}>{tr("C'est parti", "Let's go")}</Btn>
    </div>
  );
}

function Soon({ game, tr, onBack }) {
  if (!game) return null;
  const cat = CATS.find((c) => c.id === game.cat);
  return (
    <div className="mx-auto min-h-dvh max-w-xl pb-28">
      <ScreenHead title={tr(game.title, game.titleEn)} onBack={onBack} />
      <article className="mx-4 stamp rounded-3xl p-5">
        <div className="text-xs uppercase tracking-wider text-muted">{cat ? tr(cat.fr, cat.en) : ""} · {game.players} · {game.minutes} min</div>
        <p className="mt-3 text-lg">{tr(game.blurb, game.blurbEn)}</p>
        <p className="mt-3 text-sm text-muted">{tr("Cette règle se joue en tour de table.", "This ruleset is played as a table round.")}</p>
      </article>
    </div>
  );
}

function SoonNote() { return null; }

function GameRunner({ game, players, starter, level, category, tr, lang, onBack, onPlayed }) {
  useEffect(() => {
    onPlayed?.(game.id);
  }, [game.id]);
  if (game.kind === "verite") return <Verite players={players} starter={starter} level={level} category={category} tr={tr} lang={lang} onBack={onBack} />;
  if (game.kind === "qui") return <Qui players={players} starter={starter} level={level} tr={tr} lang={lang} onBack={onBack} />;
  if (game.kind === "morpion") return <Morpion players={players} starter={starter} level={level} tr={tr} onBack={onBack} />;
  if (game.kind === "memoire") return <Memoire players={players} starter={starter} level={level} tr={tr} onBack={onBack} />;
  if (game.kind === "dilemme") return <Dilemme players={players} starter={starter} tr={tr} lang={lang} onBack={onBack} />;
  if (game.kind === "pierre") return <Pierre players={players} starter={starter} level={level} tr={tr} onBack={onBack} />;
  return <TourDeTable game={game} players={players} starter={starter} level={level} tr={tr} lang={lang} onBack={onBack} />;
}

function promptBag(game, level) {
  const cat = ["amour", "amitie", "fun", "audace"].includes(game.cat) ? game.cat : game.cat === "amitie" ? "amitie" : "fun";
  const truths = TRUTHS[cat]?.[level] || TRUTHS.fun.doux;
  const dares = DARES[cat]?.[level] || DARES.fun.doux;
  return [...truths, ...dares];
}

function TourDeTable({ game, players, starter, level, tr, lang, onBack }) {
  const goal = 5;
  const [turn, setTurn] = useState(starter % players.length);
  const [scores, setScores] = useState(players.map(() => 0));
  const [card, setCard] = useState(null);
  const [done, setDone] = useState(false);
  const used = useRef(new Set());

  function draw() {
    const bag = promptBag(game, level);
    let index = Math.floor(Math.random() * bag.length);
    for (let n = 0; n < bag.length; n += 1) {
      const key = (index + n) % bag.length;
      if (!used.current.has(key)) {
        used.current.add(key);
        index = key;
        break;
      }
    }
    fx.flip();
    setCard(bag[index]);
  }
  function award(point) {
    const nextScores = scores.map((score, i) => (i === turn ? score + point : score));
    setScores(nextScores);
    if (nextScores[turn] >= goal) {
      setDone(true);
      return;
    }
    setCard(null);
    setTurn((turn + 1) % players.length);
    fx.tap();
  }

  return (
    <div className="table-play mx-auto min-h-dvh max-w-xl px-4 pb-28 pt-4">
      <Top tr={tr} title={tr(game.title, game.titleEn)} onBack={onBack} />
      <ScoreStrip players={players} scores={scores} turn={turn} />
      <p className="mb-3 text-sm text-muted">{tr(game.blurb, game.blurbEn)}</p>
      {!done && (
        <article className="stamp rounded-3xl p-5">
          <p className="text-xs uppercase tracking-wider text-muted">{players[turn].name}</p>
          {!card ? (
            <Btn className="mt-4 w-full" onClick={draw}>{tr("Tirer une carte", "Draw a card")}</Btn>
          ) : (
            <>
              <p className="display mt-3 text-3xl leading-tight">{line(card, lang)}</p>
              <div className="mt-4 grid gap-2">
                <Btn onClick={() => award(1)}>{tr("Fait, un point", "Done, one point")}</Btn>
                <Btn kind="ghost" onClick={() => award(0)}>{tr("Passer", "Pass")}</Btn>
              </div>
            </>
          )}
        </article>
      )}
      {done && <End tr={tr} name={players[turn].name} onBack={onBack} onAgain={() => { setScores(players.map(() => 0)); setCard(null); setDone(false); setTurn(starter % players.length); used.current = new Set(); }} />}
    </div>
  );
}

function ScoreStrip({ players, scores, turn }) {
  return (
    <div className="hide-scroll flex gap-2 overflow-x-auto pb-2">
      {players.map((p, i) => (
        <div key={p.id} className={`score-pill shrink-0 rounded-2xl px-3 py-2 text-sm ${i === turn ? "on" : ""}`}>
          <div className="font-semibold">{p.name}</div>
          <div>{scores[i] || 0} pts</div>
        </div>
      ))}
    </div>
  );
}

function Verite({ players, starter, level, category, tr, lang, onBack }) {
  const goal = 8;
  const [turn, setTurn] = useState(starter % players.length);
  const [scores, setScores] = useState(players.map(() => 0));
  const [phase, setPhase] = useState("choose");
  const [card, setCard] = useState(null);
  const [kind, setKind] = useState("verite");
  const [voteStep, setVoteStep] = useState(0);
  const [votes, setVotes] = useState([]);
  const [round, setRound] = useState(1);
  const used = useRef(new Set());
  const others = players.map((_, i) => i).filter((i) => i !== turn);
  const lead = Math.max(0, ...scores);

  function draw(k) {
    const bag = (k === "gage" ? DARES : TRUTHS)[category][level];
    let index = Math.floor(Math.random() * bag.length);
    for (let n = 0; n < bag.length; n += 1) {
      const key = `${k}-${(index + n) % bag.length}`;
      if (!used.current.has(key)) {
        used.current.add(key);
        index = (index + n) % bag.length;
        break;
      }
    }
    fx.flip();
    setKind(k);
    setCard(bag[index]);
    setPhase("deal");
    window.setTimeout(() => setPhase("card"), 720);
  }
  function startVote() {
    fx.tap();
    if (players.length === 1 || others.length === 0) {
      finish([2]);
      return;
    }
    if (players[others[0]]?.cpu && others.length === 1) {
      const cpuVote = level === "intense" ? 1 : 2;
      window.setTimeout(() => finish([cpuVote]), 420);
      setPhase("cpu");
      return;
    }
    setVotes([]);
    setVoteStep(0);
    setPhase("vote");
  }
  function cast(v) {
    fx.tap();
    const next = [...votes, v];
    if (voteStep + 1 >= others.length) finish(next);
    else {
      setVotes(next);
      setVoteStep(voteStep + 1);
    }
  }
  function finish(all) {
    const avg = all.reduce((a, b) => a + b, 0) / all.length;
    const gain = avg >= 1.5 ? 2 : avg >= 0.8 ? 1 : 0;
    if (gain >= 2) fx.good();
    else if (gain === 0) fx.bad();
    else fx.tap();
    const nextScores = scores.map((n, i) => (i === turn ? n + gain : n));
    setScores(nextScores);
    setPhase(nextScores[turn] >= goal ? "end" : "result");
    setCard((c) => ({ ...c, gain }));
  }
  function next() {
    if (round >= 8 || Math.max(...scores) >= goal) {
      fx.win();
      setPhase("end");
      return;
    }
    setRound(round + 1);
    setTurn((turn + 1) % players.length);
    setPhase("choose");
    setCard(null);
  }
  function again() {
    fx.tap();
    used.current = new Set();
    setScores(players.map(() => 0));
    setTurn(starter % players.length);
    setRound(1);
    setCard(null);
    setPhase("choose");
  }
  const voter = players[others[voteStep]];
  const ranking = players
    .map((p, i) => ({ name: p.name, score: scores[i] || 0 }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="table-play mx-auto min-h-dvh max-w-xl px-4 pb-28 pt-4">
      <Top tr={tr} title={tr("Vérité ou Gage", "Truth or Dare")} onBack={onBack} />
      <ScoreStrip players={players} scores={scores} turn={turn} />
      <div className="mb-3">
        <div className="mb-1 flex justify-between text-[11px] font-bold uppercase tracking-wider text-muted">
          <span>{tr("Manche", "Round")} {Math.min(round, 8)}/8 · {category}</span>
          <span>{tr("Premier à", "First to")} {goal}</span>
        </div>
        <div className="race"><span style={{ width: `${Math.min(100, (lead / goal) * 100)}%` }} /></div>
      </div>
      {phase === "choose" && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">{tr("À toi de choisir", "Your call")}</p>
          <h2 className="display text-4xl leading-none">{players[turn].name}</h2>
          <button type="button" className="pressable stamp choice-tile w-full rounded-3xl p-4" onClick={() => draw("verite")}>
            <span className="zoom-inner justify-start"><span><b className="display block text-2xl">{tr("Vérité", "Truth")}</b><span className="text-sm text-muted">{tr("Une question, dite à voix haute.", "A question, said out loud.")}</span></span></span>
          </button>
          <button type="button" className="pressable stamp-rose choice-tile w-full rounded-3xl p-4" onClick={() => draw("gage")}>
            <span className="zoom-inner justify-start"><span><b className="display block text-2xl">{tr("Gage", "Dare")}</b><span className="text-sm opacity-80">{tr("Un défi court, jamais méchant.", "A short dare, never mean.")}</span></span></span>
          </button>
          <Btn kind="ghost" className="w-full" onClick={() => draw(Math.random() > 0.5 ? "verite" : "gage")}>{tr("Laisser le hasard", "Leave it to chance")}</Btn>
        </div>
      )}
      {phase === "deal" && (
        <div className="deal-back stamp rounded-[28px]">
          <div className="text-center">
            <div className="display text-5xl">?</div>
            <p className="mt-2 text-sm">{tr("Le salon mélange les cartes…", "The room is shuffling…")}</p>
          </div>
        </div>
      )}
      {(phase === "card" || phase === "cpu") && card && (
        <div className="stamp rounded-[28px] p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--rose)]">{kind === "gage" ? tr("Gage", "Dare") : tr("Vérité", "Truth")}</div>
          <p className="display mt-3 text-3xl leading-tight">{line(card, lang)}</p>
          <div className="mt-5 grid gap-2">
            <Btn onClick={startVote} disabled={phase === "cpu"}>{phase === "cpu" ? tr("L'ordinateur juge…", "The computer is judging…") : tr("C'est fait — au vote", "Done — vote")}</Btn>
            <Btn kind="ghost" onClick={next}>{tr("Passer, sans point", "Pass, no point")}</Btn>
          </div>
        </div>
      )}
      {phase === "vote" && voter && (
        <div className="stamp rounded-[28px] p-5">
          <p className="text-sm text-muted">{tr("Passe le téléphone. Le vote reste caché.", "Pass the phone. The vote stays hidden.")}</p>
          <h2 className="display mt-1 text-3xl">{voter.name}</h2>
          <div className="mt-4 grid gap-2">
            <Btn onClick={() => cast(2)}>{tr("Bravo · 2 pts", "Bravo · 2 pts")}</Btn>
            <Btn kind="ghost" onClick={() => cast(1)}>{tr("Passable · 1 pt", "Fair · 1 pt")}</Btn>
            <Btn kind="danger" onClick={() => cast(0)}>{tr("Recalé · 0", "Not quite · 0")}</Btn>
          </div>
        </div>
      )}
      {phase === "result" && (
        <div className="stamp rounded-[28px] p-5 text-center">
          <div className="text-xs uppercase tracking-wider text-muted">{players[turn].name}</div>
          <div className="display text-6xl">+{card?.gain || 0}</div>
          <p className="mt-1 text-sm text-muted">
            {card?.gain >= 2 ? tr("Le salon valide.", "The room approves.") : card?.gain === 1 ? tr("Ça passe.", "That'll do.") : tr("On peut faire mieux.", "We can do better.")}
          </p>
          <Btn className="mt-4" onClick={next}>{tr("Manche suivante", "Next round")}</Btn>
        </div>
      )}
      {phase === "end" && (
        <End tr={tr} name={ranking[0]?.name} ranking={ranking} onBack={onBack} onAgain={again} />
      )}
    </div>
  );
}

function Qui({ players, starter, level, tr, lang, onBack }) {
  const deck = useMemo(() => [...WHO].sort(() => Math.random() - 0.5), []);
  const [idx, setIdx] = useState(0);
  const [turn, setTurn] = useState(starter % Math.max(players.length, 1));
  const [scores, setScores] = useState(players.map(() => 0));
  const [votes, setVotes] = useState([]);
  const [phase, setPhase] = useState("ask");
  if (players.length < 2) {
    return <div className="p-6">{tr("Ce jeu aime la compagnie : ajoute au moins 2 joueurs.", "This game likes company: add at least 2 players.")} <Btn onClick={onBack}>{tr("Retour", "Back")}</Btn></div>;
  }
  function cast(playerIndex) {
    const next = [...votes, playerIndex];
    if (next.length >= players.length) {
      const tally = players.map(() => 0);
      next.forEach((v) => { tally[v] += 1; });
      const winner = tally.indexOf(Math.max(...tally));
      setScores((s) => s.map((n, i) => i === winner ? n + 1 : n));
      setVotes(next);
      setPhase("reveal");
    } else setVotes(next);
  }
  function cpuOrNext() {
    if (players[votes.length]?.cpu) {
      const choice = Math.floor(Math.random() * players.length);
      cast(choice);
    }
  }
  const prompt = deck[idx % deck.length];
  const voter = players[votes.length];
  return (
    <div className="mx-auto min-h-dvh max-w-xl px-4 pb-28 pt-4">
      <Top tr={tr} title={tr("Qui est le plus ?", "Who is most likely?")} onBack={onBack} />
      <ScoreStrip players={players} scores={scores} turn={turn} />
      <div className="stamp rounded-[28px] p-5">
        <p className="text-xs uppercase tracking-wider text-muted">{tr("Qui est le plus susceptible de", "Who is most likely to")}</p>
        <h2 className="display mt-2 text-3xl leading-tight">{line(prompt, lang)} ?</h2>
      </div>
      {phase === "ask" && voter && !voter.cpu && (
        <div className="mt-4">
          <p className="mb-2 text-sm">{tr("Vote de", "Vote from")} {voter.name}</p>
          <div className="grid gap-2">
            {players.map((p, i) => (
              <Btn key={p.id} kind="ghost" onClick={() => cast(i)}>{p.name}</Btn>
            ))}
          </div>
        </div>
      )}
      {phase === "ask" && voter?.cpu && <Btn className="mt-4" onClick={cpuOrNext}>{tr("L'ordinateur vote", "The computer votes")}</Btn>}
      {phase === "reveal" && (
        <div className="mt-4 space-y-2">
          {players.map((p, i) => (
            <div key={p.id} className="flex items-center justify-between rounded-2xl border-2 px-3 py-2">
              <span>{p.name}</span>
              <b>{votes.filter((v) => v === i).length}</b>
            </div>
          ))}
          <Btn onClick={() => {
            if (idx >= 5) setPhase("end");
            else {
              setIdx(idx + 1);
              setVotes([]);
              setTurn((t) => (t + 1) % players.length);
              setPhase("ask");
            }
          }}>{idx >= 5 ? tr("Voir le salon", "See the room") : tr("Question suivante", "Next question")}</Btn>
        </div>
      )}
      {phase === "end" && <End tr={tr} name={players[scores.indexOf(Math.max(...scores))].name} onBack={onBack} />}
      <p className="mt-3 text-xs text-muted">{level === "intense" ? tr("Niveau intense : les questions piquent un peu plus.", "Bold level: the questions bite a little more.") : tr("Le vote est le cœur du jeu.", "The vote is the heart of the game.")}</p>
    </div>
  );
}

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
function winnerOf(b) {
  for (const line of LINES) {
    const [a, c, d] = line;
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { who: b[a], line };
  }
  if (b.every(Boolean)) return { who: "draw", line: [] };
  return null;
}
function bestMove(board, ai, human) {
  function score(b, player) {
    const w = winnerOf(b);
    if (w?.who === ai) return 10;
    if (w?.who === human) return -10;
    if (w?.who === "draw") return 0;
    let best = player === ai ? -99 : 99;
    for (let i = 0; i < 9; i++) if (!b[i]) {
      b[i] = player;
      const s = score(b, player === ai ? human : ai);
      b[i] = null;
      best = player === ai ? Math.max(best, s) : Math.min(best, s);
    }
    return best;
  }
  let choice = -1;
  let best = -99;
  for (let i = 0; i < 9; i++) if (!board[i]) {
    board[i] = ai;
    const s = score(board, human);
    board[i] = null;
    if (s > best) { best = s; choice = i; }
  }
  return choice;
}

function Morpion({ players, starter, level, tr, onBack }) {
  const duo = players.slice(0, 2);
  const marks = ["♥", "🌿"];
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState(starter % 2);
  const [win, setWin] = useState(null);

  useEffect(() => {
    if (win || !duo[turn]?.cpu) return undefined;
    const t = setTimeout(() => play(cpuIndex(board, level, turn)), 550);
    return () => clearTimeout(t);
  }, [turn, win]);

  function cpuIndex(b, lvl, cpuTurn) {
    const empty = b.map((v, i) => v ? null : i).filter((v) => v !== null);
    if (lvl === "doux") return empty[Math.floor(Math.random() * empty.length)];
    if (lvl === "intense") return bestMove([...b], marks[cpuTurn], marks[1 - cpuTurn]);
    const winMove = findTactical(b, marks[cpuTurn]);
    const block = findTactical(b, marks[1 - cpuTurn]);
    return winMove ?? block ?? empty[Math.floor(Math.random() * empty.length)];
  }
  function findTactical(b, mark) {
    for (let i = 0; i < 9; i++) if (!b[i]) {
      const n = [...b];
      n[i] = mark;
      if (winnerOf(n)?.who === mark) return i;
    }
    return null;
  }
  function play(i) {
    if (win || board[i] || i == null) return;
    const next = board.slice();
    next[i] = marks[turn];
    setBoard(next);
    fx.place();
    const w = winnerOf(next);
    if (w) setWin(w);
    else setTurn(1 - turn);
  }
  return (
    <div className="mx-auto min-h-dvh max-w-xl px-4 pb-28 pt-4">
      <Top tr={tr} title={tr("Morpion Cœur & Lien", "Heart & Link")} onBack={onBack} />
      {players.length > 2 && <p className="mb-2 text-sm text-muted">{tr("Ce duel se joue à 2. Les deux premiers noms sont sur le plateau.", "This duel is for 2. The first two names are on the board.")}</p>}
      <p className="mb-3">{duo[turn].name} · {marks[turn]} {duo[turn].cpu && !win ? tr("réfléchit…", "is thinking…") : ""}</p>
      <div className="grid grid-cols-3 gap-2">
        {board.map((cell, i) => (
          <button key={i} type="button" disabled={Boolean(win) || duo[turn].cpu} className={`board-cell pressable grid aspect-square place-items-center rounded-2xl border-2 border-[var(--line)] text-4xl ${win?.line?.includes(i) ? "stamp-rose" : ""}`} onClick={() => play(i)}>
            <span className={`zoom-inner ${cell ? "piece-pop" : ""}`}>{cell || ""}</span>
          </button>
        ))}
      </div>
      {win && <End tr={tr} name={win.who === "draw" ? tr("Match nul", "Draw") : duo[marks.indexOf(win.who)]?.name} subtitle={win.who === "draw" ? tr("Personne ne l'emporte.", "Nobody takes it.") : undefined} onBack={onBack} onAgain={() => { setBoard(Array(9).fill(null)); setTurn(starter % 2); setWin(null); fx.tap(); }} />}
    </div>
  );
}

const SYMBOLS = ["♥", "🌿", "★", "☽", "✉", "☕", "🔑", "☀", "⚓", "🎵"];

function Memoire({ players, starter, level, tr, onBack }) {
  const count = level === "intense" ? 10 : level === "malin" ? 8 : 6;
  const deck = useMemo(() => {
    const syms = SYMBOLS.slice(0, count);
    return [...syms, ...syms].sort(() => Math.random() - 0.5).map((s, i) => ({ id: i, s }));
  }, [count]);
  const [open, setOpen] = useState([]);
  const [found, setFound] = useState([]);
  const [turn, setTurn] = useState(starter % players.length);
  const [scores, setScores] = useState(players.map(() => 0));
  const [lock, setLock] = useState(false);
  const known = useMemo(() => ({}), []);
  const openRef = useRef([]);
  const foundRef = useRef([]);
  const lockRef = useRef(false);
  const turnRef = useRef(turn);
  turnRef.current = turn;

  useEffect(() => {
    if (!players[turn]?.cpu || lock || found.length === deck.length) return undefined;
    const t = setTimeout(() => cpuPlay(), 700);
    return () => clearTimeout(t);
  }, [turn, lock, found.length]);

  function remember(i) {
    const sym = deck[i].s;
    known[sym] = [...new Set([...(known[sym] || []), i])];
  }

  function cpuPlay() {
    const hidden = deck.map((_, i) => (foundRef.current.includes(i) ? null : i)).filter((v) => v !== null);
    const recall = level === "intense" ? 0.95 : level === "malin" ? 0.7 : 0.35;
    let pair = null;
    Object.values(known).forEach((idxs) => {
      const left = idxs.filter((i) => !foundRef.current.includes(i));
      if (left.length >= 2) pair = left;
    });
    if (pair && Math.random() < recall) {
      reveal(pair[0]);
      setTimeout(() => reveal(pair[1]), 520);
      return;
    }
    const first = hidden[Math.floor(Math.random() * hidden.length)];
    if (first == null) return;
    reveal(first);
    setTimeout(() => {
      const sym = deck[first].s;
      const mate = (known[sym] || []).find((i) => i !== first && !foundRef.current.includes(i) && !openRef.current.includes(i));
      const still = deck.map((_, i) => (foundRef.current.includes(i) || openRef.current.includes(i) ? null : i)).filter((v) => v != null);
      if (mate && Math.random() < recall) reveal(mate);
      else if (still.length) reveal(still[Math.floor(Math.random() * still.length)]);
    }, 560);
  }

  function reveal(i) {
    if (lockRef.current || foundRef.current.includes(i) || openRef.current.includes(i)) return;
    fx.flip();
    remember(i);
    const next = [...openRef.current, i];
    openRef.current = next;
    setOpen(next);
    if (next.length < 2) return;
    lockRef.current = true;
    setLock(true);
    const [a, b] = next;
    if (deck[a].s === deck[b].s) {
      fx.good();
      setTimeout(() => {
        foundRef.current = [...foundRef.current, a, b];
        setFound(foundRef.current);
        setScores((s) => s.map((n, idx) => (idx === turnRef.current ? n + 1 : n)));
        openRef.current = [];
        setOpen([]);
        lockRef.current = false;
        setLock(false);
      }, 480);
    } else {
      fx.bad();
      setTimeout(() => {
        openRef.current = [];
        setOpen([]);
        lockRef.current = false;
        setLock(false);
        setTurn((t) => (t + 1) % players.length);
      }, 720);
    }
  }

  const done = found.length === deck.length;
  return (
    <div className="table-play mx-auto min-h-dvh max-w-xl px-4 pb-28 pt-4">
      <Top tr={tr} title={tr("Mémoire des serments", "Memory of vows")} onBack={onBack} />
      <ScoreStrip players={players} scores={scores} turn={turn} />
      <div className="grid grid-cols-4 gap-2">
        {deck.map((c, i) => {
          const on = open.includes(i) || found.includes(i);
          return (
            <button key={c.id} type="button" className="mem-card aspect-square" onClick={() => !players[turn]?.cpu && reveal(i)} disabled={players[turn]?.cpu || lock}>
              <div className={`mem-inner ${on ? "on" : ""}`}>
                <div className="mem-face front">?</div>
                <div className="mem-face back text-2xl">{c.s}</div>
              </div>
            </button>
          );
        })}
      </div>
      {done && <End tr={tr} name={players[scores.indexOf(Math.max(...scores))].name} onBack={onBack} />}
    </div>
  );
}

function Dilemme({ players, starter, tr, lang, onBack }) {
  const [idx, setIdx] = useState(0);
  const [votes, setVotes] = useState([]);
  const [phase, setPhase] = useState("vote");
  const pair = DILEMMAS[idx % DILEMMAS.length];
  useEffect(() => {
    if (phase !== "vote") return undefined;
    const p = players[votes.length];
    if (!p?.cpu) return undefined;
    const t = setTimeout(() => cast(Math.random() > 0.5 ? 1 : 0), 450);
    return () => clearTimeout(t);
  }, [phase, votes.length]);
  function cast(side) {
    const next = [...votes, side];
    if (next.length >= players.length) {
      setVotes(next);
      setPhase("reveal");
    } else setVotes(next);
  }
  const left = votes.filter((v) => v === 0).length;
  const right = votes.filter((v) => v === 1).length;
  return (
    <div className="mx-auto min-h-dvh max-w-xl px-4 pb-28 pt-4">
      <Top tr={tr} title={tr("Dilemme à deux", "Two-way dilemma")} onBack={onBack} />
      {phase === "vote" && !players[votes.length]?.cpu && (
        <>
          <p className="mb-2 text-sm">{tr("Passe le téléphone à", "Pass the phone to")} {players[votes.length]?.name}. {tr("Le vote précédent est caché.", "The previous vote is hidden.")}</p>
          <div className="grid gap-3">
            <Btn onClick={() => cast(0)}>{line(pair[0], lang)}</Btn>
            <Btn kind="leaf" onClick={() => cast(1)}>{line(pair[1], lang)}</Btn>
          </div>
        </>
      )}
      {phase === "reveal" && (
        <div className="stamp rounded-[28px] p-5">
          <Bar label={line(pair[0], lang)} n={left} total={votes.length} />
          <Bar label={line(pair[1], lang)} n={right} total={votes.length} />
          <p className="mt-3 text-sm text-muted">{tr("Pas de mauvaise réponse. Le salon a parlé.", "No wrong answer. The room has spoken.")}</p>
          <Btn className="mt-4" onClick={() => {
            if (idx >= 5) setPhase("end");
            else { setIdx(idx + 1); setVotes([]); setPhase("vote"); }
          }}>{idx >= 5 ? tr("Terminer", "Finish") : tr("Dilemme suivant", "Next dilemma")}</Btn>
        </div>
      )}
      {phase === "end" && <End tr={tr} name={players[starter % players.length].name} onBack={onBack} subtitle={tr("Merci d'avoir voté.", "Thanks for voting.")} />}
    </div>
  );
}

function Bar({ label, n, total }) {
  const pct = total ? Math.round((n / total) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-sm"><span>{label}</span><b>{pct}%</b></div>
      <div className="h-3 overflow-hidden rounded-full border-2 border-[var(--line)]">
        <div className="h-full bg-[var(--rose)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const HANDS = [
  ["pierre", "Pierre", "Stone"],
  ["coeur", "Cœur", "Heart"],
  ["lien", "Lien", "Link"],
];
function beats(a, b) {
  return (a === "pierre" && b === "lien") || (a === "lien" && b === "coeur") || (a === "coeur" && b === "pierre");
}

function Pierre({ players, starter, level, tr, onBack }) {
  const duo = players.slice(0, 2);
  const [turn, setTurn] = useState(starter % 2);
  const [hidden, setHidden] = useState([null, null]);
  const [scores, setScores] = useState([0, 0]);
  const [log, setLog] = useState("");
  const [done, setDone] = useState(false);

  function choose(hand) {
    fx.flip();
    const next = hidden.slice();
    next[turn] = hand;
    if (duo[1 - turn].cpu && next[1 - turn] == null) {
      next[1 - turn] = cpuHand(level, hand);
    }
    if (next[0] && next[1]) {
      let text = tr("Égalité.", "Draw.");
      if (beats(next[0], next[1])) {
        setScores((s) => [s[0] + 1, s[1]]);
        text = `${duo[0].name} +1`;
        fx.good();
      } else if (beats(next[1], next[0])) {
        setScores((s) => [s[0], s[1] + 1]);
        text = `${duo[1].name} +1`;
        fx.good();
      } else fx.bad();
      setLog(`${duo[0].name}: ${next[0]} · ${duo[1].name}: ${next[1]} — ${text}`);
      setHidden([null, null]);
      setTurn(starter % 2);
    } else {
      setHidden(next);
      setTurn(1 - turn);
    }
  }
  function cpuHand(lvl) {
    const all = ["pierre", "coeur", "lien"];
    if (lvl === "doux") return all[Math.floor(Math.random() * 3)];
    if (lvl === "intense") return all[Math.floor(Math.random() * 3)];
    return all[Math.floor(Math.random() * 3)];
  }
  useEffect(() => {
    if (scores[0] >= 3 || scores[1] >= 3) setDone(true);
  }, [scores]);
  useEffect(() => {
    if (done || !duo[turn]?.cpu || hidden[turn]) return undefined;
    const t = setTimeout(() => choose(cpuHand(level)), 500);
    return () => clearTimeout(t);
  }, [turn, hidden, done]);

  return (
    <div className="table-play mx-auto min-h-dvh max-w-xl px-4 pb-28 pt-4">
      <Top tr={tr} title={tr("Pierre, Cœur, Lien", "Stone, Heart, Link")} onBack={onBack} />
      <ScoreStrip players={duo} scores={scores} turn={turn} />
      <p className="mb-3 text-sm text-muted">{tr("Pierre bat lien, lien bat cœur, cœur bat pierre. Premier à 3.", "Stone beats link, link beats heart, heart beats stone. First to 3.")}</p>
      {!done && !duo[turn].cpu && (
        <div className="grid gap-2">
          <p>{duo[turn].name}, {tr("choisis en secret.", "choose in secret.")}</p>
          {HANDS.map(([id, fr, en]) => (
            <button key={id} type="button" className="pressable stamp choice-tile w-full rounded-3xl p-4 text-left" onClick={() => choose(id)}>
              <span className="zoom-inner justify-start"><b className="display text-3xl">{tr(fr, en)}</b></span>
            </button>
          ))}
        </div>
      )}
      {log && <p className="stamp mt-4 rounded-2xl p-3 text-sm">{log}</p>}
      {done && <End tr={tr} name={scores[0] === scores[1] ? tr("Égalité", "Draw") : duo[scores[0] > scores[1] ? 0 : 1].name} onBack={onBack} onAgain={() => { setScores([0, 0]); setHidden([null, null]); setLog(""); setDone(false); setTurn(starter % 2); fx.tap(); }} />}
    </div>
  );
}

function Top({ tr, title, onBack }) {
  const [muted, setMuted] = useState(soundMuted());
  return (
    <div className="play-top mb-4 flex items-center gap-2">
      <button type="button" className="pressable grid h-10 w-10 place-items-center rounded-xl border-2 bg-[var(--card)]" onClick={onBack} aria-label={tr("Quitter", "Leave")}><span className="zoom-inner"><Icon name="back" /></span></button>
      <h1 className="display min-w-0 flex-1 text-2xl leading-none">{title}</h1>
      <button type="button" className="pressable rounded-full border-2 bg-[var(--card)] px-3 py-1 text-xs font-bold" onClick={() => { const next = !soundMuted(); setSoundMuted(next); setMuted(next); if (!next) fx.tap(); }}>
        <span className="zoom-inner">{muted ? tr("Son off", "Sound off") : tr("Son", "Sound")}</span>
      </button>
    </div>
  );
}

function Confetti() {
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: 16 }).map((_, i) => (
        <i key={i} style={{ left: `${(i * 13) % 100}%`, animationDelay: `${i * 0.06}s`, background: i % 3 === 0 ? "var(--leaf)" : i % 3 === 1 ? "var(--gold)" : "var(--rose)" }} />
      ))}
    </div>
  );
}

function End({ tr, name, onBack, onAgain, ranking, subtitle }) {
  const { session } = useStore();
  useEffect(() => { fx.win(); }, []);
  const mine = session?.pseudo && session.pseudo === name;
  return (
    <div className="finale stamp mt-5 rounded-[28px] p-5 text-center">
      <Confetti />
      {mine && <div className="mb-2 flex justify-center"><Avatar config={session.avatar} size={72} alt={session.pseudo} mood="win" /></div>}
      <div className="text-xs uppercase tracking-wider text-muted">{tr("Fin de partie", "Game over")}</div>
      <div className="display relative mt-1 text-4xl">{name}</div>
      <p className="mt-1 text-sm">{subtitle || tr("remporte la table.", "wins the table.")}</p>
      {ranking?.length > 0 && (
        <ol className="relative mx-auto mt-4 max-w-xs space-y-2 text-left">
          {ranking.map((row, i) => (
            <li key={row.name} className="flex items-center justify-between rounded-2xl border-2 border-[var(--line)] bg-[var(--card)] px-3 py-2">
              <span><b className="mr-2">{i + 1}</b>{row.name}</span>
              <b>{row.score}</b>
            </li>
          ))}
        </ol>
      )}
      <div className="relative mt-4 grid gap-2">
        {onAgain && <Btn onClick={onAgain}>{tr("Revanche", "Rematch")}</Btn>}
        <Btn kind="ghost" onClick={onBack}>{tr("Retour au salon", "Back to the salon")}</Btn>
      </div>
    </div>
  );
}
