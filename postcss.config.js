module.exports = {
  plugins: {
    'postcss-pxtorem': {
      rootValue: 21.5, // 设计稿基准值，通常为设计稿宽度/10
      propList: ['*'], // 需要转换的属性，*表示所有
      selectorBlackList: ['.no-rem'], // 忽略转换的类名
      minPixelValue: 2, // 小于2px的不转换
      mediaQuery: false, // 媒体查询中的px不转换
      exclude: /node_modules/i // 排除node_modules文件夹
    }
  }
}