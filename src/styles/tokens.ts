/**
 * Hand Cricket Arena - Design System Tokens
 * Source of truth for all styling, colors, radii, spacing, and typography.
 */
export const TOKENS = {
  colors: {
    ink: "#0B1210",       // Primary background
    surface: "#121C18",   // Surface 1 (panels, header)
    surface2: "#1A2722",  // Surface 2 (active cards, hover)
    line: "#2A3A33",      // 1px borders
    chalk: "#F2EFE6",     // High contrast text
    muted: "#8FA39A",     // Secondary text
    turf: "#3DDC84",      // Primary / You / Safe / Boundary
    ball: "#FF4D4D",      // Wicket / Danger / Out
    amber: "#FFB020",     // Runs / Highlights / Count-up
    sky: "#4DA3FF",       // Opponent / Bowling
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
    card: "12px",
    pill: "999px",
  },
  border: {
    width: "1px",
    style: "solid",
    color: "#2A3A33",
  },
  fonts: {
    heading: "var(--font-barlow-condensed), sans-serif",
    ui: "var(--font-inter), sans-serif",
  },
} as const;

export type TokenColor = keyof typeof TOKENS.colors;
