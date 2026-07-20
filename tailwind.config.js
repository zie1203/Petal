/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        petal: {
          bg: '#fdfbf7',     
          border: '#f0ece1', 
          text: '#5c584f',   
          accent: '#ffb3c6', 
        }
      },
      fontFamily: {
        sans: ['Quicksand', 'sans-serif'], 
      }
    },
  },
  plugins: [],
}