import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#16A34A', 600: '#16A34A', 700: '#15803D' },
      },
    },
  },
  plugins: [],
} satisfies Config;
