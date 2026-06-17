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
          base: "#111827",
          surface: "#0f1419",
          card: "#1f2937",
          border: "#374151",
          accent: "#F97316",
        },
      },
    },
  },
  plugins: [],
};
