<template>
  <div class="codec-tool main-container">
    <div class="pt-header">
      <div class="pt-header__tag" @click="handleTagClick">CRAFT</div>
      <h1 class="pt-header__title">Base64加解密</h1>
      <p class="pt-header__sub">
        输入文本后选择编码或解码，支持中文和常见 Unicode 内容。
        <span class="pt-header__motto">// HUAHUA_THE_CAT</span>
      </p>
    </div>

    <div class="pt-grid">
      <div class="pt-panel codec-stage">
        <div class="pt-panel-title">
          <span>[ 输入 ]</span>
          <span>{{ inputText.length }} CHARS</span>
        </div>

        <textarea
          v-model="inputText"
          class="codec-textarea"
          spellcheck="false"
          placeholder="在这里输入原文或 Base64..."
        />

        <div class="action-row">
          <button class="transport-btn" @click="encodeInput">
            <span>编码</span>
          </button>
          <button
            class="transport-btn transport-btn--dark"
            @click="decodeInput"
          >
            <span>解码</span>
          </button>
          <button class="pt-btn" @click="swapText">
            <span>交换</span>
          </button>
          <button class="pt-btn" @click="clearText">
            <span>清空</span>
          </button>
        </div>

        <div v-if="errorText" class="error-box">
          <span>{{ errorText }}</span>
        </div>

        <div class="corner-img corner--tl" />
        <div class="corner-img corner--tr" />
        <div class="corner-img corner--bl" />
        <div class="corner-img corner--br" />
      </div>

      <div class="right-panel codec-result">
        <div class="pt-panel-title">
          <span>[ 输出结果 ]</span>
          <span>{{ outputText.length }} CHARS</span>
        </div>

        <div class="pt-code-wrap">
          <div class="pt-code-header">
            <span>{{ modeLabel }}</span>
            <button class="pt-btn" :disabled="!outputText" @click="copyOutput">
              <span>{{ copied ? '已复制 !' : '点击复制' }}</span>
            </button>
          </div>
          <pre
            class="pt-code-block"
          ><code>{{ outputText || '// NO DATA' }}</code></pre>
        </div>

        <div class="codec-meta">
          <div>
            <span>输入字节</span>
            <strong>{{ inputBytes }}</strong>
          </div>
          <div>
            <span>输出字节</span>
            <strong>{{ outputBytes }}</strong>
          </div>
        </div>

        <div class="corner corner--tl" />
        <div class="corner corner--tr" />
        <div class="corner corner--bl" />
        <div class="corner corner--br" />
        <div class="crystal-container">
          <CrystalLogo />
        </div>
      </div>
    </div>

    <div class="footer-wrap">
      <PageFooter :third-party="true" :recommended-tools="recommendedTools" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

import CrystalLogo from '@/components/CrystalLogo/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'

const router = useRouter()
const inputText = ref('')
const outputText = ref('')
const copied = ref(false)
const errorText = ref('')
const mode = ref<'encode' | 'decode'>('encode')

const recommendedTools = [
  { label: 'HTML常用转义字符', path: '/htmlEntities' },
  { label: 'Base64加解密', path: '/base64Codec' },
  { label: '图片转Base64', path: '/imageBase64' },
]

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

const modeLabel = computed(() =>
  mode.value === 'encode' ? 'BASE64_ENCODE' : 'BASE64_DECODE'
)
const inputBytes = computed(() => textEncoder.encode(inputText.value).length)
const outputBytes = computed(() => textEncoder.encode(outputText.value).length)

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = ''
  const chunkSize = 0x8000

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }

  return window.btoa(binary)
}

const base64ToBytes = (value: string) => {
  const normalized = value.replace(/\s/g, '')
  const binary = window.atob(normalized)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes
}

const encodeInput = () => {
  mode.value = 'encode'
  errorText.value = ''
  outputText.value = bytesToBase64(textEncoder.encode(inputText.value))
}

const decodeInput = () => {
  mode.value = 'decode'
  errorText.value = ''

  try {
    outputText.value = textDecoder.decode(base64ToBytes(inputText.value))
  } catch (err) {
    outputText.value = ''
    errorText.value = 'Base64 内容格式不正确，请检查后再解码。'
  }
}

const swapText = () => {
  inputText.value = outputText.value
  outputText.value = ''
  errorText.value = ''
}

