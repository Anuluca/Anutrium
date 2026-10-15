const flashes = new WeakMap<HTMLElement, Animation>()

export const flashActionButton = (button: HTMLElement, duration = 180) => {
  flashes.get(button)?.cancel()
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const animation = button.animate(
    [
      { backgroundColor: '#1dcba9', color: '#000', offset: 0 },
      { backgroundColor: '#000', color: '#fff', offset: 0.25 },
      { backgroundColor: '#1dcba9', color: '#000', offset: 0.5 },
      { backgroundColor: '#000', color: '#fff', offset: 0.75 },
      { backgroundColor: '#000', color: '#fff', offset: 1 },
    ].map((frame) => ({ ...frame, easing: 'steps(1, end)' })),
    { duration }
  )
  flashes.set(button, animation)
  return animation
}
