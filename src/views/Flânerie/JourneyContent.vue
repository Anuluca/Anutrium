<template>
  <div
    ref="contentRoot"
    class="journey-content"
    :class="{ 'is-embedded': embedded, 'is-en': locale === 'en' }"
  >
    <section class="vlog-section">
      <TravelMap ref="travelMap" :vlogs="vlogs" @select="scrollToVlog" />

      <div class="vlog-groups">
        <section
          v-for="(group, index) in vlogGroups"
          :key="group.id"
          class="vlog-group"
        >
          <Sections
            :navigation="!embedded"
            :reveal="!embedded"
            :section-number="index + 1"
            :title="group.title"
            :title-en="group.titleEn"
          >
            <template #actions>
              <SectionCount :count="group.totalCount" />
            </template>
            <div class="vlog-grid">
              <div
                v-for="(vlog, vlogIndex) in group.visibleItems"
                :id="`vlog-${vlog.id}`"
                :key="vlog.id"
                class="vlog-image-reveal-entry"
                :class="{
                  'is-vlog-image-revealed': index === 0 && vlogIndex < 3,
                }"
                :style="getVlogRevealStyle(vlogIndex)"
              >
                <VlogCard
                  :vlog="vlog"
                  :title-effects="!embedded"
                  :active="activeVlogId === vlog.id"
                  :interactive="true"
                  :image-loading="
                    index === 0 && vlogIndex < 3 ? 'eager' : 'lazy'
                  "
                  @select="openVlog(vlog)"
                />
              </div>
              <div
                v-if="group.hasMore"
                class="vlog-load-sentinel"
                :data-vlog-group="group.id"
                aria-hidden="true"
              />
            </div>
          </Sections>
        </section>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  type CSSProperties,
  nextTick,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import SectionCount from '@/components/SectionCount/index.vue'
import Sections from '@/components/Sections/index.vue'
import TravelMap from '@/components/TravelMap/index.vue'
import VlogCard from '@/components/VlogCard/index.vue'
import { useIntersectionActivation } from '@/composables/useIntersectionActivation'
import { useScrollReveal } from '@/composables/useScrollReveal'
import {
  consumeJourneyReturnState,
  type JourneyReturnState,
  rememberJourneySelection,
} from '@/utils/journeyReturnState'
import {
  getPageScrollElement,
  getPageScrollTop,
  scrollPageTo,
} from '@/utils/pageScroll'

import type { JourneyGroup, JourneyItem } from '@/types/flanerie'

const props = withDefaults(
  defineProps<{
    embedded?: boolean
    scrollRoot?: HTMLElement | null
    resizing?: boolean
  }>(),
  { embedded: false, scrollRoot: null }
)
const travelMap = ref<InstanceType<typeof TravelMap> | null>(null)
watch(
  () => props.resizing,
  async (resizing) => {
    if (!resizing) {
      await nextTick()
      travelMap.value?.refreshMapSize()
    }
  }
)
const contentRoot = ref<HTMLElement | null>(null)
const embedded = computed(() => props.embedded)
const router = useRouter()
const { locale, tm } = useI18n()
const VLOG_BATCH_SIZE = 9
const visibleVlogCounts = reactive<Record<string, number>>({
  visited: VLOG_BATCH_SIZE,
  resident: 0,
  activity: 0,
})

const vlogs = computed<JourneyItem[]>(() => {
  return tm('flanerie.dynamic.vlogs') as JourneyItem[]
})

const vlogGroups = computed(() => {
  const groups = tm('flanerie.dynamic.groups') as JourneyGroup[]
  const itemsByCategory = new Map<JourneyGroup['id'], JourneyItem[]>()

  vlogs.value.forEach((vlog) => {
    const category = vlog.category ?? 'visited'
    const items = itemsByCategory.get(category)
    if (items) items.push(vlog)
    else itemsByCategory.set(category, [vlog])
  })

  return groups.map((group) => {
    const items = itemsByCategory.get(group.id) ?? []
    const visibleCount = visibleVlogCounts[group.id] || 0

    return {
      ...group,
      totalCount: items.length,
      visibleItems: items.slice(0, visibleCount),
      hasMore: visibleCount < items.length,
    }
  })
})

