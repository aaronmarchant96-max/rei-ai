import relumeTailwind from "@relume_io/relume-tailwind";

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
          DEFAULT: "#D4AF37", // Brass
          bright: "#F59E0B",  // Gold
        },
        border: "#27272A",
        muted: "#3F3F46",
        foreground: "#F8FAFC",
        "foreground-muted": "#94A3B8",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        heading: ['"Space Grotesk"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      animation: {
        "pivot-slow": "spin 20s linear infinite",
      },
    },
  },
  presets: [relumeTailwind],
  plugins: [],
}
