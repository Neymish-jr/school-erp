/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        erp: {
          base: "#0f172a",
          surface: "#0c1222",
          card: "#111827",
          border: "#1e293b",
          accent: "#06b6d4",
        },
      },
    },
  },
  plugins: [],
}