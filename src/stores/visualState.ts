import { defineStore } from 'pinia'

export default defineStore('visualState', {
  // a是模块的命名空间，不能和其他模块的一样
  state: () => ({
    // state是一个函数，函数返回值为管理的状态
    theme: 'light'
  }),
  actions: {
    setTheme(theme: string) {
      localStorage.setItem("theme", theme);
      if (localStorage.getItem('theme') === 'dark') {
        document.getElementById("app").classList.remove("light");
      } else {
        document.getElementById('app').classList.add('light')
      }
      this.theme = theme
    }
  }
})
