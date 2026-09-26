import { useEffect, useState } from "react";
import { useStore } from "./store.jsx";
import { Btn } from "./components/Ui.jsx";
import { ScreenHead } from "./social.jsx";
import { getSocket } from "./realtime.js";
import { fx } from "./fx.js";
import { line } from "./data/prompts.js";
import { Avatar } from "./components/Avatar.jsx";
import { personById } from "./data/seeds.js";

const MARKS = ["♥", "🌿"];
const HAND = [
  ["pierre", "Pierre", "Stone"],
  ["coeur", "Cœur", "Heart"],
  ["lien", "Lien", "Link"],
];

function textOf(item, lang) {
  if (!item) return "";
  if (typeof item === "string") return item;
  return line(item, lang);
}

export function OnlineTable({ roomId, onBack }) {
  const { tr, session, data, fetchRoom, startRoom, roomAction } = useStore();
  const [room, setRoom] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const lang = session?.lang === "en" ? "en" : "fr";

  useEffect(() => {
    let stop = false;
    const pull = async () => {
      try {
        const next = await fetchRoom(roomId);
        if (!stop) setRoom(next);
      } catch (error) {
        if (!stop) setErr(error.data?.error || "missing");
      }
    };
    pull();
    const timer = setInterval(pull, 2000);
    const socket = getSocket();
    socket.emit("room:join", roomId);
    const onState = (next) => {
      if (next?.id === roomId || next?.code) setRoom(next);
    };
    socket.on("room:state", onState);
    return () => {
      stop = true;
      clearInterval(timer);
      socket.off("room:state", onState);
    };
  }, [roomId, fetchRoom]);

  useEffect(() => {
    if (room?.state?.status === "done") fx.win();
  }, [room?.state?.status]);

  async function act(action) {
    setBusy(true);
    setErr("");
    try {
      const next = await roomAction(room.id, action);
      setRoom(next);
      fx.tap();
    } catch (error) {
      setErr(error.data?.error || "refused");
      fx.bad();
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    setBusy(true);
    setErr("");
    try {
      setRoom(await startRoom(room.id));
      fx.good();
    } catch (error) {
      setErr(error.data?.error || "refused");
    } finally {
      setBusy(false);
    }
  }

  if (!room) {
    return (
      <div className="mx-auto min-h-dvh max-w-xl pb-28">
        <ScreenHead title={tr("Salon", "Salon")} onBack={onBack} />
        <p className="px-4 text-sm text-muted">{tr("Connexion à la table…", "Joining the table…")}</p>
      </div>
    );
  }

  const state = room.state || {};
  const me = session?.id;
  const mine = state.players?.findIndex((p) => p.id === me) ?? 0;
  const names = Object.fromEntries((room.members || []).map((m) => [m.id, m.pseudo]));
  const official = state.status === "done";

  return (
    <div className="mx-auto min-h-dvh w-full max-w-xl pb-28">
      <ScreenHead title={tr("Table en ligne", "Online table")} onBack={onBack} />
      <div className="space-y-4 px-4">
        <div className="stamp rounded-3xl p-4">
          <div className="text-xs uppercase tracking-wider text-muted">{tr("Code", "Code")}</div>
          <div className="display text-4xl">{room.code}</div>
          <button type="button" className="mt-2 text-sm underline" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}${window.location.pathname}?salon=${room.code}`)}>{tr("Copier le lien du salon", "Copy the salon link")}</button>
          <div className="mt-3 flex flex-wrap gap-2">
            {(room.members || []).map((m) => (
              <span key={m.id} className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--line)] bg-[var(--card)] px-2 py-1 text-xs">
                <Avatar config={personById(m.id, data.users)?.avatar} size={22} alt={m.pseudo} /> @{m.pseudo}
              </span>
            ))}
            {(room.members || []).length === 0 && <span className="text-sm">{tr("En attente", "Waiting")}</span>}
          </div>
          <p className="mt-1 text-xs text-muted">{tr("Le serveur tient le score, le tour et le résultat.", "The server holds the score, the turn and the result.")}</p>
        </div>
        {err && <p className="text-sm text-[var(--danger)]">{label(err, tr)}</p>}
        {room.status === "open" && (
          <div className="space-y-3">
            <p>{tr("La partie commence quand deux comptes sont à la table. Le hasard du premier tour est tiré par le serveur.", "The match starts when two accounts are at the table. The server draws the first turn.")}</p>
            {room.hostId === me ? (
              <Btn className="w-full" disabled={busy} onClick={start}>{tr("Lancer la partie", "Start the match")}</Btn>
            ) : (
              <p className="text-sm text-muted">{tr("En attente de l'hôte.", "Waiting for the host.")}</p>
            )}
          </div>
        )}
        {state.kind === "morpion" && <Morpion state={state} me={me} mine={mine} names={names} busy={busy} onMove={(cell) => act({ type: "move", cell })} tr={tr} />}
        {state.kind === "memory" && <Memory state={state} me={me} names={names} busy={busy} onFlip={(index) => act({ type: "flip", index })} onContinue={() => act({ type: "continue" })} tr={tr} />}
        {state.kind === "pierre" && <Pierre state={state} me={me} names={names} busy={busy} onChoose={(choice) => act({ type: "choose", choice })} onNext={() => act({ type: "next" })} tr={tr} />}
        {state.kind === "verite" && <Verite state={state} me={me} names={names} lang={lang} busy={busy} act={act} tr={tr} />}
        {state.kind === "qui" && <Qui state={state} me={me} names={names} lang={lang} busy={busy} act={act} tr={tr} />}
        {state.kind === "dilemme" && <Dilemme state={state} me={me} names={names} lang={lang} busy={busy} act={act} tr={tr} />}
        {official && (
          <div className="stamp-rose rounded-3xl p-4">
            <div className="text-xs uppercase tracking-wider">{tr("Résultat officiel", "Official result")}</div>
            <p className="display mt-1 text-3xl">
              {state.draw || !state.winnerId ? tr("Égalité", "Draw") : names[state.winnerId] || state.winnerId}
            </p>
            <ul className="mt-2 text-sm">
              {Object.entries(state.scores || {}).map(([id, score]) => (
                <li key={id}>@{names[id] || id} · {score}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function label(code, tr) {
  const map = {
    need_two: tr("Il faut deux joueurs à la table.", "Two players are required."),
    not_your_turn: tr("Ce n'est pas ton tour.", "Not your turn."),
    client_result_rejected: tr("Le serveur refuse un résultat envoyé par le client.", "The server rejected a client-sent result."),
    forbidden: tr("Action refusée.", "Action refused."),
    illegal_move: tr("Coup refusé.", "Move refused."),
    already_played: tr("Déjà joué.", "Already played."),
    finished: tr("Partie terminée.", "Match finished."),
  };
  return map[code] || tr("Le serveur a refusé l'action.", "The server refused the action.");
}

function Turn({ state, names, tr }) {
  if (!state.turn || state.status === "done") return null;
  return <p className="text-sm">{tr("Tour de", "Turn of")} @{names[state.turn] || state.turn}</p>;
}

function Morpion({ state, me, mine, names, busy, onMove, tr }) {
  return (
    <div className="table-play">
      <Turn state={state} names={names} tr={tr} />
      <div className="mt-3 grid grid-cols-3 gap-2">
        {state.cells.map((cell, i) => {
          const mark = cell ? MARKS[state.players.findIndex((p) => p.id === cell)] || "•" : "";
          return (
            <button key={i} type="button" disabled={busy || state.status === "done" || state.turn !== me || Boolean(cell)} className="board-cell pressable grid aspect-square place-items-center rounded-2xl border-2 border-[var(--line)] text-4xl" onClick={() => onMove(i)}>
              {mark}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">{tr("Ton signe", "Your mark")} {MARKS[mine] || "•"}</p>
    </div>
  );
}

function Memory({ state, me, names, busy, onFlip, onContinue, tr }) {
  return (
    <div>
      <Turn state={state} names={names} tr={tr} />
      <div className="mt-3 grid grid-cols-4 gap-2">
        {state.cards.map((card) => (
          <button key={card.i} type="button" disabled={busy || state.needContinue || state.turn !== me || card.matched} className="pressable grid aspect-square place-items-center rounded-2xl border-2 text-2xl" onClick={() => onFlip(card.i)}>
            {card.matched || card.faceUp ? card.pair : "?"}
          </button>
        ))}
      </div>
      {state.needContinue && <Btn className="mt-3" onClick={onContinue}>{tr("Continuer", "Continue")}</Btn>}
    </div>
  );
}

function Pierre({ state, me, names, busy, onChoose, onNext, tr }) {
  const mine = state.choices?.[me];
  return (
    <div className="space-y-3">
      <p className="text-sm">{tr("Manche", "Round")} {state.round}/{state.maxRounds}</p>
      <div className="grid gap-2">
        {HAND.map(([id, fr, en]) => (
          <button key={id} type="button" disabled={busy || state.revealed || state.status === "done" || mine} className="pressable stamp rounded-2xl px-4 py-3 text-left" onClick={() => onChoose(id)}>
            {tr(fr, en)} {mine === id ? "·" : ""}
          </button>
        ))}
      </div>
      {state.revealed && state.last && (
        <div className="stamp rounded-2xl p-3 text-sm">
          {state.players.map((p) => (
            <div key={p.id}>@{names[p.id] || p.name} · {state.last.choices[p.id]}</div>
          ))}
        </div>
      )}
      {state.revealed && state.status !== "done" && <Btn onClick={onNext}>{tr("Manche suivante", "Next round")}</Btn>}
    </div>
  );
}

function Verite({ state, me, names, lang, busy, act, tr }) {
  const prompt = textOf(state.prompt, lang);
  return (
    <div className="space-y-3">
      <Turn state={state} names={names} tr={tr} />
      {state.phase === "choose" && state.turn === me && (
        <div className="grid gap-2">
          <Btn disabled={busy} onClick={() => act({ type: "choose", choice: "truth" })}>{tr("Vérité", "Truth")}</Btn>
          <Btn kind="ghost" disabled={busy} onClick={() => act({ type: "choose", choice: "dare" })}>{tr("Gage", "Dare")}</Btn>
        </div>
      )}
      {prompt && <p className="stamp rounded-3xl p-4 text-lg">{prompt}</p>}
      {state.phase === "answer" && state.turn === me && <Answer onSend={(text) => act({ type: "answer", text })} tr={tr} />}
      {state.answer && <p className="text-sm">« {state.answer} »</p>}
      {state.phase === "vote" && state.turn !== me && !state.votes?.[me] && (
        <div className="flex gap-2">
          <Btn disabled={busy} onClick={() => act({ type: "vote", vote: "love" })}>{tr("J'adore", "Love")}</Btn>
          <Btn kind="ghost" disabled={busy} onClick={() => act({ type: "vote", vote: "ok" })}>OK</Btn>
          <Btn kind="ghost" disabled={busy} onClick={() => act({ type: "vote", vote: "no" })}>{tr("Passe", "Pass")}</Btn>
        </div>
      )}
    </div>
  );
}

function Qui({ state, me, names, lang, busy, act, tr }) {
  return (
    <div className="space-y-3">
      <p className="stamp rounded-3xl p-4 text-lg">{tr("Qui a le plus de chances de", "Who is most likely to")} {textOf(state.prompt, lang)} ?</p>
      {!state.votes?.[me] && state.status !== "done" && state.players.map((p) => (
        <button key={p.id} type="button" disabled={busy} className="pressable stamp w-full rounded-2xl px-4 py-3 text-left" onClick={() => act({ type: "vote", targetId: p.id })}>
          @{names[p.id] || p.name}
        </button>
      ))}
    </div>
  );
}

function Dilemme({ state, me, names, lang, busy, act, tr }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{tr("Vote secret. Le serveur compte.", "Secret vote. The server counts.")}</p>
      {state.picks?.[me] == null && state.status !== "done" && (state.options || []).map((option, index) => (
        <button key={index} type="button" disabled={busy} className="pressable stamp w-full rounded-2xl px-4 py-3 text-left" onClick={() => act({ type: "pick", option: index })}>
          {textOf(option, lang)}
        </button>
      ))}
      {state.picks?.[me] != null && state.status !== "done" && <p className="text-sm text-muted">{tr("En attente des autres.", "Waiting for the others.")}</p>}
    </div>
  );
}

function Answer({ onSend, tr }) {
  const [text, setText] = useState("");
  return (
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) onSend(text); }}>
      <input className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder={tr("Ta réponse", "Your answer")} />
      <Btn type="submit">{tr("OK", "OK")}</Btn>
    </form>
  );
}
