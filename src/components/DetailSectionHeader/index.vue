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
    display: inline-flex;
    align-items: center;
    align-self: center;
    justify-content: center;
    color: transparent;
    font-family: 'anton', monospace;
    font-size: 0.76rem;
    line-height: 1;
    text-align: center;
    -webkit-text-stroke: 1px #e23456;
    text-shadow: 0 0 10px rgba(226, 52, 87, 0.27);
  }

  &__label {
    display: inline-flex;
    align-items: center;
    margin-left: 5px;
    color: #e23456;
    font-family: 'alibaba-puhuiti', sans-serif;
    font-size: 0.68rem;
    font-weight: 900;
    letter-spacing: 1px;
    line-height: 1;
    text-transform: uppercase;
    transform: translateY(0.08em);
  }

  &__meta {
    display: inline-flex;
    align-items: baseline;
    gap: 7px;
    color: rgba(255, 255, 255, 0.3);
    font-family: 'cn-custom', 'Courier New', monospace;
    font-size: 0.56rem;
    font-weight: 100;

    :deep(> span:first-child) {
      color: #e23456 !important;
      font-weight: 900;
      -webkit-text-fill-color: #e23456;
    }
  }
}
</style>
