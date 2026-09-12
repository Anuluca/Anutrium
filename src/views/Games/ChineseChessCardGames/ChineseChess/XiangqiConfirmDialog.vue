<template>
  <div class="xiangqi-confirm" @click.self="$emit('cancel')">
    <section
      ref="dialogElement"
      class="xiangqi-confirm__dialog"
      role="alertdialog"
      aria-modal="true"
      :aria-label="message"
      tabindex="-1"
      @keydown.esc.stop.prevent="$emit('cancel')"
    >
      <p>{{ message }}</p>
      <div class="xiangqi-confirm__actions">
        <slot name="actions" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'

defineProps<{ message: string }>()
defineEmits<{ cancel: [] }>()

const dialogElement = ref<HTMLElement | null>(null)

onMounted(async () => {
  await nextTick()
  dialogElement.value?.focus()
})
</script>

<style lang="less" scoped>
.xiangqi-confirm {
  position: absolute;
  z-index: 50;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgb(71 36 16 / 58%);

  &__dialog {
    display: grid;
    min-width: min(42cqw, 360px);
    padding: 4cqh 3cqw;
    border: 4px double #71341f;
    box-sizing: border-box;
    place-items: center;
    background: #d8ac73;
    box-shadow: 0 1.2cqh 0 rgb(71 36 16 / 45%);
    outline: 0;
  }

  p {
    margin: 0 0 3cqh;
    color: #472410;
    font: 900 clamp(18px, 3.2cqh, 32px) / 1.2 'STKaiti', 'KaiTi', serif;
  }

  &__actions {
    display: flex;
    justify-content: center;
    gap: 2cqw;
  }
}
</style>
