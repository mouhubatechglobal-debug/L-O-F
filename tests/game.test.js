import { describe, expect, test } from "vitest";
import { advancePierre, createMatch, morpionWinner, officialResult, publicMatch, reduceMatch } from "../server/game.js";

const players = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Beo" },
];
const catalog = {
  truth: () => ({ fr: "Vérité test", en: "Test truth" }),
  dare: () => ({ fr: "Gage test", en: "Test dare" }),
  who: () => ({ fr: "danser", en: "dance" }),
  dilemma: () => [{ fr: "Lettre", en: "Letter" }, { fr: "Appel", en: "Call" }],
};

describe("morpion authority", () => {
  test("rejects a client-declared winner and an off-turn move", () => {
    const state = createMatch({ kind: "morpion", players, starter: 0, rng: () => 0 });
    expect(state.turn).toBe("a");
    const cheat = reduceMatch(state, "a", { type: "declare_winner", winnerId: "a" }, catalog);
    expect(cheat.ok).toBe(false);
    expect(cheat.error).toBe("client_result_rejected");
    const early = reduceMatch(state, "b", { type: "move", cell: 0 }, catalog);
    expect(early.error).toBe("not_your_turn");
    const played = reduceMatch(state, "a", { type: "move", cell: 0 }, catalog);
    expect(played.ok).toBe(true);
    expect(played.state.cells[0]).toBe("a");
    expect(played.state.turn).toBe("b");
  });

  test("the server, not the client, names the winner", () => {
    let state = createMatch({ kind: "morpion", players, starter: 0, rng: () => 0 });
    const moves = [
      ["a", 0],
      ["b", 3],
      ["a", 1],
      ["b", 4],
      ["a", 2],
    ];
    for (const [id, cell] of moves) {
      const result = reduceMatch(state, id, { type: "move", cell }, catalog);
      expect(result.ok).toBe(true);
      state = result.state;
    }
    expect(morpionWinner(state.cells)).toBe("a");
    expect(state.status).toBe("done");
    expect(officialResult(state).winnerId).toBe("a");
  });
});

describe("hidden information", () => {
  test("pierre hides the other player's choice until both have played", () => {
    let state = createMatch({ kind: "pierre", players, difficulty: "doux", starter: 0, rng: () => 0 });
    state = reduceMatch(state, "a", { type: "choose", choice: "pierre" }, catalog).state;
    const view = publicMatch(state, "b");
    expect(view.choices.a).toBe("hidden");
    expect(view.choices.b).toBeUndefined();
    state = reduceMatch(state, "b", { type: "choose", choice: "lien" }, catalog).state;
    expect(state.revealed).toBe(true);
    expect(state.scores.a).toBe(1);
    const next = advancePierre(state);
    expect(next.choices).toEqual({});
    expect(next.revealed).toBe(false);
  });

  test("memory does not reveal hidden pairs", () => {
    const state = createMatch({ kind: "memory", players, difficulty: "doux", rng: () => 0.5 });
    const view = publicMatch(state, "a");
    expect(view.cards.every((card) => card.pair == null)).toBe(true);
  });
});

describe("party games", () => {
  test("vérité scores only from server-side votes", () => {
    let state = createMatch({ kind: "verite", players, difficulty: "doux", category: "amour", starter: 0, rng: () => 0 });
    state = reduceMatch(state, "a", { type: "choose", choice: "truth" }, catalog).state;
    expect(state.prompt.fr).toBe("Vérité test");
    state = reduceMatch(state, "a", { type: "answer", text: "une lettre" }, catalog).state;
    const selfVote = reduceMatch(state, "a", { type: "vote", vote: "love" }, catalog);
    expect(selfVote.error).toBe("not_your_turn");
    state = reduceMatch(state, "b", { type: "vote", vote: "love" }, catalog).state;
    expect(state.scores.a).toBe(2);
    expect(state.status).toBe("playing");
  });

  test("qui refuses a vote for someone outside the room", () => {
    const state = createMatch({ kind: "qui", players, difficulty: "doux", catalog, rng: () => 0 });
    const bad = reduceMatch(state, "a", { type: "vote", targetId: "outsider" }, catalog);
    expect(bad.error).toBe("illegal_move");
  });
});
