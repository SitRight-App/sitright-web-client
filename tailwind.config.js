/** @type {import('tailwindcss').Config} */
//
// Paleta SitRight referenciada vía variables CSS definidas en src/index.css.
// Para cambiar la paleta, modificar :root en src/index.css — no es necesario
// tocar este archivo.
//
const palette = (token) => `rgb(var(--color-${token}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: palette('cream'),
          deep: palette('cream-deep'),
          bone: palette('cream-bone'),
        },
        ink: {
          DEFAULT: palette('ink'),
          soft: palette('ink-soft'),
          faint: palette('ink-faint'),
        },
        moss: {
          DEFAULT: palette('moss'),
          deep: palette('moss-deep'),
          soft: palette('moss-soft'),
        },
        terracotta: {
          DEFAULT: palette('terracotta'),
          deep: palette('terracotta-deep'),
          soft: palette('terracotta-soft'),
        },
        sand: {
          DEFAULT: palette('sand'),
          light: palette('sand-light'),
        },
        amber: palette('amber'),
      },
      fontFamily: {
        // Una sola familia sans en toda la app. `serif` se remapea a Geist a
        // propósito: conserva compatibilidad con los usos existentes de
        // `font-serif` sin editarlos, ya renderizados legibles.
        serif: ['Geist', 'system-ui', 'sans-serif'],
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      letterSpacing: {
        widestest: '0.18em',
        widerer: '0.16em',
      },
      keyframes: {
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        // Ease-out fuerte (Emil): arranque inmediato, se siente responsive.
        'toast-in': 'toast-in 0.22s cubic-bezier(0.23, 1, 0.32, 1) forwards',
      },
    },
  },
  plugins: [],
}
