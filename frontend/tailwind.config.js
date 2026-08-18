/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        app: {
          background: "rgb(var(--color-background) / <alpha-value>)",
          surface: "rgb(var(--color-surface) / <alpha-value>)",
          "surface-muted": "rgb(var(--color-surface-muted) / <alpha-value>)",
          text: "rgb(var(--color-text-primary) / <alpha-value>)",
          "text-muted": "rgb(var(--color-text-secondary) / <alpha-value>)",
          border: "rgb(var(--color-border) / <alpha-value>)",
          primary: "rgb(var(--color-primary) / <alpha-value>)",
          "primary-hover": "rgb(var(--color-primary-hover) / <alpha-value>)",
          "primary-active": "rgb(var(--color-primary-active) / <alpha-value>)",
          "primary-soft": "rgb(var(--color-primary-soft) / <alpha-value>)",
          "primary-border": "rgb(var(--color-primary-border) / <alpha-value>)",
          "primary-foreground": "rgb(var(--color-primary-foreground) / <alpha-value>)",
          accent: "rgb(var(--color-accent) / <alpha-value>)",
          success: "rgb(var(--color-success) / <alpha-value>)",
          warning: "rgb(var(--color-warning) / <alpha-value>)",
          error: "rgb(var(--color-error) / <alpha-value>)",
          focus: "rgb(var(--color-focus-ring) / <alpha-value>)"
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        panel: "0 18px 55px rgba(15, 23, 42, 0.08)",
        premium: "0 24px 80px rgba(67, 56, 202, 0.14)"
      }
    }
  },
  plugins: []
};
