import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "var(--color-ink)",
        surface: {
          DEFAULT: "var(--color-surface)",
          2: "var(--color-surface-2)",
        },
        line: "var(--color-line)",
        chalk: "var(--color-chalk)",
        muted: "var(--color-muted)",
        turf: {
          DEFAULT: "var(--color-turf)",
          hover: "var(--color-turf-hover)",
        },
        ball: "var(--color-ball)",
        amber: {
          DEFAULT: "var(--color-amber)",
          highlight: "var(--color-amber)",
        },
        sky: "var(--color-sky)",
        indigo: "var(--color-indigo)",
        pink: "var(--color-pink)",

        /* Flying Papers Direct Palette */
        "dusk-violet": "var(--color-dusk-violet)",
        "hi-vis-yellow": "var(--color-hi-vis-yellow)",
        "buttery-yellow": "var(--color-buttery-yellow)",
        "lilac-shadow": "var(--color-lilac-shadow)",
        "bubblegum-pink": "var(--color-bubblegum-pink)",
        "matcha-cream": "var(--color-matcha-cream)",
        "magenta-punch": "var(--color-magenta-punch)",
        "firecracker-red": "var(--color-firecracker-red)",
        "bone-white": "var(--color-bone-white)",
        "ink-black": "var(--color-ink-black)",
        "pure-black": "var(--color-pure-black)",
      },
      fontFamily: {
        heading: ["var(--font-barlow-condensed)", "Impact", "Arial Black", "sans-serif"],
        score: ["var(--font-barlow-condensed)", "Impact", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        card: "6px",
        pill: "100px",
        chip: "100px",
        button: "100px",
        tag: "100px",
      },
      borderWidth: {
        DEFAULT: "2px",
        1: "1px",
        2: "2px",
        3: "3px",
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-6px)" },
          "40%, 80%": { transform: "translateX(6px)" },
        },
      },
      animation: {
        shake: "shake 0.35s ease-in-out",
      },
    },
  },
  plugins: [],
};

export default config;
