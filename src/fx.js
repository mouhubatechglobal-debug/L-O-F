let ctx;
let muted = false;
try {
  muted = localStorage.getItem("lof-mute") === "1";
} catch {
  muted = false;
}

export function soundMuted() {
  return muted;
}

export function setSoundMuted(value) {
  muted = Boolean(value);
  try {
    localStorage.setItem("lof-mute", muted ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function audio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq, dur = 0.12, type = "sine", gain = 0.06) {
  if (muted) return;
  try {
    const c = audio();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur + 0.02);
  } catch {
    /* autoplay or unsupported */
  }
}

export function buzz(ms = 12) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* ignore */
  }
}

export const fx = {
  tap() {
    tone(540, 0.06, "triangle", 0.04);
    buzz(8);
  },
  flip() {
    tone(220, 0.08, "sine", 0.05);
    setTimeout(() => tone(460, 0.1, "triangle", 0.045), 70);
    buzz(10);
  },
  place() {
    tone(320, 0.07, "square", 0.03);
    buzz(8);
  },
  good() {
    tone(523, 0.1, "sine", 0.06);
    setTimeout(() => tone(659, 0.12, "sine", 0.05), 90);
    setTimeout(() => tone(784, 0.16, "sine", 0.045), 170);
    buzz(16);
  },
  bad() {
    tone(196, 0.18, "sawtooth", 0.025);
    buzz(20);
  },
  win() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.16, "triangle", 0.055), i * 110));
    buzz(28);
  },
};
