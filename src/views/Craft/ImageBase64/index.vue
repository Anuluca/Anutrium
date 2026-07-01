<template>
  <ToolPageLayout
    page-class="image64-tool"
    tool-id="image-base64"
    title="图片转Base64"
    description="上传图片生成 Base64 Data URL，可预览并一键复制完整内容。"
    :recommended-tools="recommendedTools"
  >
    <div class="pt-grid">
      <div
        class="pt-panel upload-stage"
        @dragover.prevent
        @drop.prevent="handleDrop"
      >
        <input
          id="image64-upload"
          type="file"
          accept="image/*"
          class="upload-input"
          @change="handleFileChange"
        />
        <label
          for="image64-upload"
          class="upload-label"
          :class="{ 'has-image': dataUrl }"
        >
          <template v-if="dataUrl">
            <img :src="dataUrl" alt="Preview" class="preview-img" />
            <div class="preview-overlay">
              <span>[ 点击或拖拽更换图片 ]</span>
            </div>
          </template>
          <template v-else>
            <div class="upload-icon">▨</div>
            <div class="upload-text"><span>点击或拖拽上传图片</span></div>
            <div class="upload-hint">
              <span>支持 JPG / PNG / WEBP / GIF / SVG</span>
            </div>
          </template>
        </label>

        <div class="pt-scanlines" />
        <div class="corner-img corner--tl" />
        <div class="corner-img corner--tr" />
        <div class="corner-img corner--bl" />
        <div class="corner-img corner--br" />
      </div>

      <div class="right-panel image64-result">
        <div class="pt-panel-title">
          <span>[ 输出结果 ]</span>
          <span>{{ dataUrl ? formatSize(dataUrl.length) : 'NO DATA' }}</span>
        </div>

        <div class="file-meta">
          <div>
            <span>文件名</span>
            <strong>{{ fileInfo.name || '-' }}</strong>
          </div>
          <div>
            <span>类型</span>
            <strong>{{ fileInfo.type || '-' }}</strong>
          </div>
          <div>
            <span>大小</span>
            <strong>{{
              fileInfo.size ? formatSize(fileInfo.size) : '-'
            }}</strong>
          </div>
        </div>

        <div class="pt-code-wrap">
          <div class="pt-code-header">
            <span>DATA_URL</span>
            <button class="pt-btn" :disabled="!dataUrl" @click="copyDataUrl">
              <span>{{ copied ? '已复制 !' : '点击复制' }}</span>
            </button>
          </div>
          <pre
            class="pt-code-block"
          ><code>{{ dataUrl || '// NO DATA\n// 请先上传图片...' }}</code></pre>
        </div>

        <div class="corner corner--tl" />
        <div class="corner corner--tr" />
        <div class="corner corner--bl" />
        <div class="corner corner--br" />
      </div>
    </div>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'

import ToolPageLayout from '@/components/ToolPageLayout/index.vue'

import 'element-plus/es/components/message/style/css'

const dataUrl = ref('')
const copied = ref(false)
const fileInfo = reactive({
  name: '',
  size: 0,
  type: '',
})

const recommendedTools = [
  { label: 'HTML常用转义字符', path: '/htmlEntities' },
  { label: 'Base64加解密', path: '/base64Codec' },
  { label: '图片转Base64', path: '/imageBase64' },
]

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) processFile(file)
}

const handleDrop = (event: DragEvent) => {
  const file = event.dataTransfer?.files?.[0]
  if (file) processFile(file)
}

const processFile = (file: File) => {
  if (!file.type.startsWith('image/')) return

  fileInfo.name = file.name
  fileInfo.size = file.size
  fileInfo.type = file.type || 'image/*'

  const reader = new FileReader()
  reader.onload = (event) => {
    dataUrl.value = String(event.target?.result || '')
  }
  reader.readAsDataURL(file)
}

const copyDataUrl = async () => {
  if (!dataUrl.value) return

  try {
    await navigator.clipboard.writeText(dataUrl.value)
    copied.value = true
    ElMessage.success('复制成功')
    setTimeout(() => {
      copied.value = false
    }, 1800)
  } catch (err) {
    ElMessage.error('复制失败，请手动复制')
    console.error('Copy failed', err)
  }
}

const formatSize = (size: number) => {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}
</script>

<style lang="less" scoped>
@red: #e8284a;
@red-dim: rgba(232, 40, 74, 0.15);
@surface: #140a0c;
@border: rgba(255, 255, 255, 0.07);
@text: #ffffff;
@muted: rgba(255, 255, 255, 0.45);
@mono: 'alibaba-puhuiti', monospace;

.font-squish(@origin: center) {
  font-family: 'STSong', serif;
  display: inline-block;
  transform: scaleX(0.9);
  transform-origin: @origin;
}

