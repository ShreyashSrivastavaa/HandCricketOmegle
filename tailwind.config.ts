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
        ink: "rgb(var(--color-ink-rgb) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--color-surface-rgb) / <alpha-value>)",
          2: "rgb(var(--color-surface-2-rgb) / <alpha-value>)",
        },
        line: "rgb(var(--color-line-rgb) / <alpha-value>)",
        chalk: "rgb(var(--color-chalk-rgb) / <alpha-value>)",
        muted: "rgb(var(--color-muted-rgb) / <alpha-value>)",
        turf: {
          DEFAULT: "rgb(var(--color-turf-rgb) / <alpha-value>)",
          hover: "rgb(var(--color-turf-hover-rgb) / <alpha-value>)",
        },
        ball: "rgb(var(--color-ball-rgb) / <alpha-value>)",
        amber: {
          DEFAULT: "rgb(var(--color-amber-rgb) / <alpha-value>)",
          highlight: "rgb(var(--color-amber-rgb) / <alpha-value>)",
        },
        sky: "rgb(var(--color-sky-rgb) / <alpha-value>)",
        indigo: "rgb(var(--color-indigo-rgb) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-poppins)", "sans-serif"],
        heading: ["var(--font-poppins)", "sans-serif"],
        score: ["var(--font-poppins)", "sans-serif"],
        serif: ["var(--font-poppins)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        card: "20px",
        chip: "999px",
      },
      borderWidth: {
        DEFAULT: "1px",
      },
      boxShadow: {
        glow: "0 14px 40px -22px rgba(247, 181, 0, 0.45)",
        "glow-strong": "0 20px 54px -24px rgba(247, 181, 0, 0.55)",
        "glow-sky": "0 14px 40px -24px rgba(34, 197, 94, 0.45)",
        "glow-ball": "0 14px 40px -24px rgba(239, 68, 68, 0.45)",
        panel: "0 30px 90px -50px rgba(0, 0, 0, 0.9)",
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-6px)" },
          "40%, 80%": { transform: "translateX(6px)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0) rotate(-2deg)" },
          "50%": { transform: "translateY(-14px) rotate(2deg)" },
        },
        scan: {
          "0%": { transform: "translateY(-10%)", opacity: "0" },
          "15%": { opacity: "0.75" },
          "85%": { opacity: "0.75" },
          "100%": { transform: "translateY(560%)", opacity: "0" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.6" },
          "100%": { transform: "scale(1.9)", opacity: "0" },
        },
        shine: {
          "0%": { transform: "translateX(-130%) skewX(-18deg)" },
          "100%": { transform: "translateX(230%) skewX(-18deg)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "grid-pan": {
          "0%": { backgroundPosition: "0px 0px, 0px 0px" },
          "100%": { backgroundPosition: "0px 64px, 64px 0px" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        shake: "shake 0.35s ease-in-out",
        float: "float 6s ease-in-out infinite",
        "float-slow": "float-slow 9s ease-in-out infinite",
        scan: "scan 3.4s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        "pulse-ring": "pulse-ring 2.4s cubic-bezier(0.2, 0.6, 0.4, 1) infinite",
        shine: "shine 3.2s ease-in-out infinite",
        marquee: "marquee 34s linear infinite",
        "grid-pan": "grid-pan 14s linear infinite",
        "fade-up": "fade-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) both",
        "spin-slow": "spin-slow 22s linear infinite",
      },
      backgroundImage: {
        "radial-fade": "radial-gradient(circle at center, var(--tw-gradient-from), transparent 70%)",
      },
    },
  },
  plugins: [],
};

export default config;
