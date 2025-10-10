/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./agenda.html", "./workshop/*.html"],
  theme: {
    extend: {
      fontFamily: {
        display: ['ui-sans-serif','system-ui','Inter','Segoe UI','Roboto','Helvetica Neue','Arial']
      },
      colors: {
        brand: {
          50: '#f5f9ff',
          100: '#e8f1ff',
          200: '#cfe1ff',
          300: '#a7c6ff',
          400: '#78a2ff',
          500: '#4d7cff',
          600: '#2956ff',
          700: '#1c3dd9',
          800: '#162fa8',
          900: '#13297f'
        }
      }
    },
  },
  plugins: [],
}
