import { onBeforeUnmount, onMounted, type Ref, watch } from 'vue'

import { useFrameTask } from '@/composables/useFrameTask'

/** 资料区只在尺寸或内容变化时拟合；保留按实际换行高度求解，避免改变现有布局。 */
export function useFloraProfileFit(
  profileViewport: Ref<HTMLElement | null>,
  mobile: () => boolean,
  content: () => unknown[]
) {
  let observer: ResizeObserver | undefined
  const fitProfile = () => {
    const container = profileViewport.value
    const profile = container?.firstElementChild as HTMLElement | null
    if (!container || !profile) return
    const setScale = (scale: number) =>
      container.style.setProperty('--flora-profile-fit', String(scale))
    setScale(1)
    container.style.removeProperty('--flora-pet-level-size')
    container.style.removeProperty('--flora-profile-memo-size')
    if (mobile() || container.clientHeight <= 0) return
    // 固定容器单位换算后的字号，避免 zoom 反向放大 cqw，使高度拟合失去单调性。
    const level = profile.querySelector('.flora-pet-level')
    const memo = profile.querySelector('.flora-pet-memo')
    const levelFontSize = level ? getComputedStyle(level).fontSize : undefined
    const memoFontSize = memo ? getComputedStyle(memo).fontSize : undefined
    if (levelFontSize)
      container.style.setProperty('--flora-pet-level-size', levelFontSize)
    if (memoFontSize)
      container.style.setProperty('--flora-profile-memo-size', memoFontSize)
    const available = container.getBoundingClientRect().height
    const fits = (scale: number) => {
      setScale(scale)
      return (
        Math.max(
          profile.scrollHeight * scale,
          profile.getBoundingClientRect().height
        ) <=
        available + 1
      )
    }
    if (fits(1)) return
    // 按实际文字换行后的高度拟合资料区，避免固定最小高度把媒体区挤出视口。
    // 仅在尺寸、宠物、语言或字体变化时执行，不参与逐帧动画。
    let low = 0.1
    let high = 1
    for (let step = 0; step < 8; step++) {
      const middle = (low + high) / 2
      if (fits(middle)) low = middle
      else high = middle
    }
    setScale(low * 0.998)
  }
  const { schedule: scheduleFit } = useFrameTask(fitProfile)
  onMounted(() => {
    observer = new ResizeObserver(scheduleFit)
    if (profileViewport.value) observer.observe(profileViewport.value)
    void document.fonts.ready.then(scheduleFit)
    document.fonts.addEventListener('loadingdone', scheduleFit)
    scheduleFit()
  })
  watch(content, scheduleFit, { flush: 'post' })
  onBeforeUnmount(() => {
    observer?.disconnect()
    document.fonts.removeEventListener('loadingdone', scheduleFit)
  })
}
