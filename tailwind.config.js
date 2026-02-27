/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
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
      },
    },
  },
  plugins: [],
};
