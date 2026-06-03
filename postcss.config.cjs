const path = require('path')

module.exports = {
  plugins: {
    'postcss-nesting': {},
    '@tailwindcss/postcss': {
      config: path.resolve(__dirname, 'tailwind.config.cjs'),
    },
    autoprefixer: {},
  },
}