const revealVlog = (vlogId: string) => {
  const vlog = vlogs.value.find((item) => item.id === vlogId)
  if (!vlog) return
  const groupId = vlog.category ?? 'visited'
  const groupItems = vlogs.value.filter(
    (item) => (item.category ?? 'visited') === groupId
  )
  const itemIndex = groupItems.findIndex((item) => item.id === vlogId)
  if (itemIndex >= 0) {
    visibleVlogCounts[groupId] = Math.max(
      visibleVlogCounts[groupId] || 0,
      itemIndex + 1
    )
  }
}

const openVlog = (vlog: JourneyItem) => {
  rememberJourneySelection(
    vlog.id,
    props.scrollRoot?.scrollTop ?? getPageScrollTop()
  )
  router.push({
    path: `/flanerie/${vlog.id}`,
    query: props.embedded ? { from: 'home' } : {},
  })
}

const activeVlogId = ref<string | null>(null)
let activeVlogTimer: number | undefined
let isJourneyPageUnmounted = false

const { refresh: refreshVlogReveal } = useScrollReveal({
  selector: '.journey-content .vlog-image-reveal-entry',
  revealedClass: 'is-vlog-image-revealed',
  rootMargin: '0px 0px -14% 0px',
  threshold: 0,
})

const loadNextVlogBatch = (groupId: string) => {
  const totalCount = vlogGroups.value.find(
    (group) => group.id === groupId
  )?.totalCount
  if (!totalCount) return
  visibleVlogCounts[groupId] = Math.min(
    totalCount,
    (visibleVlogCounts[groupId] || 0) + VLOG_BATCH_SIZE
  )
}

const { refresh: observeVlogGroupSentinels } = useIntersectionActivation(
  () =>
    contentRoot.value?.querySelectorAll<HTMLElement>('.vlog-load-sentinel') ??
    [],
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      const groupId = (entry.target as HTMLElement).dataset.vlogGroup
      if (groupId) loadNextVlogBatch(groupId)
    }
    void nextTick(() => {
      refreshVlogReveal()
      observeVlogGroupSentinels()
    })
  },
  {
    autoStart: false,
    root: () => props.scrollRoot ?? getPageScrollElement(),
    rootMargin: '240px 0px',
    threshold: 0,
    onUnsupported: () => {
      for (const group of vlogGroups.value) {
        visibleVlogCounts[group.id] = group.totalCount
      }
      void nextTick(refreshVlogReveal)
    },
  }
)

const getVlogRevealStyle = (index: number): CSSProperties =>
  ({
    '--vlog-image-delay-1': '420ms',
    '--vlog-image-delay-2': `${420 + (index % 2) * 120}ms`,
    '--vlog-image-delay-3': `${420 + (index % 3) * 120}ms`,
  } as CSSProperties)

const waitForAnimationFrames = (count: number) =>
  new Promise<void>((resolve) => {
    const wait = (remaining: number) => {
      if (remaining <= 0) {
        resolve()
        return
      }

      window.requestAnimationFrame(() => wait(remaining - 1))
    }

    wait(count)
  })

const restoreJourneyReturnState = async (returnState: JourneyReturnState) => {
  revealVlog(returnState.vlogId)
  activeVlogId.value = returnState.vlogId
  await nextTick()

  // Run after the router's delayed history restoration so this route owns the
  // final scroll position regardless of which page returned immediately before it.
  await waitForAnimationFrames(3)
  if (isJourneyPageUnmounted) return

  const target = document.getElementById(`vlog-${returnState.vlogId}`)
  const targetBounds = target?.getBoundingClientRect()
  const targetScrollTop = targetBounds
    ? (props.scrollRoot?.scrollTop ?? getPageScrollTop()) +
      targetBounds.top -
      (props.scrollRoot?.getBoundingClientRect().top ?? 0) -
      ((props.scrollRoot?.clientHeight ?? window.innerHeight) -
        targetBounds.height) /
        2
    : 0
  const restoredScrollTop = Math.max(
    0,
    returnState.scrollTop ?? targetScrollTop
  )

  if (props.scrollRoot) props.scrollRoot.scrollTo({ top: restoredScrollTop })
  else scrollPageTo({ top: restoredScrollTop })
  clearActiveVlogTimer()
  activeVlogTimer = window.setTimeout(() => {
    activeVlogId.value = null
    activeVlogTimer = undefined
  }, 1000)
}

