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
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      letterSpacing: {
        widestest: '0.18em',
        widerer: '0.16em',
      },
    },
  },
  plugins: [],
}
