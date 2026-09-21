/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Habilita o dark mode via classe CSS
  theme: {
    extend: {
      colors: {
        sll: {
          blue: '#0094eb',
          orange: '#fd8539',
        },
        dark: {
          bg: '#0f172a', // Fundo principal escuro (baseado no print)
          card: '#1e293b', // Fundo dos cards escuro
          sidebar: '#0b1120', // Fundo da sidebar escura
        },
        light: {
          bg: '#f8fafc', // Fundo principal claro
          card: '#ffffff', // Fundo dos cards claro
          sidebar: '#ffffff', // Fundo da sidebar clara
        }
      },
    },
  },
  plugins: [],
}
