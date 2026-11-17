import gsap from 'gsap'

// 与 Notes 正文一致：只处理首屏完整段落，长文后续段落保持自然流，不拆字。
export const readerBodyRevealMotion = {
  duration: 0.8,
  ease: 'power2.out',
  distance: 8,
  stagger: 0.08,
  maxStagger: 0.4,
}
export function visibleReaderBlocks(body: HTMLElement, scroll: HTMLElement) {
  const viewport = scroll.getBoundingClientRect()
  const blocks: HTMLElement[] = []
  for (const node of Array.from(body.children)) {
    if (!(node instanceof HTMLElement)) continue
    const rect = node.getBoundingClientRect()
    if (rect.top >= viewport.bottom) break
    if (rect.bottom > viewport.top && rect.width && rect.height)
      blocks.push(node)
  }
  return blocks
}
export function createReaderBodyReveal(
  body: HTMLElement,
  scroll: HTMLElement,
  reduced: boolean
) {
  let blocks = visibleReaderBlocks(body, scroll)
  const context = gsap.context(() => {}, body)
  let timeline: gsap.core.Timeline
  const build = () => {
    timeline = gsap.timeline({ paused: true }).fromTo(
      blocks,
      { opacity: 0, y: readerBodyRevealMotion.distance },
      {
        opacity: 1,
        y: 0,
        duration: reduced ? 0 : readerBodyRevealMotion.duration,
        ease: readerBodyRevealMotion.ease,
        stagger: {
          amount: reduced
            ? 0
            : Math.min(
                readerBodyRevealMotion.maxStagger,
                (blocks.length - 1) * readerBodyRevealMotion.stagger
              ),
        },
      }
    )
  }
  context.add(build)
  let pending: (() => void) | undefined
  const run = (reverse: boolean) =>
    new Promise<void>((resolve) => {
      pending?.()
      pending = resolve
      if (reverse && timeline!.progress() === 0) {
        resolve()
        return
      }
      if (!blocks.length || reduced) {
        timeline!.progress(reverse ? 0 : 1)
        resolve()
        return
      }
      timeline!.eventCallback(
        reverse ? 'onReverseComplete' : 'onComplete',
        resolve
      )
      if (reverse) timeline!.reverse()
      else timeline!.play()
    })
  return {
    play: () => run(false),
    reverse: () => {
      const visible = visibleReaderBlocks(body, scroll)
      if (
        visible.length !== blocks.length ||
        visible.some((block, index) => block !== blocks[index])
      ) {
        // 用户滚动后，退场处理当前首屏，而非已经滚出视口的入场段落。
        context.add(() => {
          timeline.kill()
          gsap.set(blocks, { clearProps: 'opacity,transform' })
          blocks = visible
          build()
          timeline.progress(1).pause()
        })
      }
      return run(true)
    },
    destroy: () => {
      pending?.()
      context.revert()
    },
  }
}
