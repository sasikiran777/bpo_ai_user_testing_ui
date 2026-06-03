module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#ff8a1f',
        },
      },
      boxShadow: {
        'brand-btn': '0 10px 22px rgba(0, 0, 0, 0.18), 0 1px 0 rgba(255, 255, 255, 0.14) inset',
        'brand-btn-hover':
          '0 12px 26px rgba(0, 0, 0, 0.22), 0 1px 0 rgba(255, 255, 255, 0.14) inset',
        'card-soft': '0 18px 48px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
}
