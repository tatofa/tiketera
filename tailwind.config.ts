import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff1f2',
          100: '#ffe4e6',
          500: '#ef233c',
          600: '#dc143c',
          700: '#b80f2f',
          900: '#3b0710'
        },
        disco: {
          red: '#ef233c',
          redDark: '#8f0f23',
          redSoft: '#ff4d64',
          white: '#fff7f7',
          black: '#050505',
          gray: '#252632'
        },
        night: {
          950: '#030303',
          900: '#070707',
          800: '#111111',
          700: '#1c1c1f'
        }
      },
      boxShadow: {
        glow: '0 0 44px rgba(239, 35, 60, 0.28)',
        redglow: '0 0 38px rgba(239, 35, 60, 0.34)',
        whiteglow: '0 0 28px rgba(255, 255, 255, 0.14)'
      }
    }
  },
  plugins: []
};
export default config;
