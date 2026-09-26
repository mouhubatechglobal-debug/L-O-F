import { DARES, DILEMMAS, TRUTHS, WHO } from "../src/data/prompts.js";

function take(list, rng) {
  if (!list?.length) return { fr: "Question du salon", en: "Salon question" };
  return list[Math.floor(rng() * list.length)];
}

export function makeCatalog(rng = Math.random) {
  return {
    truth(category, difficulty) {
      return take(TRUTHS[category]?.[difficulty] || TRUTHS.amour?.doux, rng);
    },
    dare(category, difficulty) {
      return take(DARES[category]?.[difficulty] || DARES.amour?.doux, rng);
    },
    who() {
      return take(WHO, rng);
    },
    dilemma() {
      return take(DILEMMAS, rng);
    },
  };
}
