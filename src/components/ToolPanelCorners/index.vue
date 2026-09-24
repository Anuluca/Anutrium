<template>
  <div
    class="tool-panel-corners"
    :class="{
      'tool-panel-corners--inset': inset,
      'tool-panel-corners--muted': muted,
    }"
    aria-hidden="true"
  >
    <i class="tool-panel-corner tool-panel-corner--tl" />
    <i class="tool-panel-corner tool-panel-corner--tr" />
    <i class="tool-panel-corner tool-panel-corner--bl" />
    <i class="tool-panel-corner tool-panel-corner--br" />
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    inset?: boolean
    muted?: boolean
  }>(),
  {
    inset: false,
    muted: false,
  }
)
</script>

<style lang="less" scoped>
.tool-panel-corners {
  display: contents;
  --tool-panel-corner-color: #e8284a;

  &--muted {
    --tool-panel-corner-color: #50505076;
  }
}

.tool-panel-corner {
  position: absolute;
  z-index: 5;
  width: 12px;
  height: 12px;
  border-color: var(--tool-panel-corner-color);
  border-style: solid;
  pointer-events: none;

  &--tl {
    top: -1px;
    left: -1px;
    border-width: 2px 0 0 2px;
  }

  &--tr {
    top: -1px;
    right: -1px;
    border-width: 2px 2px 0 0;
  }

  &--bl {
    bottom: -1px;
    left: -1px;
    border-width: 0 0 2px 2px;
  }

  &--br {
    right: -1px;
    bottom: -1px;
    border-width: 0 2px 2px 0;
  }
}

.tool-panel-corners--inset .tool-panel-corner {
  &--tl {
    top: 10px;
    left: 10px;
  }

  &--tr {
    top: 10px;
    right: 10px;
  }

  &--bl {
    bottom: 10px;
    left: 10px;
  }

  &--br {
    right: 10px;
    bottom: 10px;
  }
}
</style>
