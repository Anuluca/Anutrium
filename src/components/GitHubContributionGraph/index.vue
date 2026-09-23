<template>
  <component
    :is="decorative ? 'div' : 'a'"
    class="github-contribution-graph"
    :class="{
      'is-decorative': decorative,
      'is-loading': isLoading,
      'has-error': hasError,
    }"
    :href="decorative ? undefined : profileUrl"
    :target="decorative ? undefined : '_blank'"
    :rel="decorative ? undefined : 'noreferrer'"
    :aria-hidden="decorative ? 'true' : undefined"
    :aria-label="decorative ? undefined : accessibleLabel"
  >
    <svg
      class="github-contribution-graph__calendar"
      :viewBox="`0 0 ${viewBoxWidth} ${VIEWBOX_HEIGHT}`"
      role="img"
      :aria-hidden="decorative ? 'true' : undefined"
    >
      <g v-if="days.length">
        <rect
          v-for="day in days"
          :key="day.date"
          class="github-contribution-graph__day"
          :class="`is-${day.contributionLevel.toLowerCase()}`"
          :x="day.weekIndex * CELL_STEP"
          :y="day.weekday * CELL_STEP"
          :width="CELL_SIZE"
          :height="CELL_SIZE"
          :style="getTwinkleStyle(day)"
          rx="2"
        >
          <title>{{ getDayTitle(day) }}</title>
        </rect>
      </g>
      <g v-else class="github-contribution-graph__placeholder">
        <rect
          v-for="cell in placeholderCells"
          :key="cell.key"
          :x="cell.weekIndex * CELL_STEP"
          :y="cell.weekday * CELL_STEP"
          :width="CELL_SIZE"
          :height="CELL_SIZE"
          rx="2"
        />
      </g>
    </svg>

    <span v-if="showSummary" class="github-contribution-graph__summary">
      <template v-if="summaryText">{{ summaryText }}</template>
      <template v-else-if="data">
        {{ formattedTotal }} contributions · last year
      </template>
      <template v-else-if="hasError">Contributions unavailable</template>
      <template v-else>Loading contributions…</template>
    </span>
  </component>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type ContributionLevel =
  | 'NONE'
  | 'FIRST_QUARTILE'
  | 'SECOND_QUARTILE'
  | 'THIRD_QUARTILE'
  | 'FOURTH_QUARTILE'

interface ContributionDay {
  contributionCount: number
  contributionLevel: ContributionLevel
  date: string
  weekday: number
}

interface ContributionWeek {
  days: ContributionDay[]
  firstDay: string
}

interface ContributionResponse {
  from: string
  to: string
  totalContributions: number
  updatedAt: string
  username: string
  weeks: ContributionWeek[]
}

interface CalendarDay extends ContributionDay {
  weekIndex: number
}

const props = withDefaults(
  defineProps<{
    decorative?: boolean
    endpoint?: string
    showSummary?: boolean
    summaryText?: string
    username: string
  }>(),
  {
    decorative: false,
    endpoint: '',
    showSummary: true,
    summaryText: '',
  }
)

const CELL_SIZE = 10
const CELL_STEP = 13
const VIEWBOX_HEIGHT = CELL_STEP * 7 - (CELL_STEP - CELL_SIZE)
const PLACEHOLDER_WEEK_COUNT = 53
const DEFAULT_WORKER_URL = (
  import.meta.env.VITE_PROFILE_WORKER_URL ||
  import.meta.env.VITE_STEAM_WORKER_URL ||
  'https://anutrium-steam-api.tilucario.workers.dev'
).replace(/\/$/, '')

const responseCache = new Map<string, ContributionResponse>()
const data = ref<ContributionResponse | null>(null)
const isLoading = ref(true)
const hasError = ref(false)
let requestController: AbortController | null = null

const requestUrl = computed(
  () => props.endpoint || `${DEFAULT_WORKER_URL}/github/contributions`
)
const profileUrl = computed(() => `https://github.com/${props.username}`)
const days = computed<CalendarDay[]>(() =>
  (data.value?.weeks ?? []).flatMap((week, weekIndex) =>
    week.days.map((day) => ({ ...day, weekIndex }))
  )
)
const weekCount = computed(
  () => data.value?.weeks.length || PLACEHOLDER_WEEK_COUNT
)
const viewBoxWidth = computed(
  () => weekCount.value * CELL_STEP - (CELL_STEP - CELL_SIZE)
)
const formattedTotal = computed(() =>
  new Intl.NumberFormat().format(data.value?.totalContributions ?? 0)
)
const accessibleLabel = computed(() =>
  data.value
    ? `${props.username}: ${formattedTotal.value} GitHub contributions in the last year`
    : `${props.username} GitHub contributions`
)
const placeholderCells = Array.from(
  { length: PLACEHOLDER_WEEK_COUNT * 7 },
  (_, index) => ({
    key: index,
    weekIndex: Math.floor(index / 7),
    weekday: index % 7,
  })
)

