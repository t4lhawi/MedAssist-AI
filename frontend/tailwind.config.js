export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx,css}'],
  theme: {
    extend: {
      colors: {
        // Brand palette (kept as-is — same hex used in both modes).
        primary: { DEFAULT: '#0F5C9E', light: '#E8F3FF', dark: '#0B3D68', darker: '#082A49' },
        success: '#2E7D32',
        warning: '#F57C00',
        danger: '#C62828',
        surface: '#F8FBFF',
        ink: '#0F172A',

        // Semantic theme tokens — values come from CSS variables in
        // `src/index.css` (`:root` and `.dark`). This lets `bg-bg`,
        // `text-text-primary`, `border-border`, etc. flip automatically
        // when the `<html>` element carries the `dark` class.
        bg: 'var(--bg-main)',
        card: 'var(--bg-card)',
        elevated: 'var(--bg-elevated)',
        hover: 'var(--bg-hover)',
        input: 'var(--bg-input)',
        border: 'var(--border-color)',
        'border-strong': 'var(--border-strong)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        brand: 'var(--color-primary)',
        ok: 'var(--color-success)',
        warn: 'var(--color-warning)',
        bad: 'var(--color-danger)',
      },
      boxShadow: {
        soft: '0 18px 45px -28px rgba(15, 92, 158, 0.45)',
        glow: '0 24px 70px -35px rgba(15, 92, 158, 0.55)',
        card: '0 1px 2px var(--shadow-1), 0 6px 18px -10px var(--shadow-2)',
        'card-hover': '0 12px 32px -8px var(--shadow-3)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      }
    }
  },
  plugins: []
}
