import { nextTick, watch } from 'vue'

import { useTempleNavigation } from '@/stores/templeNavigation'

import { isRouteCurtainCovered, revealRouteCurtain } from './routeCurtain'

export const revealTempleRouteCurtain = async (target: string) => {
  if (!isRouteCurtainCovered(target)) return
  // 先让路由 watcher 接管选择或重建场景，不能把旧页面的 ready 当成目标已就绪。
  await nextTick()
  const navigation = useTempleNavigation()
  const ready = () =>
    !isRouteCurtainCovered(target) ||
    (navigation.ready &&
      navigation.entranceFinished &&
      !navigation.clockAwaitingSettle)
  if (!ready())
    await new Promise<void>((resolve) => {
      const finish = () => {
        stop()
        window.clearTimeout(timer)
        resolve()
      }
      const stop = watch(ready, (value) => {
        if (value) finish()
      })
      const timer = window.setTimeout(finish, 15000)
    })
  await nextTick()
  await revealRouteCurtain(target)
}