const getDayTitle = (day: CalendarDay) =>
  `${day.date}: ${day.contributionCount} contribution${
    day.contributionCount === 1 ? '' : 's'
  }`

const getTwinkleStyle = (day: CalendarDay) => {
  const seed = day.weekIndex * 7 + day.weekday

  return {
    '--github-twinkle-delay': `${-((seed * 0.37) % 4.8).toFixed(2)}s`,
    '--github-twinkle-duration': `${(2.8 + (seed % 9) * 0.24).toFixed(2)}s`,
  }
}

const loadContributions = async () => {
  const cacheKey = `${requestUrl.value}:${props.username}`
  const cached = responseCache.get(cacheKey)
  if (cached) {
    data.value = cached
    isLoading.value = false
    return
  }

  const controller = new AbortController()
  requestController = controller

  try {
    const response = await fetch(requestUrl.value, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    const body = (await response.json()) as ContributionResponse & {
      error?: string
    }

    if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`)
    if (body.username.toLowerCase() !== props.username.toLowerCase()) {
      throw new Error('GitHub contribution username mismatch')
    }

    responseCache.set(cacheKey, body)
    data.value = body
  } catch (error) {
    if (!controller.signal.aborted) hasError.value = true
  } finally {
    if (requestController === controller) {
      requestController = null
      isLoading.value = false
    }
  }
}

onMounted(loadContributions)
onBeforeUnmount(() => {
  requestController?.abort()
  requestController = null
})
</script>

<style lang="less" scoped>
.github-contribution-graph {
  --github-contribution-empty: rgba(255, 255, 255, 0.055);
  --github-contribution-1: rgba(90, 212, 128, 0.28);
  --github-contribution-2: rgba(90, 212, 128, 0.48);
  --github-contribution-3: rgba(90, 212, 128, 0.7);
  --github-contribution-4: #5ad480;

  display: block;
  min-width: 0;
  color: rgba(255, 255, 255, 0.42);
  text-decoration: none;
}

.github-contribution-graph__calendar {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.github-contribution-graph__day,
.github-contribution-graph__placeholder rect {
  fill: var(--github-contribution-empty);
}

.github-contribution-graph__day {
  transition: fill 0.2s ease, opacity 0.2s ease;

  &:not(.is-none) {
    animation: githubContributionTwinkle var(--github-twinkle-duration, 3.6s)
      ease-in-out var(--github-twinkle-delay, 0s) infinite;
  }

  &.is-first_quartile {
    fill: var(--github-contribution-1);
  }

  &.is-second_quartile {
    fill: var(--github-contribution-2);
  }

  &.is-third_quartile {
    fill: var(--github-contribution-3);
  }

  &.is-fourth_quartile {
    fill: var(--github-contribution-4);
  }
}

.github-contribution-graph__summary {
  display: block;
  margin-top: 0.45rem;
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: 0.68rem;
  letter-spacing: 0.02em;
}

.github-contribution-graph:not(.is-decorative):hover
  .github-contribution-graph__day {
  opacity: 0.82;
}

.github-contribution-graph__placeholder {
  opacity: 0.52;
}

.github-contribution-graph.is-loading .github-contribution-graph__placeholder {
  animation: githubContributionLoading 1.6s ease-in-out infinite;
}

.github-contribution-graph.has-error .github-contribution-graph__placeholder {
  opacity: 0.24;
}

@keyframes githubContributionLoading {
  0%,
  100% {
    opacity: 0.24;
  }

  50% {
    opacity: 0.62;
  }
}

@keyframes githubContributionTwinkle {
  0%,
  64%,
  100% {
    filter: brightness(0.94);
    opacity: 0.82;
  }

  76% {
    filter: brightness(1.28);
    opacity: 0.98;
  }
}

@media (prefers-reduced-motion: reduce) {
  .github-contribution-graph__day,
  .github-contribution-graph__placeholder {
    animation: none !important;
  }
}
</style>
