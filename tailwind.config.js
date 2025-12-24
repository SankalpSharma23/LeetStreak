/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/popup/**/*.{js,jsx,ts,tsx}",
    "./src/options/**/*.{js,jsx,ts,tsx}",
    "./src/shared/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: '#18181B',
        surface: '#27272A',
        surfaceHover: '#3F3F46',
        primary: '#F59E0B',
        primaryHover: '#D97706',
        secondary: '#10B981',
        accent: '#8B5CF6',
        inverted: '#18181B',
        text: {
          main: '#F4F4F5',
          muted: '#A1A1AA',
        },
        leetcode: {
          easy: '#00B8A3',
          medium: '#FFC01E',
          hard: '#FF375F'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    }
  },
  plugins: [],
}