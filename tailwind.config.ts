import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#facc15',
          600: '#eab308',
          700: '#ca8a04',
          900: '#422006'
        },
        disco: {
          red: '#ef233c',
          yellow: '#facc15',
          green: '#22c55e',
          white: '#fff7ed',
          black: '#070707'
        },
        night: {
          900: '#070707',
          800: '#101010',
          700: '#1a1717'
        }
      },
      boxShadow: {
        glow: '0 0 44px rgba(250, 204, 21, 0.24)',
        redglow: '0 0 34px rgba(239, 35, 60, 0.22)',
        greenglow: '0 0 34px rgba(34, 197, 94, 0.18)'
      }
    }
  },
  plugins: []
};
export default config;
