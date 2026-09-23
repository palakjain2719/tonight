"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
}

const VARIANTS: Record<string, string> = {
  primary: "bg-ember-500 text-white hover:bg-ember-600 shadow-glow disabled:bg-base-700 disabled:text-muted disabled:shadow-none",
  secondary: "bg-white text-ink border border-base-700 hover:border-ember-500/60 hover:bg-base-950 shadow-card",
  ghost: "bg-transparent text-muted hover:text-ink hover:bg-base-900",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", fullWidth, className = "", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={`${VARIANTS[variant]} ${fullWidth ? "w-full" : ""} inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-semibold text-base transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${className}`}
      {...rest}
    />
  );
});
