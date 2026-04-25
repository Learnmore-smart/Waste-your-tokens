export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"Instrument Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        emberFloat: {
          '0%': { transform: 'translate3d(0, 0, 0) scale(1)', opacity: '0' },
          '10%': { opacity: '1' },
          '100%': {
            transform: 'translate3d(var(--dx), calc(var(--dy) * -1), 0) scale(0.6)',
            opacity: '0',
          },
        },
        heatPulse: {
          '0%, 100%': { transform: 'scale(1)', filter: 'blur(18px)', opacity: '0.55' },
          '50%': { transform: 'scale(1.08)', filter: 'blur(22px)', opacity: '0.75' },
        },
        flameWobble: {
          '0%': { transform: 'translate3d(0,0,0) rotate(-2deg) scale(1)' },
          '50%': { transform: 'translate3d(0,-4px,0) rotate(2deg) scale(1.02)' },
          '100%': { transform: 'translate3d(0,0,0) rotate(-2deg) scale(1)' },
        },
        tickShine: {
          '0%': { transform: 'translateX(-60%)', opacity: '0' },
          '20%': { opacity: '1' },
          '100%': { transform: 'translateX(60%)', opacity: '0' },
        },
      },
      animation: {
        emberFloat: 'emberFloat 1.2s ease-out forwards',
        heatPulse: 'heatPulse 1.2s ease-in-out infinite',
        flameWobble: 'flameWobble 1.05s ease-in-out infinite',
        tickShine: 'tickShine 0.55s ease-out',
      },
      boxShadow: {
        ember:
          '0 18px 60px rgba(255, 92, 0, 0.26), 0 10px 30px rgba(255, 0, 106, 0.14)',
      },
      colors: {
        ash: {
          50: '#f7f7f8',
          100: '#ececef',
          200: '#d2d3da',
          300: '#a8abb8',
          400: '#7b7e92',
          500: '#54576a',
          600: '#3b3e4f',
          700: '#2a2c3a',
          800: '#1b1c25',
          900: '#0f1015',
        },
        ember: {
          300: '#ffb86b',
          400: '#ff8a2a',
          500: '#ff5c00',
          600: '#ff2d2d',
        },
      },
    },
  },
  plugins: [],
}
