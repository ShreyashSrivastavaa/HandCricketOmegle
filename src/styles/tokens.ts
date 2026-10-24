/**
 * Hand Cricket Arena - Design System Tokens
 * Source of truth for all styling, colors, radii, spacing, and typography.
 */
export const TOKENS = {
  colors: {
    ink: "#050b16",
    surface: "#0b1628",
    surface2: "#12213a",
    line: "#23324a",
    chalk: "#f8fafc",
    muted: "#94a3b8",
    turf: "#f7b500",
    ball: "#ef4444",
    amber: "#fbbf24",
    sky: "#22c55e",
    indigo: "#a855f7",
  },
  spacing: {
    4: "4px",
    8: "8px",
    12: "12px",
    16: "16px",
    24: "24px",
    32: "32px",
  },
  radius: {
    card: "20px",
    pill: "999px",
  },
  border: {
    width: "1px",
    style: "solid",
    color: "#23324a",
  },
  fonts: {
    heading: "var(--font-poppins), sans-serif",
    serif: "var(--font-poppins), sans-serif",
    ui: "var(--font-inter), sans-serif",
  },
} as const;

export type TokenColor = keyof typeof TOKENS.colors;
