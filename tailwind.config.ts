import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pelican: {
          50: "#eefdf6",
          100: "#d6fbe9",
          200: "#aff5d5",
          300: "#79eab9",
          400: "#3dd697",
          500: "#16bd7c",
          600: "#089a64",
          700: "#077b53",
          800: "#096143",
          900: "#085039",
          950: "#022d20",
        },
        ink: {
          DEFAULT: "#0f1f1a",
          soft: "#42514b",
          faint: "#7a8a84",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(8, 97, 67, 0.25)",
        card: "0 4px 24px -8px rgba(15, 31, 26, 0.12)",
        glow: "0 8px 32px -8px rgba(22, 189, 124, 0.45)",
      },
      borderRadius: {
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
