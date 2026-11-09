<template>
  <!-- eslint-disable vue/no-v-html -->
  <div ref="root" class="note-markdown" v-html="rendered.html" />
  <!-- eslint-enable vue/no-v-html -->
  <template
    v-for="({ widget, target }, index) in mountedWidgets"
    :key="`${revision}-${index}`"
  >
    <Teleport :to="target">
      <div
        v-if="widget.type === 'gallery'"
        class="note-gallery"
        @click.stop
        @keydown.stop
      >
        <MediaGallery
          :items="widget.items"
          :columns="{
            desktop: widget.columns ?? 3,
            mobile: widget.columns ?? 2,
          }"
          preserve-image-colors
          lightweight-image-hover
        />
      </div>
      <div v-else-if="widget.type === 'social-links'" class="note-social-links">
        <span v-if="widget.caption" class="note-social-links__caption">{{
          widget.caption
        }}</span>
        <FooterSocialLinkBar
          :types="['WECHAT', 'MAIL', 'WEIBO', 'BILIBILI']"
          :show-platforms="false"
          weibo-direct
        />
      </div>
      <section v-else class="note-tabs">
        <FilterRail
          horizontal
          :show-avatar="false"
          :items="
            widget.pages.map((page, i) => ({
              id: String(i),
              title: page.title,
            }))
          "
          :model-value="String(selected[index] || 0)"
          aria-label="内容分组"
          @update:model-value="selected[index] = Number($event)"
        />
        <section
          :key="selected[index] || 0"
          :aria-label="widget.pages[selected[index] || 0].title"
        >
          <NoteMarkdown
            :body="widget.pages[selected[index] || 0].body"
            :depth="depth + 1"
          />
        </section>
      </section>
    </Teleport>
  </template>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  shallowRef,
  watch,
} from 'vue'

import FilterRail from '@/components/FilterRail/index.vue'
import FooterSocialLinkBar from '@/components/FooterSocialLinkBar/index.vue'
import MediaGallery from '@/components/MediaGallery/index.vue'
import type { NoteWidget } from '@/utils/noteWidgets'
import { renderNoteContent } from '@/utils/renderNoteMarkdown'

const props = withDefaults(defineProps<{ body: string; depth?: number }>(), {
  depth: 0,
})
const root = ref<HTMLElement | null>(null)
const rendered = computed(() => renderNoteContent(props.body, props.depth))
const mountedWidgets = shallowRef<
  { widget: NoteWidget; target: HTMLElement }[]
>([])
const selected = ref<Record<number, number>>({})
const revision = ref(0)
let pending = 0
watch(
  rendered,
  async (content) => {
    const current = ++pending
    mountedWidgets.value = []
    selected.value = {}
    revision.value++
    if (!content.widgets.length) return
    await nextTick()
    if (current !== pending || !root.value) return
    // 目标只来自本层渲染器；嵌套标签页由下一层阅读器单独管理生命周期。
    // 一次扫描建立占位索引，避免每个组件分别遍历整篇正文。
    const targets = new Map(
      Array.from(
        root.value.querySelectorAll<HTMLElement>('[data-note-widget]'),
        (target) => [Number(target.dataset.noteWidget), target] as const
      )
    )
    mountedWidgets.value = content.widgets.flatMap((widget, index) => {
      const target = targets.get(index)
      return target ? [{ widget, target }] : []
    })
  },
  { immediate: true, flush: 'post' }
)
onBeforeUnmount(() => {
  pending++
})
</script>
