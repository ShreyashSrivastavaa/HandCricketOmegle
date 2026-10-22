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
      },
      fontFamily: {
        heading: ["var(--font-barlow-condensed)", "sans-serif"],
        score: ["var(--font-barlow-condensed)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
        chip: "999px",
      },
      borderWidth: {
        DEFAULT: "1px",
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