const clearText = () => {
  inputText.value = ''
  outputText.value = ''
  errorText.value = ''
}

const copyOutput = async () => {
  if (!outputText.value) return

  try {
    await navigator.clipboard.writeText(outputText.value)
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

const handleTagClick = () => {
  router.push('/craft')
}
</script>

<style lang="less" scoped>
@red: #e8284a;
@red-dim: rgba(232, 40, 74, 0.15);
@surface: #140a0c;
@border: rgba(255, 255, 255, 0.07);
@text: #ffffff;
@muted: rgba(255, 255, 255, 0.45);
@mono: 'source-han-sans-simplified-c', monospace;

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

.codec-tool {
  color: @text;
  font-family: 'Unbounded Sans', system-ui, sans-serif;
}

.pt-header,
.codec-stage,
.codec-result,
.footer-wrap {
  animation: tacticalIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.codec-stage {
  animation-delay: 0.1s;
}

.codec-result {
  animation-delay: 0.15s;
}

.footer-wrap {
  animation-delay: 0.25s;
}

.pt-header {
  margin-bottom: 20px;
  border-bottom: 1px solid @border;
  padding-bottom: 20px;

  &__tag {
    .font-squish(left);
    font-size: 14px;
    color: #3276fe;
    letter-spacing: 0.1em;
    margin-bottom: 12px;
    cursor: pointer;
    position: relative;
    transition: color 0.2s ease, margin 0.2s ease;
    user-select: none;

    &::before {
      content: '// ';
    }

    &:hover {
      color: @red;
      margin-left: -4px;

      &::before {
        content: '<< ';
        color: @red;
      }
    }
  }

  &__title {
    font-size: 42px;
    font-family: 'Unbounded Sans';
    letter-spacing: 0.05em;
    margin: 0 0 12px;
  }

  &__sub {
    font-size: 16px;
    color: @muted;
    margin: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 18px;
  }

  &__motto {
    font-family: @mono;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.15);
    white-space: nowrap;
  }
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

.codec-stage {
  background: linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    radial-gradient(circle at 50% 32%, rgba(232, 40, 74, 0.18), transparent 40%),
    #090406;
  background-size: 36px 36px, 36px 36px, auto, auto;
}

.pt-panel-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: @muted;
  margin-bottom: 24px;

  span {
    .font-squish(left);
    font-size: 14px;
  }
}

.codec-textarea {
  flex: 1;
  min-height: 360px;
  resize: vertical;
  border: 1px solid @border;
  background: rgba(9, 4, 6, 0.82);
  color: @text;
  font-family: 'STSong', serif;
  font-size: 15px;
  line-height: 1.7;
  outline: none;
  padding: 18px;

  &:focus {
    border-color: @red;
  }
}

.action-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto auto;
  gap: 10px;
  margin-top: 18px;
}

.transport-btn,
.pt-btn {
  border: 1px solid @border;
  color: @text;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  span {
    .font-squish(center);
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

.transport-btn {
  padding: 12px;
  background: @red;
  border-color: @red;

  span {
    font-size: 18px;
    font-weight: 700;
  }

  &--dark {
    background: transparent;
  }
}

.pt-btn {
  background: transparent;
  padding: 8px 12px;

  span {
    font-size: 13px;
  }
}

.pt-code-wrap {
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

.pt-code-block {
  height: 400px;
  margin: 0;
  padding: 16px;
  color: #e23456;
  font-family: 'STSong', serif;
  font-size: 13px;
  line-height: 1.6;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  * {
    font-family: 'STSong', serif;
  }
}

.codec-meta {
  display: grid;
  grid-template-columns: 4fr 4fr 1fr;
  gap: 10px;
  margin-top: 18px;

  div {
    border: 1px solid @border;
    background: rgba(9, 4, 6, 0.64);
    padding: 12px;
  }

  span,
  strong {
    .font-squish(left);
    display: block;
    font-size: 13px;
  }

  span {
    color: @muted;
    margin-bottom: 6px;
  }
}

.error-box {
  border: 1px solid rgba(232, 40, 74, 0.5);
  background: @red-dim;
  color: @red;
  margin-top: 12px;
  padding: 12px;

  span {
    .font-squish(left);
    font-size: 13px;
  }
}

.crystal-container {
  position: absolute;
  bottom: 35px;
  right: 32px;
  z-index: 1;
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

  .action-row {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
