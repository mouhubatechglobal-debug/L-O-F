/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        rose: "var(--rose)",
        leaf: "var(--leaf)",
        gold: "var(--gold)",
        paper: "var(--card)",
        muted: "var(--muted)",
      },
      fontFamily: {
        display: ["Fraunces", "Iowan Old Style", "Palatino", "serif"],
        sans: ["Outfit", "Avenir Next", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        stamp: "var(--shadow)",
      },
    },
  },
  plugins: [],
};
