module.exports = {
  plugins: {
    'postcss-pxtorem': {
      rootValue: 28,
      propList: ['*'], // 需要转换的属性，*表示所有
      selectorBlackList: ['.no-rem'], // 忽略转换的类名
      minPixelValue: 2, // 小于2px的不转换
      mediaQuery: false, // 媒体查询中的px不转换
      exclude: /node_modules/i, // 排除node_modules文件夹
    },
  },
}
