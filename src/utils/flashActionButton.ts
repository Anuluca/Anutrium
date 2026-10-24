const flashes = new WeakMap<HTMLElement, Animation>()

export const flashActionButton = (
  button: HTMLElement,
  duration = 180,
  options: {
    colorOnly?: boolean
    accentColor?: string
    restColor?: string
  } = {}
) => {
  flashes.get(button)?.cancel()
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const accentColor = options.accentColor ?? '#1dcba9'
  const restColor = options.restColor ?? '#fff'
  const animation = button.animate(
    [
      { backgroundColor: accentColor, color: '#000', offset: 0 },
      { backgroundColor: '#000', color: restColor, offset: 0.25 },
      { backgroundColor: accentColor, color: '#000', offset: 0.5 },
      { backgroundColor: '#000', color: restColor, offset: 0.75 },
      { backgroundColor: '#000', color: restColor, offset: 1 },
    ].map((frame, index) => ({
      ...(options.colorOnly
        ? {
            color:
              index === 0 || index === 2
                ? accentColor
                : options.restColor ?? '#e23456',
            offset: frame.offset,
          }
        : frame),
      easing: 'steps(1, end)',
    })),
    { duration }
  )
  flashes.set(button, animation)
  return animation
}
