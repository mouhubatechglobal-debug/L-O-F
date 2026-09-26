const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const BEATS = { pierre: "lien", lien: "coeur", coeur: "pierre" };
const ROUNDS = { doux: 1, malin: 2, intense: 3 };
const PIERRE_ROUNDS = { doux: 3, malin: 5, intense: 7 };
const MEMORY_PAIRS = { doux: 4, malin: 6, intense: 8 };

function roundsFor(difficulty) {
  return ROUNDS[difficulty] || 1;
}

function clone(state) {
  return structuredClone(state);
}

function finish(state) {
  const ids = state.players.map((p) => p.id);
  const scores = state.scores || {};
  let best = -1;
  for (const id of ids) best = Math.max(best, scores[id] || 0);
  const leaders = ids.filter((id) => (scores[id] || 0) === best);
  state.status = "done";
  if (leaders.length === 1 && best > 0) {
    state.winnerId = leaders[0];
    state.draw = false;
  } else if (leaders.length === 1 && best === 0 && state.kind !== "morpion") {
    state.winnerId = null;
    state.draw = true;
  } else {
    state.winnerId = leaders.length === 1 ? leaders[0] : null;
    state.draw = leaders.length !== 1;
  }
  return state;
}

export function morpionWinner(cells) {
  for (const [a, b, c] of LINES) {
    if (cells[a] && cells[a] === cells[b] && cells[b] === cells[c]) return cells[a];
  }
  if (cells.every(Boolean)) return "draw";
  return null;
}

