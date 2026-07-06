/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        cream: '#fff8ef',
        parchment: '#f8ecd7',
        ink: '#2f2a25',
        date: '#8a5f3f',
        rose: '#eeb7ad',
        mint: '#b9d8c2',
        sky: '#b8dce8',
        honey: '#f2ca7e',
        plum: '#7a5c79'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif']
      },
      boxShadow: {
        soft: '0 18px 45px rgba(89, 64, 42, 0.12)'
      }
    }
  },
  plugins: []
};
