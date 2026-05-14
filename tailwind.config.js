export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          950: '#020617',
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
          50:  '#f8fafc',
        },
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        sky: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
        },
        air: {
          excellent: '#10b981',
          good:      '#22c55e',
          moderate:  '#f59e0b',
          poor:      '#ef4444',
          hazard:    '#b91c1c',
        },
      },
      letterSpacing: {
        'tightest': '-0.05em',
        'tighter':  '-0.03em',
        'tight':    '-0.02em',
      },
      boxShadow: {
        'subtle':     '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        'card':       '0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.05)',
        'card-md':    '0 4px 12px -2px rgba(15, 23, 42, 0.06), 0 2px 4px -1px rgba(15, 23, 42, 0.04)',
        'card-lg':    '0 12px 32px -8px rgba(15, 23, 42, 0.10), 0 4px 8px -2px rgba(15, 23, 42, 0.04)',
        'card-xl':    '0 24px 64px -16px rgba(15, 23, 42, 0.18), 0 8px 16px -4px rgba(15, 23, 42, 0.06)',
        'glow-brand': '0 0 0 1px rgba(37, 99, 235, 0.15), 0 8px 32px -4px rgba(37, 99, 235, 0.25)',
        'inner-top':  'inset 0 1px 0 0 rgba(255, 255, 255, 0.6)',
      },
      animation: {
        'breathe':    'breathe 4s ease-in-out infinite',
        'live-pulse': 'live-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'rise':       'rise 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'reveal':     'reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        'shimmer':    'shimmer 2.5s linear infinite',
        'drift':      'drift 24s ease-in-out infinite',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { opacity: '0.55' },
          '50%':      { opacity: '1'    },
        },
        'live-pulse': {
          '0%, 100%': { transform: 'scale(1)',   opacity: '1'   },
          '50%':      { transform: 'scale(1.6)', opacity: '0.3' },
        },
        rise: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)'    },
        },
        reveal: {
          '0%':   { opacity: '0', transform: 'translateY(24px)', filter: 'blur(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)',    filter: 'blur(0)'   },
        },
        drift: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%':      { transform: 'translate(3%, -2%) scale(1.08)' },
          '66%':      { transform: 'translate(-2%, 3%) scale(0.94)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '200% 0'   },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
    },
  },
  plugins: [],
};
