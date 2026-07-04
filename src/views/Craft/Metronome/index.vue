<template>
  <ToolPageLayout
    page-class="metronome-tool"
    tool-id="metronome"
    title="节拍器"
    description="设置速度和每小节拍数，点击开始后跟着红色指针和提示音练习。不确定速度时连续点击 TAP，系统会按你的敲击间隔估算 BPM。"
    share-description="设置速度和每小节拍数，跟随红色指针和提示音练习。"
    :recommended-tools="recommendedTools"
  >
    <div class="pt-grid">
      <div class="pt-panel metro-stage">
        <div class="tempo-readout">
          <span class="tempo-label">BPM</span>
          <strong>{{ bpm }}</strong>
          <span class="tempo-name">{{ tempoName }}</span>
        </div>

        <div class="pendulum-wrap">
          <div class="meter-arc" />
          <div
            class="pendulum"
            :class="{ active: isPlaying }"
            :style="pendulumStyle"
          >
            <span />
          </div>
          <div class="pendulum-base" />
        </div>

        <div class="beat-row">
          <span
            v-for="beat in beatsPerBar"
            :key="beat"
            class="beat-dot"
            :class="{
              active: isPlaying && currentBeat === beat - 1,
              accent: beat === 1 && accentFirstBeat,
            }"
          />
        </div>

        <div class="corner-img corner--tl" />
        <div class="corner-img corner--tr" />
        <div class="corner-img corner--bl" />
        <div class="corner-img corner--br" />
      </div>

      <div class="right-panel metro-controls">
        <div class="pt-panel-title">
          <span>[ 设定 ]</span>
          <span>{{ beatsPerBar }}/4</span>
        </div>

        <div class="transport-row">
          <button class="transport-btn" @click="togglePlay">
            <span>{{ isPlaying ? '停止' : '开始' }}</span>
          </button>
          <button class="pt-btn tap-btn" @click="tapTempo">
            <span>TAP</span>
          </button>
        </div>

        <label class="control-item control-item--wide">
          <span>TEMPO</span>
          <input v-model.number="bpm" type="range" min="40" max="220" />
          <strong>{{ bpm }} BPM</strong>

          <div class="stepper-row">
            <button class="pt-btn" @click="adjustBpm(-5)">
              <span>-5</span>
            </button>
            <button class="pt-btn" @click="adjustBpm(-1)">
              <span>-1</span>
            </button>
            <button class="pt-btn" @click="adjustBpm(1)">
              <span>+1</span>
            </button>
            <button class="pt-btn" @click="adjustBpm(5)">
              <span>+5</span>
            </button>
          </div>

          <div class="preset-grid">
            <button
              v-for="preset in tempoPresets"
              :key="preset"
              class="preset-btn"
              :class="{ active: bpm === preset }"
              @click="setBpm(preset)"
            >
              <span>{{ preset }}</span>
            </button>
          </div>
        </label>

        <div class="control-section-title">拍号选择</div>
        <div class="meter-grid">
          <button
            v-for="meter in meterOptions"
            :key="meter"
            class="preset-btn"
            :class="{ active: beatsPerBar === meter }"
            @click="beatsPerBar = meter"
          >
            <span>{{ meter }}/4</span>
          </button>
        </div>

        <div class="control-section-title">节拍音色</div>
        <div class="sound-grid">
          <button
            v-for="sound in soundOptions"
            :key="sound.id"
            class="preset-btn"
            :class="{ active: selectedSound === sound.id }"
            @click="selectedSound = sound.id"
          >
            <span>{{ sound.label }}</span>
          </button>
        </div>

        <label class="toggle-row">
          <input v-model="accentFirstBeat" type="checkbox" />
          <span>第一拍重音</span>
        </label>

        <div class="corner corner--tl" />
        <div class="corner corner--tr" />
        <div class="corner corner--bl" />
        <div class="corner corner--br" />
      </div>
    </div>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import ToolPageLayout from '@/components/ToolPageLayout/index.vue'

const recommendedTools = [{ label: '配色提取器', path: '/colorPalette' }]

const bpm = ref(80)
const beatsPerBar = ref(4)
const currentBeat = ref(0)
const isPlaying = ref(false)
const accentFirstBeat = ref(true)
const selectedSound = ref<'wood' | 'bell' | 'digital'>('wood')
const tapTimes = ref<number[]>([])
const audioContext = ref<AudioContext | null>(null)
const timerId = ref<number | null>(null)

const tempoPresets = [60, 72, 80, 96, 108, 120]
const meterOptions = [2, 3, 4, 6]
const soundOptions = [
  { id: 'wood', label: 'GB' },
  { id: 'bell', label: '铃声' },
  { id: 'digital', label: '电子' },
] as const

