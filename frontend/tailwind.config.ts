import type { Config } from 'tailwindcss';

// Vela design tokens. Ultra-minimal, cinematic, premium.
// Near-black canvas, warm off-white ink, a single restrained accent (aurora teal).
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0a0b0d', // canvas
          soft: '#101216',
          line: '#1c1f26',
        },
        paper: {
          DEFAULT: '#f4f1ea', // warm off-white text
          dim: '#a7a39a',
          faint: '#6b6862',
        },
        aurora: '#7fe3d0', // single accent
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        rise: 'rise 0.9s cubic-bezier(0.22,1,0.36,1) both',
      },
    },
  },
  plugins: [],
};
export default config;
