import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
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
    "inline-flex items-center justify-center font-medium transition-all duration-150 rounded-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-[0.98]";

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      "bg-turf text-ink font-semibold hover:brightness-110 active:brightness-95 border border-transparent",
    secondary:
      "bg-surface-2 text-chalk border border-line hover:border-muted/50 hover:bg-surface-2/90",
    ghost:
      "bg-transparent text-muted hover:text-chalk hover:bg-surface/50 border border-transparent hover:border-line",
    danger:
      "bg-ball text-chalk font-semibold hover:brightness-110 active:brightness-95 border border-transparent",
  };

  const sizeClasses: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2.5 text-sm gap-2",
    lg: "px-6 py-3.5 text-base gap-2.5 tracking-wide",
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