@keyframes tacticalIn {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.image64-tool {
  color: @text;
  font-family: 'cn-custom', system-ui, sans-serif;
}

.upload-stage,
.image64-result {
  animation: tacticalIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.upload-stage {
  animation-delay: 0.1s;
}

.image64-result {
  animation-delay: 0.15s;
}

.pt-grid {
  display: grid;
  grid-template-columns: 5fr 2fr;
  gap: 30px 0;
  align-items: stretch;
}

.pt-panel,
.right-panel {
  position: relative;
  min-height: 600px;
  display: flex;
  flex-direction: column;
}

.pt-panel {
  background: linear-gradient(150deg, #25252587 0%, rgba(68, 5, 18, 0.35) 100%);
  backdrop-filter: blur(4px);
  padding: 30px;
  overflow: hidden;
}

.right-panel {
  background: @surface;
  border: 1px solid @border;
  padding: 30px;
}

.corner,
.corner-img {
  position: absolute;
  width: 12px;
  height: 12px;
  pointer-events: none;
  z-index: 5;

  &--tl {
    top: -1px;
    left: -1px;
    border-top: 2px solid @red;
    border-left: 2px solid @red;
  }

  &--tr {
    top: -1px;
    right: -1px;
    border-top: 2px solid @red;
    border-right: 2px solid @red;
  }

  &--bl {
    bottom: -1px;
    left: -1px;
    border-bottom: 2px solid @red;
    border-left: 2px solid @red;
  }

  &--br {
    bottom: -1px;
    right: -1px;
    border-bottom: 2px solid @red;
    border-right: 2px solid @red;
  }

  &.corner-img {
    &.corner--tl {
      top: 10px;
      left: 10px;
      border-color: #50505076;
    }

    &.corner--tr {
      top: 10px;
      right: 10px;
      border-color: #50505076;
    }

    &.corner--bl {
      bottom: 10px;
      left: 10px;
      border-color: #50505076;
    }

    &.corner--br {
      bottom: 10px;
      right: 10px;
      border-color: #50505076;
    }
  }
}

.upload-stage {
  padding: 0;
  justify-content: center;
  align-items: center;
  background: linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    radial-gradient(circle at 50% 36%, rgba(232, 40, 74, 0.18), transparent 42%),
    #090406;
  background-size: 36px 36px, 36px 36px, auto, auto;
}

.upload-input {
  display: none;
}

.upload-label {
  position: absolute;
  inset: 16px;
  border: 1px dashed @muted;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10;

  &:hover {
    border-color: @red;
    background: rgba(232, 40, 74, 0.02);

    .upload-icon {
      color: @red;
    }
  }

  &.has-image {
    border-style: solid;
    border-color: transparent;
  }
}

.upload-icon {
  font-size: 40px;
  color: @muted;
  margin-bottom: 16px;
  transition: color 0.3s;
}

.upload-text span,
.upload-hint span {
  .font-squish(center);
}

.upload-text span {
  font-size: 14px;
  font-weight: 700;
}

.upload-hint span {
  color: @muted;
  font-size: 12px;
  margin-top: 8px;
}

.preview-img {
  position: absolute;
  inset: 0;
  width: calc(100% - 36px);
  height: calc(100% - 36px);
  object-fit: contain;
  padding: 18px;
  z-index: 1;
}

.preview-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 2;

  span {
    .font-squish(center);
    color: @red;
    font-size: 14px;
  }
}

.upload-label:hover .preview-overlay {
  opacity: 1;
}

.pt-scanlines {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.01) 1px,
    transparent 1px
  );
  background-size: 100% 4px;
  pointer-events: none;
}

.pt-panel-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: @muted;
  margin-bottom: 18px;

  span {
    .font-squish(left);
    font-size: 14px;
  }
}

.file-meta {
  display: grid;
  gap: 10px;
  margin-bottom: 18px;

  div {
    border: 1px solid @border;
    background: rgba(9, 4, 6, 0.64);
    padding: 10px;
  }

  span,
  strong {
    .font-squish(left);
    display: block;
    font-size: 12px;
  }

  span {
    color: @muted;
    margin-bottom: 5px;
  }

  strong {
    color: @text;
    word-break: break-word;
  }
}

.pt-code-wrap {
  flex: 1;
  min-height: 360px;
  border: 1px solid @border;
  background: #090406;
}

.pt-code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid @border;
  color: @muted;

  > span {
    .font-squish(left);
    font-size: 12px;
  }
}

.pt-btn {
  background: transparent;
  border: 1px solid @border;
  color: @text;
  cursor: pointer;
  padding: 8px 12px;
  transition: all 0.2s ease;

  span {
    .font-squish(center);
    font-size: 12px;
  }

  &:hover:not(:disabled) {
    border-color: @red;
    color: @red;
    background: @red-dim;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
}

.pt-code-block {
  height: 280px;
  margin: 0;
  padding: 16px;
  color: #e23456;
  font-family: @mono;
  font-size: 12px;
  line-height: 1.6;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

@media (max-width: 900px) {
  .pt-grid {
    grid-template-columns: 1fr;
  }

  .pt-panel,
  .right-panel {
    min-height: 480px;
  }

  .pt-header__sub {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }
}

@media (max-width: 600px) {
  .pt-header__title {
    font-size: 32px;
  }
}
</style>
