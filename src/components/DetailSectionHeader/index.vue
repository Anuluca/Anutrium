<template>
  <header class="detail-section-header">
    <div class="detail-section-header__title">
      <span class="detail-section-header__number">
        <slot name="number" />
      </span>
      <span class="detail-section-header__label">
        <slot name="title" />
      </span>
    </div>

    <strong v-if="$slots.meta" class="detail-section-header__meta">
      <slot name="meta" />
    </strong>
  </header>
</template>

<style lang="less" scoped>
.detail-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(226, 52, 86, 0.28);

  &__title {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  &__number {
    color: rgba(226, 52, 86, 0.55);
    font-family: 'cn-custom', 'Courier New', monospace;
    font-size: 0.68rem;
    font-weight: 900;
  }

  &__label {
    margin-left: 5px;
    color: #e23456;
    font-family: 'alibaba-puhuiti', sans-serif;
    font-size: 0.68rem;
    font-weight: 900;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  &__meta {
    display: inline-flex;
    align-items: baseline;
    gap: 7px;
    color: rgba(255, 255, 255, 0.3);
    font-family: 'cn-custom', 'Courier New', monospace;
    font-size: 0.56rem;
    font-weight: 100;
  }
}
</style>
