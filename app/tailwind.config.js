/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme surface palette
        dark: {
          bg:       '#0b0f18',
          surface:  '#111827',
          surface2: '#1a2436',
          surface3: '#243044',
          border:   'rgba(255,255,255,0.08)',
        },
        // Accent palette (institutional)
        accent: {
          DEFAULT: '#0ea5e9',
          teal:    '#0d9488',
          amber:   '#f59e0b',
          red:     '#ef4444',
          green:   '#10b981',
          violet:  '#8b5cf6',
        },
        // Text hierarchy
        ink: {
          primary:   '#f0f4f8',
          secondary: '#94a3b8',
          muted:     '#64748b',
          disabled:  '#475569',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        mono:    ['"DM Mono"', '"Fira Code"', 'monospace'],
      },
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)',
        panel: '0 2px 8px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4)',
        glow:  '0 0 16px rgba(14,165,233,0.15)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
