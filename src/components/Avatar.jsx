import { useId, useState } from "react";

const HAIRS = ["pics", "court", "frange", "long", "lisse", "ondules", "boucles", "afro", "locs", "tresses", "chignon", "hijab", "nu"];
const FACES = ["ovale", "rond", "doux", "fin", "anguleux"];
const EYES = ["amande", "rond", "vif", "doux", "clin"];
const BROWS = ["doux", "arques", "droits", "epais"];
const EXPRESSIONS = ["heureux", "sourire", "amoureux", "timide", "surpris", "serieux", "triste", "amuse", "confiant", "gene", "clin"];
const OUTFITS = ["hoodie", "tshirt", "chemise", "veste", "pull", "street", "scolaire"];
const ACCESSORIES = ["none", "coeur", "lunettes", "anneaux", "collier", "casquette", "barrette", "serre-tete", "ecouteurs", "flower"];

export const AVATAR_PRESETS = {
  skins: ["#F6D7C3", "#E8B48A", "#C68642", "#8D5524", "#5C3317", "#3B2414"],
  hairs: HAIRS,
  hairColors: ["#1A120E", "#3A241C", "#6B3A22", "#C9842A", "#E7A0A8", "#F3C1C8", "#E7D3B0", "#7A1F3D", "#222"],
  eyes: EYES,
  eyeColors: ["#6B3A22", "#C9842A", "#3A2418", "#1F4D45", "#2E3F86", "#6E2E3A", "#1A1A1A"],
  accessories: ACCESSORIES,
  bgs: ["#2A1020", "#F3C1C8", "#C9E4D4", "#F7E1B5", "#D5E4F5", "#E7C4F0", "#1A120E"],
  faces: FACES,
  brows: BROWS,
  expressions: EXPRESSIONS,
  outfits: OUTFITS,
  outfitColors: ["#1A120E", "#C42B58", "#1F6A4A", "#3A1020", "#C9842A", "#F6E7DC", "#2F6F86", "#5C3317"],
  styles: ["masculin", "feminin"],
};

const LABELS = {
  masculin: ["Masculin", "Masculine"],
  feminin: ["Féminin", "Feminine"],
  pics: ["Épis", "Spikes"],
  court: ["Court", "Short"],
  frange: ["Frange", "Bangs"],
  long: ["Long", "Long"],
  lisse: ["Lisse", "Straight"],
  ondules: ["Ondulé", "Wavy"],
  boucles: ["Bouclé", "Curly"],
  afro: ["Afro", "Afro"],
  locs: ["Locks", "Locs"],
  tresses: ["Tresses", "Braids"],
  chignon: ["Chignon", "Bun"],
  hijab: ["Hijab", "Hijab"],
  nu: ["Nu", "Bare"],
  ovale: ["Ovale", "Oval"],
  rond: ["Rond", "Round"],
  doux: ["Doux", "Soft"],
  fin: ["Fin", "Fine"],
  anguleux: ["Anguleux", "Angular"],
  amande: ["Amande", "Almond"],
  vif: ["Vif", "Bright"],
  clin: ["Clin d'œil", "Wink"],
  arques: ["Arqués", "Arched"],
  droits: ["Droits", "Straight"],
  epais: ["Épais", "Thick"],
  heureux: ["Heureux", "Happy"],
  sourire: ["Sourire", "Smile"],
  amoureux: ["Amoureux", "Tender"],
  timide: ["Timide", "Shy"],
  surpris: ["Surpris", "Surprised"],
  serieux: ["Sérieux", "Serious"],
  triste: ["Triste", "Sad"],
  amuse: ["Amusé", "Amused"],
  confiant: ["Confiant", "Confident"],
  gene: ["Gêné", "Flustered"],
  hoodie: ["Hoodie", "Hoodie"],
  tshirt: ["T-shirt", "T-shirt"],
  chemise: ["Chemise", "Shirt"],
  veste: ["Veste", "Jacket"],
  pull: ["Pull", "Sweater"],
  street: ["Street", "Street"],
  scolaire: ["Scolaire", "School"],
  none: ["Aucun", "None"],
  coeur: ["Cœur", "Heart clip"],
  lunettes: ["Lunettes", "Glasses"],
  anneaux: ["Boucles", "Earrings"],
  collier: ["Collier", "Necklace"],
  casquette: ["Casquette", "Cap"],
  barrette: ["Barrette", "Clip"],
  "serre-tete": ["Serre-tête", "Headband"],
  ecouteurs: ["Écouteurs", "Headphones"],
  bow: ["Nœud", "Bow"],
  flower: ["Fleur", "Flower"],
  glasses: ["Lunettes", "Glasses"],
  cap: ["Casquette", "Cap"],
  earring: ["Boucle", "Earring"],
};

