/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#F4EFE6',
          deep: '#E8DFC9',
          bone: '#EBE3D3',
        },
        ink: {
          DEFAULT: '#1A1F1B',
          soft: '#4A5249',
          faint: '#8A9088',
        },
        moss: {
          DEFAULT: '#2D4A36',
          deep: '#1F3324',
          soft: '#4D6B55',
        },
        terracotta: {
          DEFAULT: '#C8623C',
          deep: '#A24A28',
          soft: '#E8A685',
        },
        sand: {
          DEFAULT: '#C9B896',
          light: '#DDD0B0',
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
