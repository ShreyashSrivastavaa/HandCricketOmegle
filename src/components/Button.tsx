import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "yellow";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  children,
  className = "",
  disabled = false,
  ...props
}) => {
  const isDisabled = disabled || loading;

  const baseClasses =
    "inline-flex items-center justify-center font-bold tracking-[0.05em] transition-all duration-150 rounded-[100px] border-2 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-hi-vis-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-dusk-violet disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-[0.98]";

  const variantClasses: Record<ButtonVariant, string> = {
    // Gate Pill Button: Cream fill, Pure Black text & border, 100px pill
    primary:
      "bg-bone-white text-pure-black border-pure-black hover:bg-bone-white/90 active:bg-bone-white/80 font-bold",
    // Outlined Display Button: Transparent fill, 2px Hi-Vis Yellow border & text
    secondary:
      "bg-transparent text-hi-vis-yellow border-hi-vis-yellow hover:bg-hi-vis-yellow/15 active:bg-hi-vis-yellow/25 font-bold",
    // Underline / Ghost
    ghost:
      "bg-transparent text-bone-white hover:text-hi-vis-yellow border-transparent hover:border-bone-white/40",
    // Firecracker Red hard action
    danger:
      "bg-firecracker-red text-bone-white border-pure-black font-bold hover:brightness-110 active:brightness-95",
    // Hi-Vis Yellow filled
    yellow:
      "bg-hi-vis-yellow text-pure-black border-pure-black font-bold hover:bg-buttery-yellow active:brightness-95",
  };

  const sizeClasses: Record<ButtonSize, string> = {
    sm: "px-3.5 py-1.5 text-xs gap-1.5",
    md: "px-[17px] py-2.5 text-sm gap-2",
    lg: "px-[22px] py-3 text-base gap-2.5 tracking-[0.05em]",
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
      {children}
    </button>
  );
};
