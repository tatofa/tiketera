import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          900: '#431407'
        },
        night: {
          900: '#08080a',
          800: '#111114',
          700: '#1c1917'
        }
      },
      boxShadow: {
        glow: '0 0 40px rgba(249, 115, 22, 0.24)'
      }
    }
  },
  plugins: []
};
export default config;
