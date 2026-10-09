<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, onUnmounted, ref } from 'vue'

import { setSmoothScrollLocked } from '@/utils/smoothScroll'

import { templeCategories, type TempleCategoryId } from './templeCategories'

const stage = ref<HTMLElement | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const selected = ref<TempleCategoryId | null>(null)
const menuCategory = ref<TempleCategoryId | null>(null)
const settled = ref(false)
const category = computed(() =>
  templeCategories.find((item) => item.id === menuCategory.value)
)
const buttons = new Map<string, HTMLElement>()
let scene:
  | { select: (id: TempleCategoryId) => void; dispose: () => void }
  | undefined
let disposed = false

const setButton = (id: string, element: unknown) => {
  if (element instanceof HTMLElement) buttons.set(id, element)
  else buttons.delete(id)
}

onMounted(async () => {
  document.body.classList.remove('island-pc-shell-leaving')
  document.body.classList.add('island-pc-shell')
  setSmoothScrollLocked('island-temple', true)
  try {
    const { createIslandTemple } = await import('./islandTempleScene')
    if (disposed || !stage.value) return
    scene = createIslandTemple(stage.value, buttons, {
      ready: () => {
        status.value = 'ready'
      },
      select: (id) => {
        selected.value = id
        settled.value = false
      },
      settled: () => {
        menuCategory.value = selected.value
        settled.value = true
      },
      error: (error) => {
        status.value = 'error'
        console.error('神殿场景加载失败', error)
      },
    })
  } catch (error) {
    if (!disposed) {
      status.value = 'error'
      console.error(error)
    }
  }
})

onBeforeUnmount(() => {
  disposed = true
  scene?.dispose()
})
onUnmounted(() => {
  document.body.classList.remove('island-pc-shell')
  setSmoothScrollLocked('island-temple', false)
})
</script>

<template>
  <main
    class="lucario-page temple-page no-rem"
    data-route-shell="island-pc"
    aria-label="个人海湾"
    :data-selected="selected || 'none'"
    :data-settled="settled"
  >
    <div
      ref="stage"
      class="lucario-stage temple-stage"
      :aria-busy="status === 'loading'"
    />
    <div class="temple-obelisks">
      <button
        v-for="item in templeCategories"
        :key="item.id"
        :ref="(element) => setButton(item.id, element)"
        type="button"
        class="temple-obelisk"
        :data-obelisk="item.id"
        :aria-label="`${item.roman} / ${item.title}`"
        :aria-pressed="selected === item.id"
        :disabled="status !== 'ready'"
        @click="scene?.select(item.id)"
      />
    </div>
    <Transition name="temple-menu-reveal">
      <section
        v-if="category"
        class="temple-menu"
        :class="{ 'temple-menu--left': category.x > 0, 'is-visible': settled }"
        :aria-label="category.title"
        :inert="!settled || undefined"
      >
        <header>
          <span>{{ category.roman }} /</span>
          <h1>{{ category.title }}</h1>
          <i />
        </header>
        <RouterLink
          v-for="item in category.items"
          :key="item.title"
          :to="item.path"
          class="temple-menu-item"
          :tabindex="settled ? 0 : -1"
        >
          <span class="temple-menu-icon">
            <svg
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              stroke-width="1.3"
              aria-hidden="true"
            >
              <template v-if="item.icon === 'flask'">
                <path
                  d="M18 4h12v4h-3v13l13 20c1 2 0 3-2 3H10c-2 0-3-1-2-3l13-20V8h-3Z"
                />
                <path d="M14 33h20l6 9H8Z" fill="#89132e" stroke="none" />
              </template>
              <template v-else-if="item.icon === 'cube'">
                <path
                  d="m24 4 18 10v20L24 44 6 34V14Zm0 0v20m18-10L24 24 6 14m18 10v20M6 34l18-10 18 10"
                />
              </template>
              <template v-else-if="item.icon === 'camera'">
                <path d="M5 14h10l4-6h10l4 6h10v27H5Z" />
                <circle cx="24" cy="27" r="9" />
              </template>
              <template v-else-if="item.icon === 'art'">
                <path d="m12 35 22-29 8 6-23 29-11 3Z M29 12l8 6M12 35l7 6" />
              </template>
              <template v-else-if="item.icon === 'book'">
                <path
                  d="M24 12C18 7 10 7 4 9v30c8-2 14-1 20 4 6-5 12-6 20-4V9c-6-2-14-2-20 3Zm0 0v31"
                />
              </template>
              <template v-else-if="item.icon === 'notes'">
                <path d="M10 4h28v40H10ZM17 15h14M17 23h14M17 31h10" />
              </template>
              <template v-else>
                <path
                  d="M15 13h18c7 0 13 23 8 25-4 2-9-6-12-6H19c-3 0-8 8-12 6-5-2 1-25 8-25Z M15 19v11m-5-5h10"
                />
                <circle cx="33" cy="22" r="1.5" />
                <circle cx="37" cy="27" r="1.5" />
              </template>
            </svg>
          </span>
          <span class="temple-menu-copy"
            ><strong>{{ item.title }}</strong
            ><small>{{ item.english }}</small></span
          >
          <svg
            class="temple-menu-arrow"
            viewBox="0 0 12 20"
            fill="none"
            aria-hidden="true"
          >
            <path d="m3 4 6 6-6 6" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </RouterLink>
      </section>
    </Transition>
    <p v-if="status === 'error'" class="lucario-status" role="alert">
      模型加载失败，请刷新页面重试
    </p>
  </main>
</template>

<style lang="less" scoped src="./TempleHarbor.less" />
