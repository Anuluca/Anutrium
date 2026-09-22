module.exports = {
  plugins: {
    'postcss-pxtorem': {
      rootValue: 30,
      propList: ['*'],
      selectorBlackList: ['.no-rem', '.logo-wrapper2', '.loading-text'],
      minPixelValue: 2,
      mediaQuery: false,
      exclude: /node_modules/i,
    },
  },
}
