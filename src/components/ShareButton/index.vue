<template>
  <button
    class="share-button"
    :class="{
      'share-button--copied': copied,
      'share-button--compact': !showLabel && !showArrow,
      'share-button--with-icon': showIcon,
    }"
    type="button"
    @click="handleShare"
  >
    <ShareIcon v-if="showIcon" class="share-button__icon" aria-hidden="true" />
    <span class="share-button__code">{{ copied ? 'COPIED' : 'SHARE' }}</span>
    <span v-if="showLabel" class="share-button__label">{{
      copied ? copiedText : label
    }}</span>
    <span v-if="showArrow" class="share-button__arrow" aria-hidden="true">
      ↗
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Share as ShareIcon } from '@element-plus/icons-vue'

import { trackShare } from '@/utils/analytics'

const props = withDefaults(
  defineProps<{
    copiedText?: string
    label?: string
    targetId?: string
    targetTitle?: string
    targetType?: string
    text?: string
    title: string
    url?: string
    showArrow?: boolean
    showIcon?: boolean
    showLabel?: boolean
  }>(),
  {
    copiedText: '已复制',
    label: '分享',
    targetId: '',
    targetTitle: '',
    targetType: 'page',
    text: '',
    url: '',
    showArrow: true,
    showIcon: false,
    showLabel: true,
  }
)

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

const shareUrl = computed(() => {
  if (props.url) return props.url
  if (typeof window === 'undefined') return ''
  return window.location.href
})

const flashCopied = () => {
  copied.value = true
  if (copiedTimer) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => {
    copied.value = false
    copiedTimer = null
  }, 1600)
}

const copyText = async (text: string) => {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

const handleShare = async () => {
  const url = shareUrl.value
  const shareData = {
    title: props.title,
    text: props.text || props.title,
    url,
  }

  trackShare({
    method: 'attempt',
    targetId: props.targetId,
    targetTitle: props.targetTitle || props.title,
    targetType: props.targetType,
    url,
  })

  if (navigator.share) {
    try {
      await navigator.share(shareData)
      trackShare({
        method: 'native',
        targetId: props.targetId,
        targetTitle: props.targetTitle || props.title,
        targetType: props.targetType,
        url,
      })
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
    }
  }

  try {
    await copyText(url)
    flashCopied()
    trackShare({
      method: 'clipboard',
      targetId: props.targetId,
      targetTitle: props.targetTitle || props.title,
      targetType: props.targetType,
      url,
    })
  } catch {
    trackShare({
      method: 'copy_failed',
      targetId: props.targetId,
      targetTitle: props.targetTitle || props.title,
      targetType: props.targetType,
      url,
    })
  }
}
</script>

<style lang="less" scoped>
.share-button {
  position: relative;
  min-height: 34px;
  display: inline-grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 9px;
  padding: 7px 11px;
  overflow: hidden;
  border: 1px solid rgba(226, 52, 86, 0.38);
  color: #e23456;
  background: linear-gradient(120deg, rgba(226, 52, 86, 0.14), transparent 52%),
    rgba(8, 5, 10, 0.88);
  font-family: 'alibaba-puhuiti', sans-serif;
  cursor: pointer;
  transition: color 0.22s ease, border-color 0.22s ease,
    background-color 0.22s ease;

  &::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 2px;
    background: currentColor;
    opacity: 0.8;
  }

  &--compact {
    grid-template-columns: auto;
    min-height: 26px;
    gap: 6px;
    padding: 3px 8px;
  }

  &--compact&--with-icon {
    grid-template-columns: auto auto;
  }

  &:hover,
  &:focus-visible,
  &--copied {
    color: #071009;
    border-color: #5ad480;
    background: #5ad480;
    outline: none;
  }
}

.share-button__icon {
  width: 0.52rem;
  height: 0.52rem;
}

.share-button__code {
  font-family: 'cn-custom', monospace;
  font-size: 0.28rem;
  letter-spacing: 0.14em;
  opacity: 0.66;
}

.share-button__label {
  font-size: 0.44rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.share-button__arrow {
  font-size: 0.5rem;
  line-height: 1;
}
</style>