export function createMatch({ kind, players, difficulty = "doux", category = "fun", catalog, rng = Math.random, starter }) {
  if (!Array.isArray(players) || players.length < 2) {
    throw new Error("need_two_players");
  }
  const people = players.map((p) => ({ id: p.id, name: p.name || p.pseudo || p.id }));
  const first = people[starter ?? Math.floor(rng() * people.length)]?.id || people[0].id;
  const scores = Object.fromEntries(people.map((p) => [p.id, 0]));
  const base = {
    kind,
    players: people,
    scores,
    status: "playing",
    winnerId: null,
    draw: false,
    difficulty,
    category,
    turn: first,
    round: 1,
    maxRounds: kind === "pierre" ? PIERRE_ROUNDS[difficulty] || 3 : roundsFor(difficulty),
  };
  if (kind === "morpion") {
    return { ...base, cells: Array(9).fill(null), maxRounds: 1 };
  }
  if (kind === "memory") {
    const pairs = MEMORY_PAIRS[difficulty] || 4;
    const deck = [];
    for (let pair = 0; pair < pairs; pair += 1) {
      deck.push({ pair }, { pair });
    }
    for (let i = deck.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return {
      ...base,
      cards: deck.map((card, i) => ({ i, pair: card.pair, faceUp: false, matched: false })),
      open: [],
      needContinue: false,
    };
  }
  if (kind === "pierre") {
    return { ...base, choices: {}, revealed: false, last: null };
  }
  if (kind === "verite") {
    return { ...base, phase: "choose", prompt: null, answer: null, votes: {}, turnsDone: 0 };
  }
  if (kind === "qui") {
    return { ...base, phase: "vote", prompt: catalog.who(), votes: {}, turnsDone: 0 };
  }
  if (kind === "dilemme") {
    return { ...base, phase: "pick", options: catalog.dilemma(), picks: {}, turnsDone: 0 };
  }
  throw new Error("unknown_game");
}

function nextPlayer(state, currentId) {
  const ids = state.players.map((p) => p.id);
  const i = ids.indexOf(currentId);
  return ids[(i + 1) % ids.length];
}

function others(state, userId) {
  return state.players.map((p) => p.id).filter((id) => id !== userId);
}

export function reduceMatch(state, userId, action, catalog, rng = Math.random) {
  if (!state || state.status !== "playing") return { ok: false, error: "finished", state };
  if (!state.players.some((p) => p.id === userId)) return { ok: false, error: "not_player", state };
  if (!action || typeof action.type !== "string") return { ok: false, error: "invalid", state };
  if (action.type === "declare_winner" || action.winnerId || action.winner) {
    return { ok: false, error: "client_result_rejected", state };
  }
  const next = clone(state);
  if (next.kind === "morpion") return morpion(next, userId, action);
  if (next.kind === "memory") return memory(next, userId, action);
  if (next.kind === "pierre") return pierre(next, userId, action);
  if (next.kind === "verite") return verite(next, userId, action, catalog, rng);
  if (next.kind === "qui") return qui(next, userId, action, catalog, rng);
  if (next.kind === "dilemme") return dilemme(next, userId, action, catalog, rng);
  return { ok: false, error: "unknown_game", state };
}

function morpion(state, userId, action) {
  if (action.type !== "move") return { ok: false, error: "invalid", state };
  if (state.turn !== userId) return { ok: false, error: "not_your_turn", state };
  const cell = action.cell;
  if (!Number.isInteger(cell) || cell < 0 || cell > 8 || state.cells[cell]) {
    return { ok: false, error: "illegal_move", state };
  }
  state.cells[cell] = userId;
  const result = morpionWinner(state.cells);
  if (result === "draw") {
    state.status = "done";
    state.draw = true;
    state.winnerId = null;
  } else if (result) {
    state.status = "done";
    state.winnerId = result;
    state.draw = false;
    state.scores[result] = 1;
  } else {
    state.turn = nextPlayer(state, userId);
  }
  return { ok: true, state };
}

function memory(state, userId, action) {
  if (action.type === "continue") {
    if (!state.needContinue) return { ok: false, error: "invalid", state };
    state.cards = state.cards.map((card) => (card.matched ? card : { ...card, faceUp: false }));
    state.open = [];
    state.needContinue = false;
    state.turn = nextPlayer(state, state.turn);
    return { ok: true, state };
  }
  if (action.type !== "flip") return { ok: false, error: "invalid", state };
  if (state.turn !== userId) return { ok: false, error: "not_your_turn", state };
  if (state.needContinue) return { ok: false, error: "must_continue", state };
  const index = action.index;
  const card = state.cards[index];
  if (!card || card.matched || card.faceUp) return { ok: false, error: "illegal_move", state };
  card.faceUp = true;
  state.open = [...state.open, index];
  if (state.open.length < 2) return { ok: true, state };
  const [a, b] = state.open;
  if (state.cards[a].pair === state.cards[b].pair) {
    state.cards[a].matched = true;
    state.cards[b].matched = true;
    state.scores[userId] = (state.scores[userId] || 0) + 1;
    state.open = [];
    if (state.cards.every((c) => c.matched)) finish(state);
  } else {
    state.needContinue = true;
  }
  return { ok: true, state };
}

function pierre(state, userId, action) {
  if (action.type !== "choose") return { ok: false, error: "invalid", state };
  if (!BEATS[action.choice]) return { ok: false, error: "illegal_move", state };
  if (state.revealed) return { ok: false, error: "invalid", state };
  if (state.choices[userId]) return { ok: false, error: "already_played", state };
  state.choices[userId] = action.choice;
  const ids = state.players.map((p) => p.id);
  if (!ids.every((id) => state.choices[id])) return { ok: true, state };
  const [a, b] = ids;
  const ca = state.choices[a];
  const cb = state.choices[b];
  let roundWinner = null;
  if (ca !== cb) roundWinner = BEATS[ca] === cb ? a : b;
  if (roundWinner) state.scores[roundWinner] += 1;
  state.revealed = true;
  state.last = { choices: { ...state.choices }, winnerId: roundWinner };
  if (state.round >= state.maxRounds) {
    finish(state);
  }
  return { ok: true, state };
}

export function advancePierre(state) {
  if (state.kind !== "pierre" || !state.revealed || state.status === "done") return state;
  const next = clone(state);
  next.round += 1;
  next.choices = {};
  next.revealed = false;
  return next;
}

function verite(state, userId, action, catalog) {
  if (state.phase === "choose") {
    if (state.turn !== userId) return { ok: false, error: "not_your_turn", state };
    if (action.type !== "choose" || !["truth", "dare"].includes(action.choice)) {
      return { ok: false, error: "invalid", state };
    }
    const bag = action.choice === "dare" ? catalog.dare(state.category, state.difficulty) : catalog.truth(state.category, state.difficulty);
    state.choice = action.choice;
    state.prompt = bag;
    state.phase = "answer";
    state.answer = null;
    state.votes = {};
    return { ok: true, state };
  }
  if (state.phase === "answer") {
    if (state.turn !== userId) return { ok: false, error: "not_your_turn", state };
    if (action.type !== "answer" || typeof action.text !== "string" || !action.text.trim()) {
      return { ok: false, error: "invalid", state };
    }
    state.answer = action.text.trim().slice(0, 400);
    state.phase = "vote";
    return { ok: true, state };
  }
  if (state.phase === "vote") {
    if (userId === state.turn) return { ok: false, error: "not_your_turn", state };
    if (action.type !== "vote" || !["love", "ok", "no"].includes(action.vote)) {
      return { ok: false, error: "invalid", state };
    }
    if (state.votes[userId]) return { ok: false, error: "already_played", state };
    state.votes[userId] = action.vote;
    const needed = others(state, state.turn);
    if (!needed.every((id) => state.votes[id])) return { ok: true, state };
    const gain = Object.values(state.votes).reduce((sum, vote) => sum + (vote === "love" ? 2 : vote === "ok" ? 1 : 0), 0);
    state.scores[state.turn] = (state.scores[state.turn] || 0) + gain;
    state.turnsDone += 1;
    if (state.turnsDone >= state.players.length * state.maxRounds) return { ok: true, state: finish(state) };
    state.turn = nextPlayer(state, state.turn);
    state.phase = "choose";
    state.prompt = null;
    state.answer = null;
    state.votes = {};
    state.round = state.turnsDone + 1;
    return { ok: true, state };
  }
  return { ok: false, error: "invalid", state };
}

function qui(state, userId, action, catalog) {
  if (action.type !== "vote") return { ok: false, error: "invalid", state };
  if (!state.players.some((p) => p.id === action.targetId)) return { ok: false, error: "illegal_move", state };
  if (state.votes[userId]) return { ok: false, error: "already_played", state };
  state.votes[userId] = action.targetId;
  if (!state.players.every((p) => state.votes[p.id])) return { ok: true, state };
  for (const target of Object.values(state.votes)) state.scores[target] = (state.scores[target] || 0) + 1;
  state.turnsDone += 1;
  if (state.turnsDone >= state.maxRounds) return { ok: true, state: finish(state) };
  state.votes = {};
  state.prompt = catalog.who();
  state.round += 1;
  return { ok: true, state };
}

function dilemme(state, userId, action, catalog) {
  if (action.type !== "pick" || ![0, 1].includes(action.option)) return { ok: false, error: "invalid", state };
  if (state.picks[userId] != null) return { ok: false, error: "already_played", state };
  state.picks[userId] = action.option;
  if (!state.players.every((p) => state.picks[p.id] != null)) return { ok: true, state };
  const tally = [0, 1];
  for (const option of Object.values(state.picks)) tally[option] += 1;
  state.lastTally = tally;
  const majority = tally[0] === tally[1] ? null : tally[0] > tally[1] ? 0 : 1;
  if (majority != null) {
    for (const [id, option] of Object.entries(state.picks)) {
      if (option === majority) state.scores[id] = (state.scores[id] || 0) + 1;
    }
  }
  state.turnsDone += 1;
  if (state.turnsDone >= state.maxRounds) return { ok: true, state: finish(state) };
  state.picks = {};
  state.options = catalog.dilemma();
  state.round += 1;
  return { ok: true, state };
}

export function publicMatch(state, userId) {
  if (!state) return state;
  const view = clone(state);
  if (view.kind === "memory" && Array.isArray(view.cards)) {
    view.cards = view.cards.map((card) => ({
      ...card,
      pair: card.matched || card.faceUp ? card.pair : null,
    }));
  }
  if (view.kind === "pierre" && view.choices && !view.revealed) {
    const choices = {};
    for (const [id, value] of Object.entries(view.choices)) {
      choices[id] = id === userId ? value : "hidden";
    }
    view.choices = choices;
  }
  return view;
}

export function officialResult(state) {
  if (!state || state.status !== "done") return null;
  return {
    winnerId: state.winnerId || null,
    draw: Boolean(state.draw),
    scores: state.scores || {},
  };
}
