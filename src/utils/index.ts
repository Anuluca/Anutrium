export const debounce = (func, dalay = 100, immediate = true) => {
  let timer,
    callNow = immediate
  return (...args) => {
    if (timer) clearTimeout(timer)
    if (callNow) {
      func(...args)
      callNow = false
    }
    timer = setTimeout(() => {
      func(...args)
    }, dalay)
  }
}

export const reduce = (fn, time) => {
  let timer
  return function () {
    if (timer) return
    timer = true
    fn()
    setTimeout(() => {
      timer = false
    }, time)
  }
}