const intervalMs = computed(() => 60000 / bpm.value)
const pendulumStyle = computed(() => ({
  animationDuration: `${intervalMs.value * 2}ms`,
}))

const tempoName = computed(() => {
  if (bpm.value < 60) return 'LARGO'
  if (bpm.value < 76) return 'ADAGIO'
  if (bpm.value < 108) return 'ANDANTE'
  if (bpm.value < 120) return 'MODERATO'
  if (bpm.value < 168) return 'ALLEGRO'
  return 'PRESTO'
})

const clampBpm = (value: number) => Math.min(220, Math.max(40, value))

const ensureAudioContext = async () => {
  if (!audioContext.value) {
    audioContext.value = new AudioContext()
  }

  if (audioContext.value.state === 'suspended') {
    await audioContext.value.resume()
  }
}

const playClick = async (accent = false) => {
  await ensureAudioContext()
  const context = audioContext.value
  if (!context) return

  const oscillator = context.createOscillator()
  const gain = context.createGain()
  const now = context.currentTime
  const soundMap = {
    wood: { type: 'square', base: 760, accent: 1120 },
    bell: { type: 'sine', base: 1040, accent: 1560 },
    digital: { type: 'triangle', base: 920, accent: 1380 },
  } as const
  const sound = soundMap[selectedSound.value]

  oscillator.type = sound.type
  oscillator.frequency.value = accent ? sound.accent : sound.base
  gain.gain.setValueAtTime(accent ? 0.22 : 0.14, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055)

  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(now)
  oscillator.stop(now + 0.06)
}

const tick = () => {
  const beat = currentBeat.value
  playClick(beat === 0 && accentFirstBeat.value)
  currentBeat.value = (beat + 1) % beatsPerBar.value
}

const stopTimer = () => {
  if (timerId.value !== null) {
    window.clearInterval(timerId.value)
    timerId.value = null
  }
}

const startTimer = async () => {
  stopTimer()
  await ensureAudioContext()
  currentBeat.value = 0
  tick()
  timerId.value = window.setInterval(tick, intervalMs.value)
}

const togglePlay = async () => {
  isPlaying.value = !isPlaying.value
  if (isPlaying.value) {
    await startTimer()
  } else {
    stopTimer()
    currentBeat.value = 0
  }
}

const setBpm = (value: number) => {
  bpm.value = clampBpm(value)
}

const adjustBpm = (delta: number) => {
  setBpm(bpm.value + delta)
}

const tapTempo = () => {
  const now = Date.now()
  tapTimes.value = [...tapTimes.value.filter((time) => now - time < 2000), now]

  if (tapTimes.value.length < 2) return

  const intervals = tapTimes.value.slice(1).map((time, index) => {
    return time - tapTimes.value[index]
  })
  const average =
    intervals.reduce((total, interval) => total + interval, 0) /
    intervals.length
  setBpm(Math.round(60000 / average))
}

watch([bpm, beatsPerBar], () => {
  if (currentBeat.value >= beatsPerBar.value) {
    currentBeat.value = 0
  }

  if (isPlaying.value) {
    startTimer()
  }
})

onBeforeUnmount(() => {
  stopTimer()
})
</script>

<style lang="less" scoped>
@red: #e8284a;
@red-dim: rgba(232, 40, 74, 0.15);
@surface: #140a0c;
@border: rgba(255, 255, 255, 0.07);
@text: #ffffff;
@muted: rgba(255, 255, 255, 0.45);

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

.metronome-tool {
  color: @text;
  font-family: 'cn-custom', system-ui, sans-serif;
}

