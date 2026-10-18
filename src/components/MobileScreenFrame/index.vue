<template>
  <div class="mobile-screen-frame-bottom" aria-hidden="true" />
</template>

<style scoped lang="less">
.mobile-screen-frame-bottom {
  display: none;
}

@media screen and (max-aspect-ratio: @ratio-threshold),
  screen and (max-width: 1024px) and (hover: none) and (pointer: coarse) {
  .mobile-screen-frame-bottom {
    position: fixed;
    right: 0;
    bottom: -1px;
    left: 0;
    z-index: 1;
    display: block;
    height: 29px;
    zoom: 3.5;
    pointer-events: none;

    &::before,
    &::after {
      position: absolute;
      inset: 0;
      content: '';
    }

    &::before {
      z-index: 0;
      background: linear-gradient(
        to bottom,
        transparent 0%,
        color-mix(in srgb, var(--bg-color) 25%, transparent) 35%,
        color-mix(in srgb, var(--bg-color) 72%, transparent) 70%,
        var(--bg-color) 100%
      );
    }

    &::after {
      z-index: 1;
      .tapered-screen-lines(var(--mobile-screen-frame-color));
    }
  }
}
</style>
