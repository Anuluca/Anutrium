<template>
  <header class="detail-section-header">
    <span class="detail-section-header__number">
      <slot name="number" />
    </span>
    <span class="detail-section-header__label">
      <slot name="title" />
    </span>

    <strong v-if="$slots.meta" class="detail-section-header__meta">
      <slot name="meta" />
    </strong>
  </header>
</template>

<style lang="less" scoped>
.detail-section-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;

  &__number {
    justify-self: start;
    display: inline-flex;
    align-items: center;
    align-self: center;
    justify-content: center;
    color: transparent;
    font-family: 'Anton', monospace;
    font-size: 0.76rem;
    line-height: 1;
    text-align: center;
    transform: translateY(0.08em);
    -webkit-text-stroke: 1px var(--page-theme-color, #e23456);
    text-shadow: 0 0 10px
      color-mix(in srgb, var(--page-theme-color, #e23456) 27%, transparent);
  }

  &__label {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: var(--page-theme-color, #e23456);
    font-family: 'alibaba-puhuiti', sans-serif;
    font-size: 0.68rem;
    font-weight: 900;
    letter-spacing: 1px;
    line-height: 1;
    text-transform: uppercase;
    transform: translateY(0.08em);
  }

  &__meta {
    justify-self: end;
    display: inline-flex;
    align-items: baseline;
    gap: 7px;
    color: var(--text-faint);
    font-family: 'UnboundedSans', 'Courier New', monospace;
    font-size: 0.56rem;
    font-weight: 100;

    :deep(> span:first-child) {
      color: var(--page-theme-color, #e23456) !important;
      font-weight: 900;
      -webkit-text-fill-color: var(--page-theme-color, #e23456);
    }
  }
}
</style>