const clearActiveVlogTimer = () => {
  if (!activeVlogTimer) return

  window.clearTimeout(activeVlogTimer)
  activeVlogTimer = undefined
}

const scrollToVlog = async (vlogId: string) => {
  revealVlog(vlogId)
  await nextTick()
  const target = document.getElementById(`vlog-${vlogId}`)
  if (!target) return

  clearActiveVlogTimer()
  activeVlogId.value = vlogId

  if (props.scrollRoot) {
    const panel = props.scrollRoot
    panel.scrollTo({
      top:
        panel.scrollTop +
        target.getBoundingClientRect().top -
        panel.getBoundingClientRect().top -
        (panel.clientHeight - target.clientHeight) / 2,
      behavior: 'smooth',
    })
  } else target.scrollIntoView({ behavior: 'smooth', block: 'center' })

  activeVlogTimer = window.setTimeout(() => {
    activeVlogId.value = null
    activeVlogTimer = undefined
  }, 1000)
}

onMounted(() => {
  isJourneyPageUnmounted = false
  void nextTick(observeVlogGroupSentinels)
  const returnState = consumeJourneyReturnState()
  if (returnState) restoreJourneyReturnState(returnState)
})

onUnmounted(() => {
  isJourneyPageUnmounted = true
  clearActiveVlogTimer()
})
</script>

<style lang="less" scoped>
.journey-content {
  width: 100%;
  color: inherit;
  overflow-x: hidden;
  overflow-x: clip;
}

.vlog-section {
  padding: 0 0 30px;
  overflow-x: hidden;
  overflow-x: clip;
}

.vlog-groups {
  display: flex;
  flex-direction: column;
  gap: 54px;
}

.vlog-group {
  min-width: 0;
  content-visibility: auto;
  contain-intrinsic-size: auto 760px;
}

.vlog-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  column-gap: 8px;
  row-gap: 10px;
}

.vlog-image-reveal-entry {
  min-width: 0;
  height: 100%;
}

.vlog-image-reveal-entry :deep(.shared-vlog-card) {
  height: 100%;
  max-width: none;
}

.vlog-load-sentinel {
  min-height: 1px;
  grid-column: 1 / -1;
}

.vlog-image-reveal-entry :deep(.vlog-img-wrap) {
  clip-path: inset(49.5%);
  -webkit-mask-image: linear-gradient(#000 0 0);
  mask-image: linear-gradient(#000 0 0);
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-size: 1% 1%;
  mask-size: 1% 1%;
}

.vlog-image-reveal-entry.is-vlog-image-revealed :deep(.vlog-img-wrap) {
  animation: vlogImageFrameExpand 1.18s cubic-bezier(0.16, 0.72, 0.24, 1)
    var(--vlog-image-delay-3, 420ms) both;
}

@keyframes vlogImageFrameExpand {
  from {
    clip-path: inset(49.5%);
    -webkit-mask-size: 1% 1%;
    mask-size: 1% 1%;
  }

  to {
    clip-path: inset(0);
    -webkit-mask-size: 100% 100%;
    mask-size: 100% 100%;
  }
}

@media (max-width: 768px) {
  .journey-content {
    isolation: isolate;
    padding: 0;
  }

  .page-title {
    flex-direction: column;
    gap: 4px;
    font-size: 2.5rem;
  }

  .vlog-grid {
    grid-template-columns: minmax(0, 1fr);
    column-gap: 8px;
    row-gap: 28px;
  }

  .vlog-image-reveal-entry.is-vlog-image-revealed :deep(.vlog-img-wrap) {
    animation-delay: var(--vlog-image-delay-1, 420ms);
  }
}

@media (min-width: 769px) and (max-width: 1180px) {
  .vlog-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .vlog-image-reveal-entry.is-vlog-image-revealed :deep(.vlog-img-wrap) {
    animation-delay: var(--vlog-image-delay-2, 420ms);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vlog-image-reveal-entry :deep(.vlog-img-wrap),
  .vlog-image-reveal-entry.is-vlog-image-revealed :deep(.vlog-img-wrap) {
    clip-path: inset(0);
    -webkit-mask-size: 100% 100%;
    mask-size: 100% 100%;
    animation: none;
  }
}
.is-embedded {
  container-type: inline-size;
  .vlog-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@container (min-width: 800px) {
  .is-embedded .vlog-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@container (max-width: 420px) {
  .is-embedded .vlog-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
