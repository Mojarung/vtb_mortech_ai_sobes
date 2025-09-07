/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f8f7ff',
          100: '#f0edff',
          200: '#e3deff',
          300: '#d0c4ff',
          400: '#b79aff',
          500: '#9d70ff',
          600: '#8b5cf6',
          700: '#7c3aed',
          800: '#6b21d4',
          900: '#4c1d95',
          950: '#2e1065',
        },
        background: {
          DEFAULT: '#0a0a0a',
          secondary: '#1a1a1a',
          tertiary: '#2a2a2a',
        },
        text: {
          DEFAULT: '#ffffff',
          muted: '#a1a1aa',
          accent: '#8b5cf6',
        }
      }
    },
  },
  plugins: [],
}
