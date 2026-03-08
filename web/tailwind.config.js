/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          700: '#0f3460',
          800: '#0a2647',
          900: '#061a30',
        },
      },
    },
  },
  plugins: [],
}
