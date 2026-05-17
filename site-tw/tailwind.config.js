import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./agenda.html",
    "./public/docs/**/*.md",
    "./src/**/*.{js,ts,jsx,tsx,md}",
  ],
  theme: {
    extend: {
      colors: { brand: { DEFAULT: "#6EE7F9" } }
    }
  },
  plugins: [typography]
};