export function stylePreset(style = "feminin") {
  if (style === "masculin") {
    return {
      style: "masculin",
      skin: "#E8B48A",
      face: "anguleux",
      hair: "pics",
      hairColor: "#1A120E",
      eyes: "amande",
      eyeColor: "#6B3A22",
      brows: "epais",
      expression: "sourire",
      accessory: "none",
      outfit: "hoodie",
      outfitColor: "#1A120E",
      bg: "#2A1020",
      freckles: false,
    };
  }
  return {
    style: "feminin",
    skin: "#F6D7C3",
    face: "doux",
    hair: "long",
    hairColor: "#E7A0A8",
    eyes: "vif",
    eyeColor: "#C9842A",
    brows: "doux",
    expression: "heureux",
    accessory: "coeur",
    outfit: "hoodie",
    outfitColor: "#1A120E",
    bg: "#3A1230",
    freckles: false,
  };
}

export function defaultAvatar() {
  return stylePreset("feminin");
}

function normalize(config) {
  const style = config?.style || inferStyle(config);
  const base = stylePreset(style);
  const eyes = mapEyes(config?.eyes);
  const accessory = mapAccessory(config?.accessory);
  const hair = mapHair(config?.hair, style);
  return { ...base, ...(config || {}), style, eyes, accessory, hair };
}

function inferStyle(config) {
  if (!config) return "feminin";
  if (["bow", "flower", "earring", "anneaux", "coeur", "barrette"].includes(config.accessory)) return "feminin";
  if (["long", "chignon", "hijab", "ondules", "lisse"].includes(config.hair)) return "feminin";
  if (["pics", "cap", "casquette"].includes(config.hair) || config.accessory === "cap") return "masculin";
  return "feminin";
}

function mapEyes(eyes) {
  if (eyes === "round") return "rond";
  if (eyes === "soft") return "doux";
  if (eyes === "bright") return "vif";
  if (eyes === "wink") return "clin";
  return eyes || "vif";
}

function mapAccessory(accessory) {
  if (accessory === "glasses") return "lunettes";
  if (accessory === "cap") return "casquette";
  if (accessory === "earring" || accessory === "boucles") return "anneaux";
  return accessory || "none";
}

function mapHair(hair, style) {
  if (!hair) return style === "masculin" ? "pics" : "long";
  if (hair === "court" && style === "masculin") return "pics";
  return hair;
}

