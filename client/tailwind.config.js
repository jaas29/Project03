/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        pitch: {
          50: '#f0fdf4',
          500: '#22c55e',
          900: '#14532d',
        },
      },
    },
  },
  plugins: [],
};
