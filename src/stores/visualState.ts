import { defineStore } from 'pinia'

export default defineStore('visualState', {
  // a是模块的命名空间，不能和其他模块的一样
  state: () => ({
    // state是一个函数，函数返回值为管理的状态
    theme: 'dark'
  }),
  actions: {
    setTheme(theme: string) {
      localStorage.setItem('theme', theme)
      if (localStorage.getItem('theme') === 'light') {
        import('@/assets/style/light.less')
        console.log('123', document.getElementById('app'))

        document.getElementById('app').classList.add('light')
      } else {
        document.getElementById('app').classList.remove('light')
      }
      this.theme = theme
    }
  }
})
