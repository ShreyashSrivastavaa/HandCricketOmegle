import React from "react";

export interface HandProps {
  value: 1 | 2 | 3 | 4 | 5 | 6 | number;
  size?: number;
  mirrored?: boolean;
  className?: string;
}

/**
 * Custom SVG Hand Cricket gesture component.
 * Features 6 authentic finger gesture vectors in a crisp, uniform stroke style (2.5px width).
 * Supports size scaling and `mirrored` variant (for opponent hand facing you).
 */
export const Hand: React.FC<HandProps> = ({
  value,
  size = 48,
  mirrored = false,
  className = "",
}) => {
  const commonProps = {
    width: size,
    height: size,
    viewBox: "0 0 64 64",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: `${mirrored ? "scale-x-[-1]" : ""} transition-transform duration-150 ${className}`,
    "aria-label": `Hand gesture ${value}${mirrored ? " (mirrored)" : ""}`,
  };

  switch (value) {
    case 1:
      // 1 Finger: Index finger extended straight up, other fingers folded into palm
      return (
        <svg {...commonProps}>
          <path d="M22 54 L22 42 C22 38 25 36 28 36" />
          <path d="M42 54 L42 42 C42 36 40 32 38 32" />
          <path d="M28 36 L28 12 C28 9.5 32 9.5 32 12 L32 32" />
          <path d="M32 32 C32 29 36 29 36 32 L36 38" />
          <path d="M36 35 C36 32 40 32 40 35 L40 40" />
          <path d="M40 38 C40 35 44 35 44 38 L44 44 C44 48 40 52 34 52" />
          <path d="M22 40 C22 34 26 34 28 37" />
        </svg>
      );

    case 2:
      // 2 Fingers: Index and middle fingers extended in a V-shape
      return (
        <svg {...commonProps}>
          <path d="M22 54 L22 42" />
          <path d="M42 54 L42 42" />
          <path d="M24 38 L26 14 C26 11 30 11 30 14 L30 32" />
          <path d="M30 32 L34 14 C34 11 38 11 38 14 L38 34" />
          <path d="M38 34 C38 31 42 31 42 34 L42 40" />
          <path d="M42 38 C42 35 46 35 46 38 L46 44 C46 48 42 52 34 52" />
          <path d="M22 40 C22 35 26 35 28 38" />
        </svg>
      );

    case 3:
      // 3 Fingers: Index, Middle, Ring extended
      return (
        <svg {...commonProps}>
          <path d="M20 54 L20 42" />
          <path d="M44 54 L44 42" />
          <path d="M24 38 L25 15 C25 12 29 12 29 15 L29 32" />
          <path d="M29 32 L32 13 C32 10 36 10 36 13 L36 32" />
          <path d="M36 32 L39 15 C39 12 43 12 43 15 L43 35" />
          <path d="M43 36 C43 33 47 33 47 36 L47 43 C47 48 42 52 34 52" />
          <path d="M20 40 C20 34 25 34 27 38" />
        </svg>
      );

    case 4:
      // 4 Fingers: Four fingers extended straight up, thumb tucked
      return (
        <svg {...commonProps}>
          <path d="M18 54 L18 42" />
          <path d="M46 54 L46 42" />
          <path d="M22 38 L23 16 C23 13 27 13 27 16 L27 32" />
          <path d="M27 32 L29 13 C29 10 33 10 33 13 L33 32" />
          <path d="M33 32 L35 14 C35 11 39 11 39 14 L39 33" />
          <path d="M39 33 L41 18 C41 15 45 15 45 18 L45 42 C45 47 40 52 32 52" />
          <path d="M18 40 C18 34 24 34 27 38" />
        </svg>
      );

    case 5:
      // 5 Fingers: Open palm with all 5 digits spread out
      return (
        <svg {...commonProps}>
          <path d="M20 54 L20 44" />
          <path d="M44 54 L44 44" />
          <path d="M20 44 C15 42 12 34 13 27 C14 24 18 24 19 28 L23 34" />
          <path d="M23 34 L24 15 C24 12 28 12 28 15 L28 31" />
          <path d="M28 31 L31 12 C31 9 35 9 35 12 L35 31" />
          <path d="M35 31 L38 14 C38 11 42 11 42 14 L42 33" />
          <path d="M42 33 L45 19 C45 16 49 16 49 19 L49 41 C49 47 43 52 34 52" />
        </svg>
      );

    case 6:
      // 6: Authentic hand cricket sixer gesture: Thumb held out/up like a hitchhiker/sixer!
      return (
        <svg {...commonProps}>
          <path d="M24 54 L24 44" />
          <path d="M44 54 L44 44" />
          <path d="M24 42 C20 40 15 32 15 20 C15 16 20 16 22 20 L26 31" />
          <path d="M26 31 C26 27 32 27 32 31 L32 37" />
          <path d="M32 34 C32 30 38 30 38 34 L38 40" />
          <path d="M38 37 C38 33 44 33 44 37 L44 42" />
          <path d="M44 40 C44 37 47 37 47 40 L47 44 C47 49 42 52 34 52" />
        </svg>
      );

    default:
      // Closed fist ready state
      return (
        <svg {...commonProps}>
          <path d="M22 54 L22 42" />
          <path d="M42 54 L42 42" />
          <path d="M22 40 C22 32 30 30 34 30 C38 30 44 32 44 40 L44 46 C44 51 38 53 32 53 C26 53 22 50 22 45 Z" />
          <path d="M24 38 C28 35 34 35 40 38" />
        </svg>
      );
  }
};