function shade(hex, amount) {
  const raw = String(hex || "#000").replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const num = Number.parseInt(full, 16);
  if (Number.isNaN(num)) return "#000";
  const channel = (shift) => Math.min(255, Math.max(0, ((num >> shift) & 255) + amount));
  return `#${[channel(16), channel(8), channel(0)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function faceBox(face, style) {
  if (face === "rond") return { rx: 28, ry: 27 };
  if (face === "fin") return { rx: 24, ry: 31 };
  if (face === "anguleux") return { rx: 27, ry: 30 };
  if (face === "doux") return { rx: 29, ry: 29 };
  return style === "masculin" ? { rx: 27, ry: 30 } : { rx: 26, ry: 30 };
}

export function Avatar({ config, size = 48, alt = "", mood = "idle" }) {
  const uid = useId().replace(/:/g, "");
  const c = normalize(config);
  const box = faceBox(c.face, c.style);
  const feminine = c.style !== "masculin";
  const expression = mood === "win" ? "heureux" : c.expression;
  const blush = ["amoureux", "timide", "gene", "heureux"].includes(expression) || mood === "invite";
  const wink = c.eyes === "clin" || expression === "clin" || expression === "gene";
  const ink = "#1A1020";
  return (
    <svg className={`avatar-face avatar-${mood}`} width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={alt || "Avatar"}>
      <defs>
        <linearGradient id={`${uid}-skin`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(c.skin, 28)} />
          <stop offset="1" stopColor={shade(c.skin, -12)} />
        </linearGradient>
        <radialGradient id={`${uid}-iris`} cx="38%" cy="32%">
          <stop offset="0" stopColor={shade(c.eyeColor, 70)} />
          <stop offset="0.55" stopColor={c.eyeColor} />
          <stop offset="1" stopColor={shade(c.eyeColor, -40)} />
        </radialGradient>
        <linearGradient id={`${uid}-sun`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff8a3d" />
          <stop offset="0.48" stopColor="#ff4f9a" />
          <stop offset="1" stopColor="#7a3cff" />
        </linearGradient>
        <clipPath id={`${uid}-bust`}>
          <rect width="120" height="120" rx="28" />
        </clipPath>
      </defs>
      <rect width="120" height="120" rx="28" fill={c.bg || "#2A1020"} />
      <circle cx="60" cy="66" r="40" fill={`url(#${uid}-sun)`} />
      <circle cx="60" cy="66" r="40" fill="none" stroke="#ffe08a" strokeWidth="2" />
      <g className="avatar-body" clipPath={`url(#${uid}-bust)`}>
        <Clothes outfit={c.outfit} color={c.outfitColor} feminine={feminine} ink={ink} />
        <path d="M51 84c1 6 17 6 18 0v18H51V84z" fill={c.skin} stroke={ink} strokeWidth="1.2" />
        <HairBack hair={c.hair} color={c.hairColor} ink={ink} />
        {c.hair !== "hijab" && (
          <g>
            <ellipse cx="31" cy="70" rx="4.2" ry="6" fill={c.skin} stroke={ink} strokeWidth="1.2" />
            <ellipse cx="89" cy="70" rx="4.2" ry="6" fill={c.skin} stroke={ink} strokeWidth="1.2" />
          </g>
        )}
        <ellipse cx="60" cy="64" rx={box.rx} ry={box.ry} fill={`url(#${uid}-skin)`} stroke={ink} strokeWidth="2.1" />
        {blush && (
          <g opacity={expression === "gene" ? 0.85 : 0.55}>
            <ellipse cx="43" cy="76" rx="6.5" ry="3.2" fill="#E07A86" />
            <ellipse cx="77" cy="76" rx="6.5" ry="3.2" fill="#E07A86" />
          </g>
        )}
        {c.freckles && (
          <g fill={shade(c.skin, -48)}>
            <circle cx="45" cy="74" r="0.7" /><circle cx="47.2" cy="75.6" r="0.5" />
            <circle cx="75" cy="74" r="0.7" /><circle cx="72.8" cy="75.6" r="0.5" />
          </g>
        )}
        <Brows kind={c.brows} expression={expression} feminine={feminine} ink={ink} />
        <Eyes kind={c.eyes} colorId={`${uid}-iris`} skin={c.skin} expression={expression} wink={wink} feminine={feminine} ink={ink} />
        <path d="M58.4 70.5c1.2 2.4 2.6 2.4 3.4 0" fill="none" stroke={shade(c.skin, -70)} strokeWidth="1.3" strokeLinecap="round" />
        <Mouth expression={expression} ink={ink} />
        <HairFront hair={c.hair} color={c.hairColor} ink={ink} feminine={feminine} />
        <Accessory kind={c.accessory} />
        {mood === "win" && <path d="M98 18l1.6 3.6 3.8.4-2.9 2.4 1 3.6-3.5-2-3.5 2 1-3.6-2.9-2.4 3.8-.4z" fill="#ffe08a" className="avatar-spark" />}
      </g>
    </svg>
  );
}

function Eyes({ kind, colorId, skin, expression, wink, feminine, ink }) {
  const surprised = expression === "surpris";
  const ry = surprised ? 8.4 : kind === "doux" ? 6.2 : kind === "rond" ? 7.6 : 7;
  const rx = kind === "amande" ? 8.2 : 8.6;
  return (
    <g className="avatar-eyes">
      <Eye cx={47} cy={62} rx={rx} ry={ry} colorId={colorId} skin={skin} closed={false} feminine={feminine} ink={ink} />
      <Eye cx={73} cy={62} rx={expression === "amuse" ? rx * 0.9 : rx} ry={ry} colorId={colorId} skin={skin} closed={wink && expression !== "surpris"} feminine={feminine} ink={ink} />
    </g>
  );
}

