import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'

type TaskState = 'loading' | 'done' | 'error' | 'cancelled'
interface LoadingTask {
  token: number
  progress: number
  weight: number
  state: TaskState
}

export const useSiteLoading = defineStore('site-loading', () => {
  const tasks = reactive(new Map<string, LoadingTask>())
  const batch = ref(0)
  let token = 0
  const pending = computed(() =>
    [...tasks.values()].some((task) => task.state === 'loading')
  )
  const progress = computed(() => {
    let total = 0
    let completed = 0
    for (const task of tasks.values()) {
      total += task.weight
      completed += task.weight * task.progress
    }
    return total ? Math.floor(completed / total) : 100
  })

  function beginTask(key: string, weight = 1) {
    let task = tasks.get(key)
    if (!task || task.state !== 'loading') {
      if (!pending.value) {
        tasks.clear()
        batch.value++
      }
      task = { token: ++token, progress: 0, weight, state: 'loading' }
      tasks.set(key, task)
    }
    const taskToken = task.token
    // 路由提前登记，页面接管同一任务；旧页面的异步回调不能结束新页面的任务。
    const currentTask = () => {
      const current = tasks.get(key)
      return current?.token === taskToken && current.state === 'loading'
        ? current
        : undefined
    }
    return {
      update(value: number) {
        const current = currentTask()
        if (current)
          current.progress = Math.max(
            current.progress,
            Math.min(100, Math.max(0, value))
          )
      },
      finish(state: Exclude<TaskState, 'loading'> = 'done') {
        const current = currentTask()
        if (current) {
          current.progress = 100
          current.state = state
        }
      },
    }
  }
  function cancelTask(key: string) {
    const task = tasks.get(key)
    if (task?.state === 'loading') {
      task.progress = 100
      task.state = 'cancelled'
    }
  }

  return { tasks, batch, pending, progress, beginTask, cancelTask }
})
