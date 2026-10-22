/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // <-- ADDED THIS LINE
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#14b8a6', // Vibrant Mint
          600: '#0d9488', 
          700: '#0f766e', // Ocean Blue / Teal (Primary)
          900: '#134e4a',
        },
        accent: {
          500: '#10b981', // Money Green
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}