function Eye({ cx, cy, rx, ry, colorId, skin, closed, feminine, ink }) {
  if (closed) {
    return <path d={`M${cx - rx} ${cy}c${rx * 0.5} 3 ${rx * 1.5} 3 ${rx * 2} 0`} fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />;
  }
  return (
    <g className="avatar-eye">
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fffdf8" stroke={ink} strokeWidth="1.7" />
      <ellipse cx={cx + 0.4} cy={cy + 0.8} rx={rx * 0.52} ry={ry * 0.72} fill={`url(#${colorId})`} />
      <ellipse cx={cx + 0.6} cy={cy + 1.2} rx={rx * 0.24} ry={ry * 0.34} fill={ink} />
      <circle cx={cx - rx * 0.22} cy={cy - ry * 0.22} r="1.7" fill="#fff" />
      <circle cx={cx + rx * 0.28} cy={cy + ry * 0.16} r="0.6" fill="#fff" />
      <path d={`M${cx - rx - 0.4} ${cy - 1}c2.2-3.4 7-4.2 ${rx * 2 + 1}-0.6`} fill="none" stroke={ink} strokeWidth={feminine ? 1.7 : 1.35} strokeLinecap="round" />
      {feminine && <path d={`M${cx - rx + 0.4} ${cy - ry * 0.15}l1.1-2.6M${cx - rx * 0.35} ${cy - ry * 0.85}l0.5-2.5`} stroke={ink} strokeWidth="1" strokeLinecap="round" />}
      <path className="avatar-lid" d={`M${cx - rx} ${cy - ry}h${rx * 2}v${ry * 2}h-${rx * 2}z`} fill={skin} style={{ transform: "scaleY(0)", transformOrigin: "center top" }} />
    </g>
  );
}

function Brows({ kind, expression, feminine, ink }) {
  const lift = expression === "surpris" ? -3.2 : expression === "triste" ? 1.4 : expression === "serieux" ? 1.6 : 0;
  const thick = kind === "epais" || !feminine ? 2.1 : 1.35;
  const arch = kind === "droits" ? 0.3 : kind === "arques" ? 3.4 : 2;
  return (
    <g fill="none" stroke={ink} strokeWidth={thick} strokeLinecap="round" className="avatar-brows">
      <path d={`M36 ${50 + lift}c4 ${-arch} 10 ${-arch} 13 0.4`} />
      <path d={`M71 ${50 + lift}c3 ${-arch} 10 ${-arch} 13 0.4`} />
    </g>
  );
}

function Mouth({ expression, ink }) {
  if (expression === "surpris") return <ellipse cx="60" cy="82" rx="3.4" ry="4.4" fill="#8A3A48" stroke={ink} strokeWidth="1" />;
  if (expression === "triste") return <path d="M49 84c4-4 18-4 22 0" fill="none" stroke="#8A3A48" strokeWidth="1.8" strokeLinecap="round" />;
  if (expression === "serieux") return <path d="M51 81h18" fill="none" stroke="#8A3A48" strokeWidth="1.8" strokeLinecap="round" />;
  if (expression === "sourire" || expression === "timide" || expression === "confiant") {
    return <path d="M48 78c4 7 20 7 24 0-6 1.5-18 1.5-24 0z" fill="#C45B6A" stroke={ink} strokeWidth="1.1" />;
  }
  if (expression === "amuse") return <path d="M48 80c5 3 12 5 18 1 2-1 5 0 6 1.6" fill="none" stroke="#8A3A48" strokeWidth="1.8" strokeLinecap="round" />;
  return (
    <g>
      <path d="M48 79c4 9 20 9 24 0-5 2.4-19 2.4-24 0z" fill="#C45B6A" stroke={ink} strokeWidth="1" />
      <path d="M53 79.5c2.2 3.2 12 3.2 14.2 0" fill="#fff8f4" />
    </g>
  );
}

