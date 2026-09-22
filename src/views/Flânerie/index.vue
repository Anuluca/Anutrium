<template>
  <div
    class="flanerie-page main-container"
    :class="{ 'is-en': locale === 'en' }"
  >
    <PageHeroTitle />

    <section class="vlog-section">
      <TravelMap :vlogs="vlogs" @select="scrollToVlog" />

      <div class="vlog-groups">
        <section
          v-for="(group, index) in vlogGroups"
          :key="group.id"
          class="vlog-group"
        >
          <Sections
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
    <PageFooter />
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
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import PageFooter from '@/components/PageFooter/index.vue'
import PageHeroTitle from '@/components/PageHeroTitle/index.vue'
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
  rememberJourneySelection(vlog.id, getPageScrollTop())
  router.push(`/flanerie/${vlog.id}`)
}

const activeVlogId = ref<string | null>(null)
let activeVlogTimer: number | undefined
let isJourneyPageUnmounted = false

const { refresh: refreshVlogReveal } = useScrollReveal({
  selector: '.flanerie-page .vlog-image-reveal-entry',
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
  () => document.querySelectorAll<HTMLElement>('.vlog-load-sentinel'),
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
    root: getPageScrollElement,
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
    ? getPageScrollTop() +
      targetBounds.top -
      (window.innerHeight - targetBounds.height) / 2
    : 0
  const restoredScrollTop = Math.max(
    0,
    returnState.scrollTop ?? targetScrollTop
  )

  scrollPageTo({ top: restoredScrollTop })
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

  target.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })

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
.flanerie-page {
  width: 100%;
  color: #fff;
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
  grid-template-columns: repeat(3, minmax(0, 580px));
  justify-content: center;
  column-gap: 8px;
  row-gap: 10px;
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
  .flanerie-page {
    isolation: isolate;
    padding: 0;
  }

  .page-title {
    flex-direction: column;
    gap: 4px;
    font-size: 2.5rem;
  }

  .vlog-grid {
    grid-template-columns: minmax(0, 580px);
    justify-content: center;
    column-gap: 8px;
    row-gap: 28px;
  }

  .vlog-image-reveal-entry.is-vlog-image-revealed :deep(.vlog-img-wrap) {
    animation-delay: var(--vlog-image-delay-1, 420ms);
  }
}

@media (min-width: 769px) and (max-width: 1180px) {
  .vlog-grid {
    grid-template-columns: repeat(2, minmax(0, 540px));
    justify-content: center;
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
</style>
