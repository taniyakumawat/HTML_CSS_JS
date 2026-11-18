/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Navy blue primary palette
        navy: {
          50: '#f4f6fb',
          100: '#e8ecf6',
          200: '#ccd6ec',
          300: '#a3b4dc',
          400: '#7287c7',
          500: '#4f63b2',
          600: '#3b4a96',
          700: '#313d7a',
          800: '#2b3565',
          900: '#1f2748',
          950: '#131730',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.06)',
      },
    },
  },
  plugins: [],
};
