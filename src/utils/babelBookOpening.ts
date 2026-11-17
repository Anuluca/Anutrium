type BookPhase = 'unfolding' | 'ready' | 'closing' | 'closed'

/** 同一张卡只改变矩形与标题位置；保留动画实例，关闭时反播，避免副本交接与非等比缩放。 */
export function createBabelBookOpening(
  stage: HTMLElement,
  source: HTMLElement,
  target: HTMLElement,
  onPhase: (phase: BookPhase) => void,
  reducedMotion: boolean
) {
  const title = target.querySelector<HTMLElement>('.book-title')!
  const number = target.querySelector<HTMLElement>('.book-number')!
  const date = target.querySelector<HTMLElement>('.book-date')!
  function measureFrames() {
    const bounds = stage.getBoundingClientRect()
    const origin = source.getBoundingClientRect()
    const space = source
      .querySelector<HTMLElement>('.book-title-space')!
      .getBoundingClientRect()
    const sourceNumber = source
      .querySelector<HTMLElement>('.book-number')!
      .getBoundingClientRect()
    const sourceDate = source
      .querySelector<HTMLElement>('.book-date')!
      .getBoundingClientRect()
    const titleStyle = getComputedStyle(source.querySelector('.book-title')!)
    const font = titleStyle.font
    const width = titleStyle.width
    const context = document.createElement('canvas').getContext('2d')!
    const expandedSize = parseFloat(titleStyle.fontSize) * 1.6
    context.font = `${titleStyle.fontWeight} ${expandedSize}px ${titleStyle.fontFamily}`
    const titleWidth = Math.max(
      1,
      Math.min(
        Math.ceil(context.measureText(title.textContent || '').width) + 2,
        bounds.width - 100
      )
    )
    title.style.font = font
    number.style.top = `${sourceNumber.top - origin.top}px`
    number.style.left = `${sourceNumber.left - origin.left}px`
    date.style.left = `${sourceDate.left - origin.left}px`
    const bottom = origin.bottom - sourceDate.bottom
    date.style.bottom = `${bottom}px`
    target.style.setProperty(
      '--book-meta-center',
      `${sourceDate.left - origin.left + sourceDate.width / 2}px`
    )
    target.style.setProperty('--book-meta-bottom', `${bottom}px`)
    const compactTitle = {
      left: `${space.left - origin.left + space.width / 2}px`,
      top: `${space.top - origin.top + space.height / 2}px`,
      width,
      fontSize: titleStyle.fontSize,
      lineHeight: titleStyle.lineHeight,
      transform: 'translate(-50%, -50%) rotate(90deg)',
    }
    const expandedTitle = {
      left: `${bounds.width - 20 - titleWidth / 2}px`,
      top: '34px',
      width: `${titleWidth}px`,
      fontSize: `${expandedSize}px`,
      lineHeight: `${expandedSize * 1.15}px`,
      transform: 'translate(-50%, -50%) rotate(0deg)',
    }
    return {
      card: [
        {
          left: `${origin.left - bounds.left}px`,
          top: `${origin.top - bounds.top}px`,
          width: `${origin.width}px`,
          height: `${origin.height}px`,
        },
        {
          left: '0px',
          top: '0px',
          width: `${bounds.width}px`,
          height: `${bounds.height}px`,
        },
      ],
      title: [
        { ...compactTitle, opacity: 1, offset: 0 },
        { ...compactTitle, opacity: 0, offset: 0.4 },
        { ...expandedTitle, opacity: 0, offset: 0.4 },
        { ...expandedTitle, opacity: 1, offset: 1 },
      ],
      date: [{ bottom: `${bottom}px` }, { bottom: `${bottom + 56}px` }],
    }
  }
  const frames = measureFrames()
  const duration = reducedMotion ? 0 : 820
  const timing: KeyframeAnimationOptions = {
    duration,
    fill: 'both',
    easing: 'cubic-bezier(0.45, 0, 0.55, 1)',
  }
  const animations = [
    target.animate(frames.card, timing),
    title.animate(frames.title, timing),
    date.animate(frames.date, timing),
  ]
  let cancelled = false
  let direction: 'open' | 'close' = 'open'
  const phase = (value: BookPhase) => {
    target.dataset.phase = value
    onPhase(value)
  }
  phase('unfolding')
  const wait = async () => {
    await Promise.all(
      animations.map((animation) => animation.finished.catch(() => {}))
    )
    if (cancelled) return false
    phase(direction === 'open' ? 'ready' : 'closed')
    return true
  }
  return {
    finished: wait(),
    async close() {
      direction = 'close'
      phase('closing')
      for (const animation of animations) animation.reverse()
      return wait()
    },
    finish() {
      // 在 ResizeObserver 合并任务中更新两个端点，重排后仍回到当前书卡位置。
      const next = measureFrames()
      ;(animations[0].effect as KeyframeEffect).setKeyframes(next.card)
      ;(animations[1].effect as KeyframeEffect).setKeyframes(next.title)
      ;(animations[2].effect as KeyframeEffect).setKeyframes(next.date)
      animations.forEach((animation) => animation.finish())
    },
    cancel() {
      cancelled = true
      animations.forEach((animation) => animation.cancel())
    },
  }
}