function HairBack({ hair, color, ink }) {
  const light = shade(color, 42);
  if (hair === "nu") return null;
  if (hair === "hijab") {
    return (
      <path className="avatar-hair" d="M8 72C10 16 28 4 60 4c32 0 50 12 52 68l-4 48H12L8 72z" fill={color} stroke={ink} strokeWidth="1.3" />
    );
  }
  if (hair === "afro" || hair === "boucles") {
    return (
      <g className="avatar-hair" fill={color} stroke={ink} strokeWidth="1.3">
        <ellipse cx="60" cy="54" rx="40" ry="34" />
        <ellipse cx="26" cy="64" rx="12" ry="14" />
        <ellipse cx="94" cy="64" rx="12" ry="14" />
        <path d="M42 26c8-3 20-2 28 3" fill="none" stroke={light} strokeWidth="1.8" />
      </g>
    );
  }
  if (hair === "locs" || hair === "tresses") {
    return (
      <g className="avatar-hair" fill="none" stroke={color} strokeLinecap="round">
        <ellipse cx="60" cy="36" rx="34" ry="18" fill={color} stroke={ink} strokeWidth="1.2" />
        {Array.from({ length: 6 }).map((_, i) => (
          <path key={i} d={`M${16 + i * 17} 42c${i % 2 ? 3 : -3} 22 0 40 ${i % 2 ? -1 : 1} 48`} stroke={color} strokeWidth={hair === "tresses" ? 4.2 : 5.6} />
        ))}
      </g>
    );
  }
  if (hair === "chignon") {
    return (
      <g className="avatar-hair" fill={color} stroke={ink} strokeWidth="1.2">
        <circle cx="60" cy="22" r="12" />
        <path d="M48 22c4-6 20-6 24 0" fill="none" stroke={light} strokeWidth="1.4" />
        <path d="M36 52c6-14 42-14 48 0" />
      </g>
    );
  }
  if (hair === "long" || hair === "lisse" || hair === "ondules" || hair === "frange") {
    return (
      <g className="avatar-hair" fill={color} stroke={ink} strokeWidth="1.2">
        <path d="M14 76C14 24 30 8 60 8c30 0 46 16 46 68l6 42H94L92 78c-2 12-12 18-32 18s-30-6-32-18L26 118H10l4-42z" />
        <path d="M28 70c1 16 0 26-1 38" fill="none" stroke={light} strokeWidth="1.8" />
        {hair === "ondules" && <path d="M92 70c2 14-3 24 0 36" fill="none" stroke={light} strokeWidth="1.8" />}
      </g>
    );
  }
  if (hair === "pics") {
    return (
      <g className="avatar-hair" fill={color} stroke={ink} strokeWidth="1.2">
        <path d="M24 64c-2-18 6-30 14-36l7 16 8-22 9 20 11-18 8 18c8 4 16 16 14 32-12-8-24-12-36-10-14 1-24 1-35 0z" />
        <path d="M42 34c5-1 8 3 11 1" fill="none" stroke={light} strokeWidth="1.5" />
      </g>
    );
  }
  return <path className="avatar-hair" d="M30 62c2-20 12-30 30-30s28 10 30 30c-8-8-20-10-30-8-10-2-22 0-30 8z" fill={color} stroke={ink} strokeWidth="1.2" />;
}

function HairFront({ hair, color, ink, feminine }) {
  const light = shade(color, 48);
  if (hair === "nu") return null;
  if (hair === "hijab") return null;
  if (hair === "afro" || hair === "boucles") {
    return <path d="M38 36c8-6 36-6 44 2" fill="none" stroke={light} strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />;
  }
  if (hair === "locs" || hair === "tresses") {
    return (
      <g className="avatar-hair" fill={color} stroke={ink} strokeWidth="1.1">
        <ellipse cx="60" cy="32" rx="28" ry="14" fill={color} stroke={ink} strokeWidth="1.1" />
        <ellipse cx="16" cy="68" rx="3" ry="24" fill={color} />
        <ellipse cx="24" cy="74" rx="2.6" ry="26" fill={color} />
        <ellipse cx="104" cy="68" rx="3" ry="24" fill={color} />
        <ellipse cx="96" cy="74" rx="2.6" ry="26" fill={color} />
      </g>
    );
  }
  return (
    <g className="avatar-hair" fill={color} stroke={ink} strokeWidth="1.15">
      <path d="M33 54c2-16 12-24 27-24s25 8 27 22c-6-4-12-6-27-6s-21 2-27 8z" />
      <path d="M46 36c5 2 9 1 12 4" fill="none" stroke={light} strokeWidth="1.5" strokeLinecap="round" />
      {hair === "pics" && <path d="M32 46l-7-16 12 12 7-18 8 16 9-14 7 16" />}
      {feminine && hair !== "pics" && hair !== "court" && <path d="M34 50c8-8 44-8 52 2-10-6-42-6-52-2z" opacity="0.95" />}
    </g>
  );
}

