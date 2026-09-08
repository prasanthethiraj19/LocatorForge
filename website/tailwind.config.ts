import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ember: {
          50: '#fff6ed',
          100: '#ffead3',
          200: '#ffd2a5',
          300: '#ffb26d',
          400: '#fb8a3d',
          500: '#f16a13',
          600: '#e14f08',
          700: '#ba3a09',
          800: '#942f0f',
          900: '#78290f',
          950: '#41120a',
        },
        forge: {
          950: '#0c0a09',
          900: '#141210',
          850: '#1c1917',
          800: '#292524',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgb(225 79 8 / 0.12), 0 8px 40px -8px rgb(225 79 8 / 0.25)',
        panel: '0 1px 2px rgb(28 25 23 / 0.06), 0 20px 50px -20px rgb(28 25 23 / 0.25)',
      },
    },
  },
  plugins: [],
} satisfies Config;
