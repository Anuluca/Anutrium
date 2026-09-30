<template>
  <span class="link-flow-mark" aria-hidden="true">
    <svg viewBox="0 0 60 48" preserveAspectRatio="xMaxYMid meet">
      <path d="M0 0H16L34 24 16 48H0L18 24Z" />
      <path d="M24 0H40L58 24 40 48H24L42 24Z" />
    </svg>
  </span>
</template>

<style lang="less" scoped>
.link-flow-mark {
  position: absolute !important;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0.35rem;
  z-index: 1 !important;
  display: block;
  width: auto;
  height: auto;
  color: #8f2137;
  opacity: var(--link-flow-opacity, 0);
  pointer-events: none;
  transform: translateX(var(--link-flow-x, -100%));
  transition: transform 0.62s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease;

  svg {
    display: block;
    width: 100%;
    height: 100%;

    path {
      fill: currentcolor;
    }
  }
}
</style>
