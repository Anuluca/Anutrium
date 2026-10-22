<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useFloraLikes } from '@/stores/floraLikes'
import { showWarningMessage } from '@/utils/elementMessage'

import type { FloraPetId } from '@/types/floraLikes'

const props = defineProps<{
  petId: FloraPetId
  name: string
  scanMask: string
}>()
const store = useFloraLikes()
const { locale } = useI18n()
const english = computed(() => locale.value === 'en')
const displayed = ref<number | null>(
  store.snapshot?.counts[props.petId] ?? null
)
const flashing = ref(false)
const plus = ref(0)
const message = ref('')
let frame = 0
let alive = true
let refreshTimer: ReturnType<typeof setInterval> | undefined
const refresh = () => {
  if (document.visibilityState === 'visible' && !store.busy && !flashing.value)
    void store.load(true)
}
const reduced = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
const label = computed(() =>
  english.value
    ? `Like ${props.name}. ${
        store.snapshot?.remaining ?? 10
      } of 10 likes remaining today.`
    : `喜爱${props.name}，今日还可点击 ${store.snapshot?.remaining ?? 10} 次`
)
const number = computed(() =>
  displayed.value === null
    ? '0'
    : new Intl.NumberFormat(english.value ? 'en' : 'zh-CN').format(
        displayed.value
      )
)
function countTo(target: number) {
  cancelAnimationFrame(frame)
  const start = displayed.value ?? target
  if (reduced() || start === target) {
    displayed.value = target
    return
  }
  const began = performance.now()
  function tick(now: number) {
    if (!alive) return
    const t = Math.min(1, (now - began) / 450)
    displayed.value = Math.round(
      start + (target - start) * (1 - Math.pow(1 - t, 3))
    )
    if (t < 1) frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
}
watch(
  () => store.snapshot?.counts[props.petId],
  (value) => {
    if (value !== undefined && !flashing.value) countTo(value)
  }
)
function showDailyLimitMessage() {
  showWarningMessage(
    english.value
      ? 'Daily limit reached. Resets at midnight China time.'
      : '今日 10 次已用完，北京时间零点重置。'
  )
}
async function click() {
  if (store.busy || flashing.value) return
  message.value = ''
  if (
    store.snapshot?.remaining === 0 &&
    Date.now() < Date.parse(store.snapshot.resetsAt)
  ) {
    showDailyLimitMessage()
    return
  }
  const previous = displayed.value ?? store.snapshot?.counts[props.petId] ?? 0
  flashing.value = true
  cancelAnimationFrame(frame)
  // 点击即更新本地数值；服务端负责持久化与校准，失败再回退。
  displayed.value = previous + 1
  plus.value++
  try {
    await Promise.all([
      store.like(props.petId),
      new Promise((resolve) => setTimeout(resolve, reduced() ? 0 : 320)),
    ])
    if (!alive) return
    flashing.value = false
    countTo(store.snapshot!.counts[props.petId])
  } catch (error) {
    if (!alive) return
    countTo(store.snapshot?.counts[props.petId] ?? previous)
    plus.value = 0
    const code = error instanceof Error ? error.message : ''
    if (code === 'daily_limit') {
      showDailyLimitMessage()
      return
    }
    message.value =
      code === 'pending_other'
        ? english.value
          ? 'Retry the previous pet first.'
          : '上次点击结果未确认，请先重试刚才的模型。'
        : english.value
        ? 'Could not confirm. Click to retry.'
        : '结果未确认，点击可安全重试。'
  } finally {
    if (alive) flashing.value = false
  }
}
onMounted(() => {
  void store.load()
  refreshTimer = setInterval(refresh, 30000)
  document.addEventListener('visibilitychange', refresh)
})
onBeforeUnmount(() => {
  alive = false
  clearInterval(refreshTimer)
  document.removeEventListener('visibilitychange', refresh)
  cancelAnimationFrame(frame)
})
</script>
<template>
  <span class="flora-like no-rem">
    <button
      type="button"
      class="flora-like__button is-clickable"
      :aria-label="label"
      :aria-busy="store.busy"
      :disabled="store.busy || flashing"
      @click.stop="click"
    >
      <span
        class="flora-like__count"
        aria-live="polite"
        :style="{ '--flora-like-scan-mask': scanMask }"
        ><span class="flora-like__number">{{ number }}</span
        ><span
          v-if="plus"
          :key="plus"
          class="flora-like__plus"
          aria-hidden="true"
          >+1</span
        ></span
      >
      <span class="flora-like__heart">
        <svg
          v-if="plus"
          :key="plus"
          class="flora-like__ripple"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M12 22 2.6 12.6C-3.3 6.7 5.7-2.3 12 4c6.3-6.3 15.3 2.7 9.4 8.6Z"
          />
        </svg>
        <svg
          class="flora-like__icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
          :class="{ 'is-flashing': flashing }"
          :style="{ '--flora-like-scan-mask': scanMask }"
        >
          <path
            d="M12 22 2.6 12.6C-3.3 6.7 5.7-2.3 12 4c6.3-6.3 15.3 2.7 9.4 8.6Z"
          />
        </svg>
      </span>
    </button>
    <span v-if="message" class="flora-like__message" role="status">{{
      message
    }}</span>
  </span>
</template>
<style scoped lang="less">
.flora-like.no-rem {
  --flora-like-icon-size: clamp(16px, 10cqw, 48px);
  --flora-like-gap: 6px;
  --flora-like-rest-color: var(--flora-theme-color);
  position: relative;
  display: inline-flex;
  margin-left: calc(-1 * clamp(1px, 1cqw, 5px) - 3px);
  color: inherit;
  pointer-events: auto;
  .flora-like__button {
    display: inline-flex;
    overflow: visible;
    align-items: center;
    gap: var(--flora-like-gap);
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font-family: 'UnboundedSans', sans-serif;
    font-size: calc(var(--flora-like-icon-size) * 1.16);
    font-weight: 400;
    line-height: var(--flora-like-icon-size);
    cursor: pointer;
    &:focus-visible {
      outline: 1px solid #e23456;
      outline-offset: 4px;
    }
  }
  .flora-like__count {
    position: relative;
    margin-right: calc(-1 * var(--flora-like-gap) - 3px);
    line-height: var(--flora-like-icon-size);
    font-family: inherit;
    font-weight: 400;
    font-variant-numeric: tabular-nums;
  }
  .flora-like__number {
    display: inline-block;
    letter-spacing: 0;
    line-height: var(--flora-like-icon-size);
    // 为超出行盒的字形预留遮罩空间，负外边距保持原有排版高度。
    padding-block: 0.15em;
    margin-block: -0.15em;
    font-family: inherit;
    font-weight: 400;
    transform: translateY(-0.03em);
    -webkit-mask-image: var(--flora-like-scan-mask),
      linear-gradient(to right, #000 40%, transparent);
    mask-image: var(--flora-like-scan-mask),
      linear-gradient(to right, #000 40%, transparent);
    -webkit-mask-composite: source-in;
    mask-composite: intersect;
  }
  svg {
    display: block;
    flex: none;
    width: var(--flora-like-icon-size);
    height: var(--flora-like-icon-size);
    color: var(--flora-like-rest-color);
    transition: color 160ms ease;
    fill: currentColor;
    -webkit-mask-image: var(--flora-like-scan-mask);
    mask-image: var(--flora-like-scan-mask);
  }
  svg.is-flashing {
    animation: flora-like-flash 320ms steps(1, end);
  }
  .flora-like__heart {
    position: relative;
    display: inline-flex;
    flex: none;
    width: var(--flora-like-icon-size);
    height: var(--flora-like-icon-size);
  }
  svg.flora-like__ripple {
    position: absolute;
    inset: 0;
    fill: none;
    stroke: #e23456;
    stroke-width: 1.5;
    overflow: visible;
    pointer-events: none;
    -webkit-mask-image: none;
    mask-image: none;
    transform-origin: center;
    animation: flora-like-ripple 550ms ease-out both;
  }
  .flora-like__plus {
    position: absolute;
    left: 50%;
    bottom: 100%;
    color: #e23456;
    font-family: 'UnboundedSans', sans-serif;
    font-weight: 400;
    pointer-events: none;
    animation: flora-like-plus 700ms ease-out both;
  }
  .flora-like__message {
    pointer-events: none;
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 5;
    width: 220px;
    padding: 8px;
    background: #151515;
    color: #fffff4;
    font-size: 12px;
    line-height: 1.5;
  }
  @media (hover: hover) and (pointer: fine) {
    .flora-like__button:hover {
      --flora-like-rest-color: #e23456;
    }
  }
  @media (max-width: 767px) {
    --flora-like-icon-size: 22px;
    --flora-like-gap: 4px;
  }
  @media (prefers-reduced-motion: reduce) {
    svg.flora-like__ripple {
      display: none;
      animation: none;
    }
    svg.is-flashing {
      animation: none;
      color: #e23456;
    }
    .flora-like__plus {
      animation: none;
      opacity: 0;
    }
  }
}
@keyframes flora-like-ripple {
  from {
    opacity: 0.8;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(1.8);
  }
}
@keyframes flora-like-flash {
  0%,
  40% {
    color: #e23456;
  }
  20%,
  60% {
    color: var(--flora-theme-color);
  }
  100% {
    color: var(--flora-like-rest-color);
  }
}
@keyframes flora-like-plus {
  from {
    opacity: 1;
    transform: translate(-50%, 0);
  }
  to {
    opacity: 0;
    transform: translate(-50%, -24px);
  }
}
</style>
