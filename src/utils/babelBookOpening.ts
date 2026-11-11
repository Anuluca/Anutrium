type BookPhase = 'unfolding' | 'ready' | 'closing' | 'closed'
type BookDirection = 'open' | 'close'

export function createBabelBookOpening(
  stage: HTMLElement,
  source: HTMLElement,
  target: HTMLElement,
  onPhase: (phase: BookPhase) => void,
  reducedMotion: boolean,
  direction: BookDirection = 'open'
) {
  const closing = direction === 'close'
  if (reducedMotion)
    return {
      finished: Promise.resolve(true),
      cancel() {},
      finish() {},
      reveal: () => Promise.resolve(),
    }

  const bounds = stage.getBoundingClientRect()
  const origin = source.getBoundingClientRect()
  const destination = target.getBoundingClientRect()
  const surface = document.createElement('div')
  surface.className = 'book-opening-shell no-rem'
  surface.setAttribute('aria-hidden', 'true')
  const place = (rect: DOMRect, stageBounds = bounds) =>
    Object.assign(surface.style, {
      left: `${rect.left - stageBounds.left}px`,
      top: `${rect.top - stageBounds.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    })
  place(destination)
  const spine = source.cloneNode(true) as HTMLElement
  spine.classList.remove('is-selected')
  spine.classList.add('book-opening-spine')
  spine.setAttribute('tabindex', '-1')
  const spread = document.createElement('div')
  spread.className = 'book-opening-spread'
  const paper = document.createElement('div')
  paper.className = 'book-opening-paper'
  const hinge = document.createElement('div')
  hinge.className = 'book-opening-hinge'
  const front = document.createElement('div')
  front.className = 'book-opening-front'
  const back = document.createElement('div')
  back.className = 'book-opening-back'
  hinge.append(front, back)
  spread.append(paper, hinge)
  surface.append(spine, spread)
  stage.append(surface)

  const scaleX = origin.width / (destination.width / 2)
  const scaleY = origin.height / destination.height
  const transform = `translate(${
    origin.left - destination.left - (destination.width * scaleX) / 2
  }px, ${origin.top - destination.top}px) scale(${scaleX}, ${scaleY})`
  Object.assign(spine.style, {
    width: `${origin.width}px`,
    height: `${origin.height}px`,
    transform: `scale(${1 / scaleX}, ${1 / scaleY})`,
    transformOrigin: 'top left',
  })
  spine.style.setProperty('--library-book-height', `${origin.height}px`)
  const duration = 820
  const animations = [
    surface.animate(
      [{ transform }, { transform: 'translate(0, 0) scale(1, 1)' }],
      { duration, fill: 'both' }
    ),
    hinge.animate(
      [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-180deg)' }],
      { duration, fill: 'both' }
    ),
    spine.animate(
      [{ opacity: 1 }, { opacity: 0, offset: 0.25 }, { opacity: 0 }],
      { duration, fill: 'both' }
    ),
    spread.animate(
      [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 1 }],
      { duration, fill: 'both' }
    ),
  ]
  for (const animation of animations) {
    animation.pause()
    animation.currentTime = closing ? duration : 0
    animation.effect!.updateTiming({ easing: 'cubic-bezier(0.45, 0, 0.55, 1)' })
  }
  if (closing) {
    const returningBook = source.animate(
      [
        { opacity: 1, visibility: 'visible' },
        { opacity: 0, visibility: 'visible', offset: 1 / 3 },
        { opacity: 0, visibility: 'visible' },
      ],
      { duration, fill: 'both', easing: 'linear' }
    )
    returningBook.pause()
    returningBook.currentTime = duration
    animations.push(returningBook)
  }
  const active = new Set(animations)
  let cancelled = false
  let skipped = false
  surface.style.opacity = '1'
  onPhase(closing ? 'closing' : 'unfolding')
  surface.dataset.phase = closing ? 'closing' : 'unfolding'

  async function fade(from: number, to: number) {
    if (cancelled || skipped) return
    const animation = surface.animate([{ opacity: from }, { opacity: to }], {
      duration: 180,
      fill: 'forwards',
      easing: 'ease',
    })
    active.add(animation)
    await animation.finished.catch(() => {})
  }
  async function run() {
    if (closing) await fade(1, 1)
    if (!cancelled && !skipped) {
      const start = Number(document.timeline.currentTime)
      for (const animation of animations) {
        animation.playbackRate = closing ? -1 : 1
        animation.play()
        animation.startTime = closing ? start + duration : start
      }
      await Promise.all(
        animations.map((animation) => animation.finished.catch(() => {}))
      )
    }
    if (cancelled) return false
    surface.dataset.phase = closing ? 'closed' : 'ready'
    onPhase(closing ? 'closed' : 'ready')
    return true
  }
  const finished = run()
  return {
    finished,
    finish() {
      if (cancelled) return
      skipped = true
      active.forEach((animation) => animation.cancel())
      active.clear()
      if (closing) surface.style.opacity = '0'
      else {
        place(target.getBoundingClientRect(), stage.getBoundingClientRect())
        surface.style.transform = 'none'
        hinge.style.transform = 'rotateY(-180deg)'
        spine.style.opacity = '0'
        spread.style.opacity = '1'
      }
    },
    cancel() {
      cancelled = true
      active.forEach((animation) => animation.cancel())
      active.clear()
      surface.remove()
    },
    async reveal() {
      skipped = false
      await fade(1, 0)
    },
  }
}
