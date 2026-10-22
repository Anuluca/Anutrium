<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDocumentVisibility } from '@vueuse/core'

import { useIntersectionActivation } from '@/composables/useIntersectionActivation'
import { readVisitorOnline, readVisitorViews } from '@/utils/analyticsResource'

const { locale } = useI18n()
const en = computed(() => locale.value === 'en')
const root = ref<HTMLElement>()
const visible = ref(false)
const visibility = useDocumentVisibility()
const active = computed(() => visible.value && visibility.value !== 'hidden')
const online = shallowRef<number | null>(null)
const views = shallowRef<number | null>(null)
const numberFormat = computed(
  () => new Intl.NumberFormat(en.value ? 'en-US' : 'zh-CN')
)
const format = (value: number | null) =>
  value === null ? '—' : numberFormat.value.format(value)
let controller: AbortController | undefined
let timer: ReturnType<typeof setTimeout> | undefined

async function refresh() {
  if (!active.value || controller) return
  const current = new AbortController()
  controller = current
  const read = async (
    reader: typeof readVisitorOnline,
    target: typeof online
  ) => {
    try {
      const result = await reader(current.signal)
      if (!current.signal.aborted) target.value = result.count
    } catch {
      if (!current.signal.aborted) target.value = null
    }
  }
  await Promise.all([
    read(readVisitorOnline, online),
    read(readVisitorViews, views),
  ])
  if (controller !== current) return
  controller = undefined
  if (active.value) timer = setTimeout(() => void refresh(), 60000)
}
function pause() {
  clearTimeout(timer)
  controller?.abort()
  controller = undefined
  // 返回页面时先显示占位，避免把离开前的人数当作当前在线人数。
  online.value = null
}
watch(active, (enabled) => (enabled ? void refresh() : pause()))
useIntersectionActivation(
  () => root.value || null,
  ([entry]) => {
    visible.value = entry?.isIntersecting ?? false
  },
  {
    rootMargin: '120px',
    onUnsupported: () => {
      visible.value = true
    },
  }
)
onBeforeUnmount(pause)
</script>

<template>
  <div
    ref="root"
    class="site-visitors no-rem"
    :aria-label="en ? 'Site visits' : '访问统计'"
    @click.stop
  >
    <span
      :title="
        en
          ? 'Estimated from active users in the last 5 minutes; may be delayed.'
          : '按近 5 分钟活跃用户估算，可能存在延迟。'
      "
    >
      {{ en ? 'ONLINE' : '当前在线' }} <strong>{{ format(online) }}</strong>
    </span>
    <span
      :title="
        en
          ? 'Processed page views across current and previous sites; reporting may lag 24–48 hours.'
          : '包含新站与旧站域名的已处理历史浏览量；数据可能延迟 24–48 小时。'
      "
    >
      {{ en ? 'TOTAL VIEWS' : '总访问量' }} <strong>{{ format(views) }}</strong>
    </span>
  </div>
</template>

<style scoped lang="less">
.site-visitors.no-rem {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 7;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 20px;
  max-width: calc(100% - 32px);
  color: var(--text-muted);
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: 14px;
  font-weight: 900;
  opacity: 0.6;
  line-height: 1.6;
  pointer-events: auto;
  span {
    white-space: nowrap;
  }
  strong {
    font-weight: inherit;
    margin-left: 6px;
    color: var(--text-color);
    font-variant-numeric: tabular-nums;
  }
}
</style>
