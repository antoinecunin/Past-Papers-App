/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Couleurs principales - thémables par instance
        primary: {
          DEFAULT: "#2563eb",
          hover: "#1d4ed8",
          light: "#dbeafe",
        },
        // Couleurs neutres - fixes
        secondary: {
          DEFAULT: "#64748b",
          dark: "#334155",
        },
        // Backgrounds - fixes
        bg: {
          primary: "#ffffff",
          secondary: "#f8fafc",
          tertiary: "#f1f5f9",
        },
        // Bordures - fixes
        border: {
          DEFAULT: "#e2e8f0",
          focus: "#3b82f6",
        },
        // Sémantiques - fixes
        success: {
          DEFAULT: "#10b981",
          bg: "#d1fae5",
        },
        warning: {
          DEFAULT: "#f59e0b",
          bg: "#fef3c7",
        },
        error: {
          DEFAULT: "#ef4444",
          bg: "#fee2e2",
        },
        info: {
          DEFAULT: "#3b82f6",
          bg: "#dbeafe",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        card: "0.75rem", // 12px pour les cards
        input: "0.5rem", // 8px pour les inputs
      },
      maxWidth: {
        "container-sm": "640px",
        "container-md": "768px",
        "container-lg": "1024px",
        "container-xl": "1280px",
      },
    },
  },
  plugins: [],
};
