export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#003366', light: '#E8F0FA', dark: '#001f3f' },
        success: '#2E7D32',
        warning: '#F57C00',
        danger: '#C62828',
      }
    }
  },
  plugins: []
}