.metro-stage,
.metro-controls {
  animation: tacticalIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.metro-stage {
  animation-delay: 0.1s;
}

.metro-controls {
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

.metro-stage {
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    radial-gradient(circle at 50% 36%, rgba(232, 40, 74, 0.18), transparent 42%),
    #090406;
  background-size: 36px 36px, 36px 36px, auto, auto;
}

.tempo-readout {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: end;
  gap: 18px;
  border-bottom: 1px solid @border;
  padding-bottom: 18px;

  span {
    .font-squish(left);
    color: @muted;
    font-size: 14px;
  }

  strong {
    font-family: 'Anton', sans-serif;
    font-size: 160px;
    line-height: 0.8;
    color: @text;
  }
}

.tempo-name {
  text-align: right;
}

.pendulum-wrap {
  position: relative;
  width: min(480px, 80%);
  aspect-ratio: 1 / 0.78;
  display: flex;
  justify-content: center;
  align-items: flex-end;
}

.meter-arc {
  position: absolute;
  inset: 0 0 18%;
  border-top: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 50% 50% 0 0;
}

.pendulum {
  position: absolute;
  bottom: 20px;
  width: 4px;
  height: 86%;
  background: linear-gradient(@red, rgba(255, 255, 255, 0.6));
  transform-origin: bottom center;
  transform: rotate(-28deg);

  &.active {
    animation: swing linear infinite alternate;
  }

  span {
    position: absolute;
    top: 22%;
    left: 50%;
    width: 34px;
    height: 34px;
    transform: translateX(-50%);
    background: @red;
    box-shadow: 0 0 28px rgba(232, 40, 74, 0.72);
  }
}

@keyframes swing {
  from {
    transform: rotate(-28deg);
  }
  to {
    transform: rotate(28deg);
  }
}

.pendulum-base {
  width: 92px;
  height: 18px;
  background: @red;
  box-shadow: 0 0 22px rgba(232, 40, 74, 0.45);
}

.beat-row {
  width: 100%;
  display: flex;
  justify-content: center;
  gap: 14px;
  border-top: 1px solid @border;
  padding-top: 22px;
}

.beat-dot {
  width: 14px;
  height: 14px;
  border: 1px solid @border;
  background: rgba(255, 255, 255, 0.08);
  transition: all 0.08s linear;

  &.accent {
    border-color: rgba(232, 40, 74, 0.55);
  }

  &.active {
    background: @red;
    border-color: @red;
    transform: scale(1.45);
    box-shadow: 0 0 18px rgba(232, 40, 74, 0.7);
  }
}

.pt-panel-title,
.control-item,
.toggle-row {
  color: @muted;

  span,
  strong {
    .font-squish(left);
    font-size: 14px;
  }
}
.pt-panel-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
  margin-bottom: 24px;
}

.transport-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  margin-bottom: 18px;
}

.transport-btn,
.pt-btn,
.preset-btn {
  background: transparent;
  border: 1px solid @border;
  color: @text;
  cursor: pointer;
  transition: all 0.2s ease;

  display: flex;
  align-items: center;
  justify-content: center;

  span {
    .font-squish(center);
  }

  &:hover,
  &.active {
    border-color: @red;
    color: @red;
    background: @red-dim;
  }
}

.transport-btn {
  padding: 12px;
  background: @red;
  border-color: @red;
  color: @text;

  span {
    font-size: 18px;
    font-weight: 700;
  }
}
.tap-btn {
  padding: 12px;
}

.pt-btn {
  padding: 6px 12px;

  span {
    font-size: 14px;
  }
}

.control-item {
  border: 1px solid @border;
  background: rgba(9, 4, 6, 0.74);
  padding: 14px;
  display: grid;
  gap: 10px;
  margin-bottom: 14px;

  strong {
    color: @text;
  }
}

input[type='range'] {
  width: 100%;
  accent-color: @red;
}

.stepper-row,
.preset-grid,
.meter-grid,
.sound-grid {
  display: grid;
  gap: 6px;
  margin-bottom: 8px;
}

.stepper-row {
  margin-bottom: 5px;
  grid-template-columns: repeat(4, 1fr);
}

.preset-grid {
  margin-bottom: 0;
  grid-template-columns: repeat(3, 1fr);
}

.meter-grid {
  grid-template-columns: repeat(4, 1fr);
}

.sound-grid {
  grid-template-columns: repeat(3, 1fr);
}

.control-section-title {
  .font-squish(left);
  display: flex;
  align-items: center;
  gap: 8px;
  color: @red;
  font-size: 14px;
  letter-spacing: 0.14em;
  margin: 18px 0 10px;

  &::before {
    content: '';
    width: 14px;
    height: 2px;
    background: @red;
  }
}

.preset-btn {
  padding: 10px;
  text-align: center;

  span {
    font-size: 14px;
  }
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid @border;
  padding: 12px;
  margin-bottom: 14px;
  cursor: pointer;

  input {
    accent-color: @red;
  }
}

@media (max-width: 900px) {
  .pt-grid {
    grid-template-columns: 1fr;
  }

  .pt-panel,
  .right-panel {
    min-height: 480px;
  }
}

@media (max-width: 600px) {
  .tempo-readout {
    grid-template-columns: 1fr;
    gap: 8px;
    text-align: center;

    strong {
      font-size: 112px;
    }
  }

  .tempo-name {
    text-align: center;
  }

  .pendulum-wrap {
    width: 100%;
  }

  .stepper-row,
  .preset-grid,
  .meter-grid,
  .sound-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
