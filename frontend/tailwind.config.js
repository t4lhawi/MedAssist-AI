export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0F5C9E', light: '#E8F3FF', dark: '#0B3D68', darker: '#082A49' },
        success: '#2E7D32',
        warning: '#F57C00',
        danger: '#C62828',
        surface: '#F8FBFF',
        ink: '#0F172A',
      },
      boxShadow: {
        soft: '0 18px 45px -28px rgba(15, 92, 158, 0.45)',
        glow: '0 24px 70px -35px rgba(15, 92, 158, 0.55)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      }
    }
  },
  plugins: []
}
