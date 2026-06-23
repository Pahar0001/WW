import type { Config } from 'tailwindcss';

// Vela design tokens — calm, warm, low-contrast.
// Colors are driven by HSL CSS variables (shadcn-style) so the whole app
// recolors at once and supports light/dark themes. Existing class names
// (bg-ink, text-paper, text-aurora, border-ink-line) keep working — they now
// resolve to the calm palette and respond to the theme.
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // canvas / surfaces
        ink: {
          DEFAULT: 'hsl(var(--bg) / <alpha-value>)',
          soft: 'hsl(var(--bg-2) / <alpha-value>)',
          line: 'hsl(var(--line) / <alpha-value>)',
        },
        // text
        paper: {
          DEFAULT: 'hsl(var(--fg) / <alpha-value>)',
          dim: 'hsl(var(--fg-2) / <alpha-value>)',
          faint: 'hsl(var(--fg-3) / <alpha-value>)',
        },
        // single calm accent (eucalyptus / sage)
        aurora: 'hsl(var(--primary) / <alpha-value>)',
        'aurora-fg': 'hsl(var(--primary-fg) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
      letterSpacing: { tightest: '-0.04em' },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
      },
      transitionTimingFunction: { smooth: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        rise: 'rise 0.9s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fade-in 0.5s ease both',
      },
    },
  },
  plugins: [],
};
export default config;
