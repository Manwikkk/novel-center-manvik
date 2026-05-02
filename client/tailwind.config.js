/**
 * Tailwind config encoding the Stitch "Novel Centre Editorial Core"
 * design system. Tokens here are the SINGLE source of truth for the
 * Stitch design system in the client.
 *
 * The colour names below mirror Stitch's M3-style token vocabulary
 * (`surface-container-*`, `on-surface-*`, `tertiary-fixed-*`,
 * `inverse-surface`, ...) so we can paste pixel-perfect Stitch markup
 * into our React tree with zero translation.  We also keep the legacy
 * cream/ink/gold aliases for older components that still use them.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
    './stores/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#fff8f1',
          50: '#ffffff',
          100: '#fff8f1',
          200: '#fbf2e8',
          300: '#f5ede2',
          400: '#efe7dd',
          500: '#e9e1d7',
          600: '#e0d9cf',
        },
        ink: {
          DEFAULT: '#0A0A0A',
          900: '#0A0A0A',
          800: '#1c1b1b',
          700: '#1e1b15',
          600: '#343029',
          500: '#444748',
          400: '#5e5e5c',
          300: '#747878',
          200: '#c4c7c7',
        },
        stone: {
          DEFAULT: '#6B665E',
        },
        gold: {
          DEFAULT: '#C2A878',
          dim: '#a88f5f',
          soft: '#e6d6b3',
        },
        danger: {
          DEFAULT: '#ba1a1a',
          50: '#ffdad6',
        },

        // Stitch Material 3 design tokens (verbatim names).
        background: '#fff8f1',
        surface: '#fff8f1',
        'surface-bright': '#fff8f1',
        'surface-dim': '#e0d9cf',
        'surface-tint': '#5f5e5e',
        'surface-variant': '#e9e1d7',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#fbf2e8',
        'surface-container': '#f5ede2',
        'surface-container-high': '#efe7dd',
        'surface-container-highest': '#e9e1d7',

        primary: '#000000',
        'on-primary': '#ffffff',
        'primary-container': '#1c1b1b',
        'on-primary-container': '#858383',
        'primary-fixed': '#e5e2e1',
        'primary-fixed-dim': '#c9c6c5',
        'on-primary-fixed': '#1c1b1b',
        'on-primary-fixed-variant': '#474646',

        secondary: '#5e5e5c',
        'on-secondary': '#ffffff',
        'secondary-container': '#e1dfdc',
        'on-secondary-container': '#636360',
        'secondary-fixed': '#e4e2de',
        'secondary-fixed-dim': '#c8c6c3',
        'on-secondary-fixed': '#1b1c1a',
        'on-secondary-fixed-variant': '#474744',

        tertiary: '#000000',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#261900',
        'on-tertiary-container': '#988154',
        'tertiary-fixed': '#fcdfab',
        'tertiary-fixed-dim': '#dfc391',
        'on-tertiary-fixed': '#261900',
        'on-tertiary-fixed-variant': '#57441d',

        'on-surface': '#1e1b15',
        'on-surface-variant': '#444748',
        'on-background': '#1e1b15',
        'inverse-surface': '#343029',
        'inverse-on-surface': '#f8f0e5',
        'inverse-primary': '#c9c6c5',

        outline: '#747878',
        'outline-variant': '#c4c7c7',

        error: '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',
      },
      fontFamily: {
        serif: ['var(--font-newsreader)', 'Newsreader', 'Georgia', 'serif'],
        sans: ['var(--font-manrope)', 'Manrope', 'Inter', 'system-ui', 'sans-serif'],
        // Stitch's font-family token aliases so HTML pasted from Stitch
        // resolves to the correct family (all of them collapse to either
        // Newsreader or Manrope in our setup).
        'display-lg': ['var(--font-newsreader)', 'Newsreader', 'Georgia', 'serif'],
        'headline-xl': ['var(--font-newsreader)', 'Newsreader', 'Georgia', 'serif'],
        'headline-md': ['var(--font-newsreader)', 'Newsreader', 'Georgia', 'serif'],
        'reading-body': ['var(--font-newsreader)', 'Newsreader', 'Georgia', 'serif'],
        'ui-label-lg': ['var(--font-manrope)', 'Manrope', 'Inter', 'system-ui', 'sans-serif'],
        'ui-label-sm': ['var(--font-manrope)', 'Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        shell: '1280px',
        reading: '720px',
        'container-max': '1280px',
        'reading-max': '720px',
      },
      borderRadius: {
        // Stitch scheme: very subtle by default, keep `full` as a real
        // pill so avatars/buttons that actually want a circle still work.
        DEFAULT: '0.125rem',
        sm: '0.125rem',
        md: '0.25rem',
        lg: '0.25rem',
        xl: '0.5rem',
        '2xl': '0.75rem',
        full: '9999px',
      },
      spacing: {
        gutter: '24px',
        edge: '40px',
        'margin-edge': '40px',
        unit: '8px',
      },
      letterSpacing: {
        label: '0.05em',
        labelTight: '0.08em',
        tightDisplay: '-0.02em',
      },
      boxShadow: {
        'editorial-card': '0 1px 0 rgba(10,10,10,0.04), 0 4px 12px rgba(10,10,10,0.04)',
        'editorial-modal': '0 24px 64px rgba(10,10,10,0.16), 0 8px 24px rgba(10,10,10,0.08)',
        'gold-glow': '0 0 0 1px rgba(194,168,120,0.4)',
        'book': '4px 0 16px rgba(0,0,0,0.04), -1px 0 4px rgba(0,0,0,0.02)',
        'reader-bar': '0 -4px 32px rgba(0,0,0,0.02)',
      },
      backdropBlur: {
        nav: '12px',
      },
      fontSize: {
        'display-lg':  ['64px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '300' }],
        'headline-xl': ['48px', { lineHeight: '1.2', fontWeight: '400' }],
        'headline-md': ['32px', { lineHeight: '1.3', fontWeight: '500' }],
        'reading-body':['20px', { lineHeight: '1.6', letterSpacing: '0.01em' }],
        'ui-label-lg': ['16px', { lineHeight: '1.4', letterSpacing: '0.05em', fontWeight: '600' }],
        'ui-label-sm': ['12px', { lineHeight: '1.4', letterSpacing: '0.08em', fontWeight: '500' }],
      },
    },
  },
  plugins: [],
};
