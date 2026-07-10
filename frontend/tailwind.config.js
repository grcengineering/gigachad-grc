/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand: emerald, kept for "compliance/passing" semantic.
        // On light bg, prefer brand-600 / brand-700 for text and chips.
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        // Accent: warm terracotta (Anthropic-inspired). Use for emphasis,
        // not for status. Prefer accent-600 / accent-700 for text on light bg.
        accent: {
          50: '#fdf4f0',
          100: '#fbe7df',
          200: '#f6cab9',
          300: '#efa78d',
          400: '#e58266',
          500: '#d97757',
          600: '#c25e3c',
          700: '#a14a2e',
          800: '#823c28',
          900: '#6a3322',
          950: '#3a1a11',
        },
        // Surface: warm cream → warm ink (light-mode native).
        // surface-50  = canvas / page bg
        // surface-100 = subtle hover surfaces
        // surface-200 = light borders, dividers
        // surface-300 = stronger borders
        // surface-400 = placeholder text
        // surface-500 = secondary muted text
        // surface-600 = body muted text
        // surface-700 = body text
        // surface-800 = strong body text
        // surface-900 = primary text (warm near-black)
        // surface-950 = ink, deepest emphasis
        surface: {
          50: '#fcfcfb',
          100: '#f5f4f1',
          200: '#e8e7e2',
          300: '#cfcec8',
          400: '#8a8884',
          500: '#5e5d5a',
          600: '#454441',
          700: '#2f2e2c',
          800: '#1f1e1c',
          900: '#14130f',
          950: '#0a0908',
        },
      },
      fontFamily: {
        sans: ['Inter var', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        display: ['32px', { lineHeight: '38px', fontWeight: '600', letterSpacing: '-0.025em' }],
        h1: ['26px', { lineHeight: '32px', fontWeight: '600', letterSpacing: '-0.02em' }],
        h2: ['18px', { lineHeight: '26px', fontWeight: '600', letterSpacing: '-0.012em' }],
        h3: ['15px', { lineHeight: '22px', fontWeight: '600', letterSpacing: '-0.005em' }],
        body: ['14px', { lineHeight: '20px', fontWeight: '400' }],
        small: ['13px', { lineHeight: '18px', fontWeight: '400' }],
      },
      spacing: {
        'row-compact': '0.5rem',
        'row-cozy': '0.75rem',
        'row-comfy': '1rem',
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      boxShadow: {
        // Light-mode shadow system — warm, subtle. No inset highlights (those are dark-mode tricks).
        lift: '0 1px 2px 0 rgb(30 25 20 / 0.06), 0 0 0 1px rgb(30 25 20 / 0.04)',
        'lift-hover': '0 4px 12px -2px rgb(30 25 20 / 0.1), 0 0 0 1px rgb(30 25 20 / 0.06)',
        'glow-brand': '0 0 0 1px rgb(5 150 105 / 0.4), 0 0 24px -8px rgb(5 150 105 / 0.3)',
        'glow-accent': '0 0 0 1px rgb(217 119 87 / 0.4), 0 0 24px -8px rgb(217 119 87 / 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