function Clothes({ outfit, color, feminine, ink }) {
  const cloth = color || "#1A120E";
  const deep = shade(cloth, -28);
  const shoulder = feminine ? "M16 112c12-18 24-24 44-24s32 6 44 24v16H16v-16z" : "M10 114c14-20 26-26 50-26s36 6 50 26v14H10v-14z";
  return (
    <g>
      <path d={shoulder} fill={cloth} stroke={ink} strokeWidth="1.3" />
      {outfit === "hoodie" || outfit === "street" ? (
        <g>
          <path d="M42 90c4 8 32 8 36 0-6 5-30 5-36 0z" fill={deep} />
          <path d="M54 96v16M66 96v16" stroke={shade(cloth, 70)} strokeWidth="1.5" strokeLinecap="round" />
        </g>
      ) : null}
      {outfit === "tshirt" && <path d="M46 94h28l-4 8H50l-4-8z" fill={deep} />}
      {outfit === "chemise" || outfit === "scolaire" ? <path d="M52 92l8 10 8-10v18H52V92z" fill={shade(cloth, 36)} /> : null}
      {outfit === "scolaire" && <path d="M58 98h4l-2 12z" fill="#C42B58" />}
      {outfit === "veste" && <path d="M60 92v26M44 100h32" stroke={deep} strokeWidth="1.6" />}
      {outfit === "pull" && <path d="M46 96c4 4 24 4 28 0v8H46v-8z" fill={deep} />}
    </g>
  );
}

function Accessory({ kind }) {
  if (kind === "lunettes" || kind === "glasses") {
    return (
      <g fill="none" stroke="#2A1218" strokeWidth="1.5">
        <rect x="37" y="56" width="16" height="12" rx="4" />
        <rect x="67" y="56" width="16" height="12" rx="4" />
        <path d="M53 62h14M30 61l7 1M90 61l-7 1" />
      </g>
    );
  }
  if (kind === "coeur") {
    return <path d="M92 40c0-3 4-5 4-2 0-3 4-1 4 2 0 4-4 6-4 6s-4-2-4-6z" fill="#E23B78" />;
  }
  if (kind === "casquette" || kind === "cap") {
    return (
      <g fill="#1F6A4A">
        <path d="M30 52c4-16 14-22 30-22s26 6 30 20c-14-8-46-8-60 2z" />
        <path d="M26 52h48c3 1 8 1 10 0" />
      </g>
    );
  }
  if (kind === "anneaux" || kind === "earring" || kind === "boucles") return <circle cx="92" cy="76" r="2" fill="#C9842A" />;
  if (kind === "collier") return <path d="M48 96c4 6 20 6 24 0" fill="none" stroke="#C9842A" strokeWidth="1.6" />;
  if (kind === "barrette" || kind === "bow") return <path d="M24 48l8 3-8 3 8-3 7 3-7-3 7-3-7 3z" fill="#C42B58" />;
  if (kind === "flower") {
    return (
      <g>
        <circle cx="94" cy="46" r="2.2" fill="#E25B4A" />
        <circle cx="97" cy="48.5" r="2.2" fill="#E25B4A" />
        <circle cx="91" cy="48.5" r="2.2" fill="#E25B4A" />
        <circle cx="94" cy="48" r="1.3" fill="#F7E1B5" />
      </g>
    );
  }
  if (kind === "serre-tete") return <path d="M32 50c8-10 48-10 56 0" fill="none" stroke="#C42B58" strokeWidth="3" strokeLinecap="round" />;
  if (kind === "ecouteurs") {
    return (
      <g fill="none" stroke="#2A1218" strokeWidth="2">
        <path d="M36 58c0-16 12-24 24-24s24 8 24 24" />
        <rect x="30" y="56" width="8" height="12" rx="2" fill="#1A120E" />
        <rect x="82" y="56" width="8" height="12" rx="2" fill="#1A120E" />
      </g>
    );
  }
  return null;
}

