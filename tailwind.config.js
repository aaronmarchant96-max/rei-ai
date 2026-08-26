/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0A",
        surface: "#111111",
        hinge: {
          DEFAULT: "#E2A33D", // Amber (single brand accent)
          bright: "#E2A33D",  // Amber
        },
        slate: {
          900: "#0F172A",
          800: "#1E293B",
          700: "#334155",
        },
        border: "#27272A",
        muted: "#3F3F46",
        foreground: "#F8FAFC",
        "foreground-muted": "#A6AFC4",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        heading: ["\"Space Grotesk\"", "sans-serif"],
        mono: ["\"JetBrains Mono\"", "monospace"],
      },
      keyframes: {
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.6" },
        },
        glow: {
          from: { boxShadow: "0 0 0 0 rgba(245, 158, 11, 0.4)" },
          to:   { boxShadow: "0 0 0 8px rgba(245, 158, 11, 0)" },
        },
      },
      animation: {
        "pivot-slow": "spin 20s linear infinite",
        "slide-up": "slide-up 0.35s ease-out both",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        glow: "glow 1.5s ease-out infinite",
      },
    },
  },
  plugins: [],
};
