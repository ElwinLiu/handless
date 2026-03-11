/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        DEFAULT: "var(--radius)",
      },
      colors: {
        text: "var(--color-text)",
        background: "var(--color-background)",
        "background-translucent": "var(--color-background-translucent)",
        surface: "var(--color-surface)",
        "surface-translucent": "var(--color-surface-translucent)",
        accent: "var(--color-accent)",
        muted: "var(--color-muted)",
        border: "var(--color-border)",
        error: "var(--color-error)",
        warning: "var(--color-warning)",
        success: "var(--color-success)",
        "glass-bg": "var(--color-glass-bg)",
        "glass-border": "var(--color-glass-border)",
        "glass-border-hover": "var(--color-glass-border-hover)",
        "glass-highlight": "var(--color-glass-highlight)",
      },
      boxShadow: {
        glass: "var(--shadow-glass)",
        "glass-hover": "var(--shadow-glass-hover)",
        "glass-inset": "var(--shadow-glass-inset)",
        "accent-glow": "var(--shadow-accent-glow)",
      },
      backdropBlur: {
        glass: "var(--glass-blur)",
        "glass-heavy": "var(--glass-blur-heavy)",
        "glass-light": "var(--glass-blur-light)",
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-2px)" },
          "40%, 80%": { transform: "translateX(2px)" },
        },
      },
      animation: {
        shake: "shake 0.3s ease-in-out",
      },
    },
  },
  plugins: [],
};