const CATS = [
  ["style", "Style", "Style"],
  ["face", "Visage", "Face"],
  ["eyes", "Yeux", "Eyes"],
  ["hair", "Cheveux", "Hair"],
  ["expr", "Expression", "Expression"],
  ["clothes", "Vêtements", "Clothes"],
  ["acc", "Accessoires", "Accessories"],
];

export function AvatarEditor({ value, onChange, tr }) {
  const current = normalize(value);
  const [cat, setCat] = useState("style");
  const [zoom, setZoom] = useState(1);
  const [full, setFull] = useState(false);
  const [past, setPast] = useState([]);
  const label = (id) => {
    const pair = LABELS[id] || [id, id];
    return tr(pair[0], pair[1]);
  };
  function set(patch) {
    setPast((stack) => [...stack.slice(-19), current]);
    onChange({ ...current, ...patch });
  }
  function undo() {
    setPast((stack) => {
      const prev = stack[stack.length - 1];
      if (prev) onChange(prev);
      return stack.slice(0, -1);
    });
  }
  return (
    <div className="avatar-editor space-y-3">
      <div className={`avatar-stage ${full ? "avatar-full" : ""}`}>
        <div className="avatar-creator-preview">
          <div className="avatar-zoom" style={{ transform: `scale(${zoom})` }}>
            <Avatar config={current} size={full ? 280 : 168} alt={tr("Aperçu de l'avatar", "Avatar preview")} />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button type="button" className="pressable rounded-full border-2 px-3 py-2 text-xs" onClick={() => setZoom((z) => Math.max(0.8, Number((z - 0.2).toFixed(2))))} aria-label={tr("Réduire", "Zoom out")}>−</button>
          <button type="button" className="pressable rounded-full border-2 px-3 py-2 text-xs" onClick={() => setZoom((z) => Math.min(1.8, Number((z + 0.2).toFixed(2))))} aria-label={tr("Agrandir", "Zoom in")}>+</button>
          <button type="button" className="pressable rounded-full border-2 px-3 py-2 text-xs" onClick={() => setFull((v) => !v)}>{full ? tr("Fermer", "Close") : tr("Plein écran", "Full screen")}</button>
          <button type="button" className="pressable rounded-full border-2 px-3 py-2 text-xs" onClick={undo} disabled={!past.length}>{tr("Annuler", "Undo")}</button>
          <button type="button" className="pressable rounded-full border-2 px-3 py-2 text-xs" onClick={() => set(stylePreset(current.style))}>{tr("Réinitialiser", "Reset")}</button>
        </div>
      </div>
      <div className="cat-tabs" role="tablist" aria-label={tr("Catégories d'avatar", "Avatar categories")}>
        {CATS.map(([id, fr, en]) => (
          <button key={id} type="button" role="tab" aria-selected={cat === id} className={`pressable rounded-full border-2 px-3 py-2 text-sm ${cat === id ? "stamp-ink" : ""}`} onClick={() => setCat(id)}>
            <span className="zoom-inner">{tr(fr, en)}</span>
          </button>
        ))}
      </div>
      {cat === "style" && (
        <div className="grid gap-2">
          {AVATAR_PRESETS.styles.map((id) => (
            <button key={id} type="button" className={`pressable rounded-2xl border-2 px-3 py-3 text-left ${current.style === id ? "stamp-ink" : ""}`} onClick={() => set(stylePreset(id))}>
              <span className="zoom-inner block justify-start">{label(id)}</span>
              <span className="mt-1 block text-xs opacity-80">{id === "masculin" ? tr("Épis, regard amande, hoodie. Ta propre version, pas une copie.", "Spikes, almond eyes, hoodie. Your own version, not a copy.") : tr("Cheveux longs, regard vif, pince cœur. Ta propre version, pas une copie.", "Long hair, bright eyes, heart clip. Your own version, not a copy.")}</span>
            </button>
          ))}
        </div>
      )}
      {cat === "face" && (
        <>
          <Row label={tr("Forme", "Shape")}>{AVATAR_PRESETS.faces.map((id) => <Chip key={id} on={current.face === id} onClick={() => set({ face: id })}>{label(id)}</Chip>)}</Row>
          <Row label={tr("Teint", "Skin")}>{AVATAR_PRESETS.skins.map((c) => <Swatch key={c} color={c} on={current.skin === c} onClick={() => set({ skin: c })} label={tr("Teint", "Skin tone")} />)}</Row>
          <button type="button" className="pressable stamp rounded-full px-4 py-2 text-sm" onClick={() => set({ freckles: !current.freckles })}>
            <span className="zoom-inner">{current.freckles ? tr("Retirer les taches", "Remove freckles") : tr("Taches de rousseur", "Freckles")}</span>
          </button>
        </>
      )}
      {cat === "eyes" && (
        <>
          <Row label={tr("Forme", "Shape")}>{AVATAR_PRESETS.eyes.map((id) => <Chip key={id} on={current.eyes === id} onClick={() => set({ eyes: id })}>{label(id)}</Chip>)}</Row>
          <Row label={tr("Couleur", "Color")}>{AVATAR_PRESETS.eyeColors.map((c) => <Swatch key={c} color={c} on={current.eyeColor === c} onClick={() => set({ eyeColor: c })} label={tr("Couleur des yeux", "Eye color")} />)}</Row>
          <Row label={tr("Sourcils", "Brows")}>{AVATAR_PRESETS.brows.map((id) => <Chip key={id} on={current.brows === id} onClick={() => set({ brows: id })}>{label(id)}</Chip>)}</Row>
        </>
      )}
      {cat === "hair" && (
        <>
          <Row label={tr("Coupe", "Cut")}>{AVATAR_PRESETS.hairs.map((id) => <Chip key={id} on={current.hair === id} onClick={() => set({ hair: id })}>{label(id)}</Chip>)}</Row>
          <Row label={tr("Couleur", "Color")}>{AVATAR_PRESETS.hairColors.map((c) => <Swatch key={c} color={c} on={current.hairColor === c} onClick={() => set({ hairColor: c })} label={tr("Couleur de cheveux", "Hair color")} />)}</Row>
        </>
      )}
      {cat === "expr" && (
        <Row label={tr("Expression", "Expression")}>{AVATAR_PRESETS.expressions.map((id) => <Chip key={id} on={current.expression === id} onClick={() => set({ expression: id })}>{label(id)}</Chip>)}</Row>
      )}
      {cat === "clothes" && (
        <>
          <Row label={tr("Tenue", "Outfit")}>{AVATAR_PRESETS.outfits.map((id) => <Chip key={id} on={current.outfit === id} onClick={() => set({ outfit: id })}>{label(id)}</Chip>)}</Row>
          <Row label={tr("Couleur", "Color")}>{AVATAR_PRESETS.outfitColors.map((c) => <Swatch key={c} color={c} on={current.outfitColor === c} onClick={() => set({ outfitColor: c })} label={tr("Couleur de tenue", "Outfit color")} />)}</Row>
        </>
      )}
      {cat === "acc" && (
        <>
          <Row label={tr("Accessoire", "Accessory")}>{AVATAR_PRESETS.accessories.map((id) => <Chip key={id} on={current.accessory === id} onClick={() => set({ accessory: id })}>{label(id)}</Chip>)}</Row>
          <Row label={tr("Fond", "Background")}>{AVATAR_PRESETS.bgs.map((c) => <Swatch key={c} color={c} on={current.bg === c} onClick={() => set({ bg: c })} label={tr("Fond", "Background")} />)}</Row>
        </>
      )}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
function Swatch({ color, on, onClick, label }) {
  return (
    <button type="button" aria-label={label} aria-pressed={on} onClick={onClick} className="h-11 w-11 rounded-full border-2" style={{ background: color, borderColor: on ? "var(--ink)" : "transparent", boxShadow: on ? "0 0 0 2px var(--card), 0 0 0 4px var(--ink)" : "none" }} />
  );
}
function Chip({ children, on, onClick }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`min-h-11 rounded-full border-2 px-3 py-2 text-xs ${on ? "stamp-ink" : "border-[var(--line)]"}`}>
      {children}
    </button>
  );
}
