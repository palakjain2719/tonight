import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#f6f0e8",
          900: "#ede7dd",
          800: "#ffffff",
          700: "#d2c9bb",
        },
        ember: {
          400: "#c4553a",
          500: "#b5411a",
          600: "#8a2c13",
        },
        mint: {
          400: "#5a9469",
          500: "#4a7c59",
        },
        ink: "#1c1510",
        muted: "#7a6a5a",
        faint: "#a08874",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 32px -8px rgba(181, 65, 26, 0.35)",
        card: "0 2px 16px rgba(28, 21, 16, 0.08)",
        lift: "0 8px 40px rgba(28, 21, 16, 0.18)",
      },
      keyframes: {
        "pop-in": {
          "0%": { transform: "scale(0.82) translateY(16px)", opacity: "0" },
          "65%": { transform: "scale(1.04) translateY(-4px)", opacity: "1" },
          "100%": { transform: "scale(1) translateY(0)", opacity: "1" },
        },
        "stamp-in": {
          "0%": { transform: "scale(1.6) rotate(-8deg)", opacity: "0" },
          "55%": { transform: "scale(0.96) rotate(1.5deg)", opacity: "1" },
          "80%": { transform: "scale(1.02) rotate(-0.5deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        "rise-up": {
          "0%": { transform: "translateY(60px)", opacity: "0" },
          "70%": { transform: "translateY(-8px)", opacity: "1" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        confetti: {
          "0%": { transform: "translateY(-20px) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(110vh) rotate(720deg)", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "pop-in": "pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "stamp-in": "stamp-in 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "rise-up": "rise-up 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "fade-in": "fade-in 0.4s ease forwards",
        shimmer: "shimmer 2s linear infinite",
        "spin": "spin 1s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
