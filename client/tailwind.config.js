/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#fffdf5',
          100: '#fbf5e6',
          200: '#f1e7cf',
        },
        ink: {
          DEFAULT: '#1a1a1a',
          warm: '#3a342a',
          soft: '#5b554b',
        },
        gold: {
          DEFAULT: '#e9b94a',
          dark: '#a87826',
          bright: '#febe10',
          soft: '#fff0b8',
        },
        flame: '#d6362b',
        pitch: {
          jersey: '#1d7a3a',
          deep: '#14532d',
        },
        navy: '#1c2c5b',
        sky: '#6cabdd',
      },
      fontFamily: {
        display: ['"Archivo Black"', 'Impact', 'system-ui', 'sans-serif'],
        wordmark: ['"Bagel Fat One"', '"Archivo Black"', 'system-ui', 'sans-serif'],
        sans: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        widest: '0.22em',
      },
      backgroundImage: {
        'dot-grid':
          'radial-gradient(circle at center, rgba(255,253,245,0.16) 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-grid': '20px 20px',
      },
      boxShadow: {
        'card-lift': '6px 6px 0 0 #1a1a1a',
      },
    },
  },
  plugins: [],
};
