"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
}

const VARIANTS: Record<string, string> = {
  primary: "bg-ember-500 text-base-950 hover:bg-ember-400 shadow-glow disabled:bg-base-700 disabled:text-white/40 disabled:shadow-none",
  secondary: "bg-base-800 text-white border border-white/10 hover:bg-base-700",
  ghost: "bg-transparent text-white/70 hover:text-white hover:bg-white/5",
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
