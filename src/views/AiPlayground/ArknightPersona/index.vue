<template>
  <ToolPageLayout
    page-class="arknight-page no-rem"
    back-label="HOME"
    back-path="/"
    title="GPT-6-Astra前端UI复刻"
    :show-recommendations="false"
  >
    <div class="replica-content no-rem">
      <section
        class="replica-frame no-rem"
        aria-label="明日方舟与女神异闻录3 Reload 交互界面"
      >
        <div ref="viewport" class="scene-viewport" data-lenis-prevent>
          <div
            class="scene-canvas"
            :style="{ width: `${1600 * scale}px`, height: `${912 * scale}px` }"
          >
            <div
              :key="entranceKey"
              ref="scene"
              class="ark-scene"
              :class="{
                'motion-disabled': !motionEnabled,
                'scene-ready': assetsReady,
              }"
              :style="{ transform: `scale(${scale})` }"
              @pointermove="moveCharacter"
              @pointerleave="resetCharacter"
            >
              <img
                class="classroom"
                :src="classroom"
                alt="洒满蓝色日光的教室"
                @load="backgroundReady = true"
              />
              <div class="scene-tint" />
              <div class="character-entrance">
                <img
                  ref="character"
                  class="protagonist"
                  :src="protagonist"
                  alt="蓝发少年结城理，身穿黑色校服，佩戴耳机"
                  draggable="false"
                  @load="characterReady = true"
                />
              </div>
              <div class="petals" aria-hidden="true">
                <i
                  v-for="petal in petals"
                  :key="petal.id"
                  :style="petal.style"
                />
              </div>

              <nav
                class="utility-bar entrance"
                style="--delay: 160ms"
                aria-label="系统菜单"
              >
                <button
                  v-for="item in utilities"
                  :key="item.id"
                  type="button"
                  :aria-label="item.label"
                  @click="openPanel(item.id)"
                >
                  <UiIcon :name="item.icon" />
                </button>
              </nav>
              <button
                class="check-in entrance"
                style="--delay: 220ms"
                type="button"
                @click="openPanel('calendar')"
              >
                <UiIcon name="calendar" /><span>此夜同行<br />签到活动</span
                ><i>⌄</i>
              </button>

              <button
                class="profile entrance"
                style="--delay: 320ms"
                type="button"
                aria-label="查看博士档案"
                @click="openPanel('profile')"
              >
                <span class="clock-face" aria-hidden="true"
                  ><i>XII</i><i>III</i><i>VI</i><i>IX</i><b>✦</b></span
                >
                <span class="level">120</span
                ><span class="level-label">LV</span> <strong>羊角</strong
                ><small>ID: 744586145</small>
              </button>

              <div class="resources entrance" style="--delay: 240ms">
                <div class="system-time">
                  <UiIcon name="battery" /><time>{{ clock }}</time>
                </div>
                <button
                  type="button"
                  class="resource resource-lmd"
                  aria-label="龙门币"
                  @click="openPanel('lmd')"
                >
                  <span class="resource-icon">▧</span><span>{{ lmd }}</span>
                </button>
                <button
                  type="button"
                  class="resource resource-orundum"
                  aria-label="合成玉"
                  @click="openPanel('orundum')"
                >
                  <span class="resource-icon">◈</span><span>{{ orundum }}</span
                  ><b>+</b>
                </button>
                <button
                  type="button"
                  class="resource resource-prime"
                  aria-label="至纯源石"
                  @click="openPanel('prime')"
                >
                  <span class="resource-icon">⬡</span><span>1267</span><b>+</b>
                </button>
              </div>

              <nav class="game-menu" aria-label="游戏主菜单">
                <div class="terminal-wrap entrance" style="--delay: 360ms">
                  <button
                    class="sanity-plus"
                    type="button"
                    aria-label="恢复理智"
                    @click="openPanel('sanity')"
                  >
                    +
                  </button>
                  <button
                    class="terminal menu-button"
                    type="button"
                    aria-label="终端"
                    @click="openPanel('terminal')"
                  >
                    <span class="terminal-orbit" aria-hidden="true">◉</span>
                    <span class="terminal-word" aria-hidden="true"
                      >TERMINAL</span
                    >
                    <strong class="sanity-value">{{ sanity }}</strong>
                    <span class="terminal-meta"
                      ><b>SANITY <em>/210</em></b
                      ><span
                        >当前
                        <strong
                          >{{ selectedStage.code }}
                          {{ selectedStage.title }}</strong
                        ></span
                      ></span
                    >
                  </button>
                </div>
                <div class="event-banners entrance" style="--delay: 410ms">
                  <button
                    class="event-banner event-banner--water"
                    type="button"
                    aria-label="月行水上活动"
                    @click="openPanel('event')"
                  >
                    <span class="sr-only">月行水上</span>
                  </button>
                  <button
                    class="event-banner event-banner--exhibition"
                    type="button"
                    aria-label="奇象巡展活动"
                    @click="openPanel('exhibition')"
                  >
                    <span class="sr-only">奇象巡展</span>
                  </button>
                </div>
                <div
                  v-for="item in mainMenus"
                  :key="item.id"
                  class="menu-position entrance"
                  :class="`position-${item.id}`"
                  :style="{ '--delay': item.delay }"
                >
                  <button
                    class="menu-button letter-menu"
                    :class="`menu-${item.id}`"
                    type="button"
                    :aria-label="item.label"
                    @click="openPanel(item.id)"
                  >
                    <span
                      v-if="item.id === 'store'"
                      class="vinyl"
                      aria-hidden="true"
                      ><i
                    /></span>
                    <span class="menu-word" :data-text="item.en">{{
                      item.en
                    }}</span>
                    <span class="menu-label"><i>/</i>{{ item.label }}</span>
                  </button>
                </div>
                <div class="recruitment entrance" style="--delay: 650ms">
                  <button
                    type="button"
                    aria-label="公开招募"
                    @click="openPanel('recruit')"
                  >
                    <strong>RECRUIT</strong><span>公开招募</span>
                  </button>
                  <button
                    type="button"
                    aria-label="干员寻访"
                    @click="openPanel('headhunt')"
                  >
                    <strong>HEADHUNT</strong><span>干员寻访</span>
                  </button>
                </div>
                <div class="base-notices entrance" style="--delay: 770ms">
                  <button
                    type="button"
                    aria-label="基建通知"
                    @click="openPanel('base')"
                  >
                    <UiIcon name="chat" />{{ baseCollected ? 0 : 6 }}
                  </button>
                  <button
                    type="button"
                    aria-label="活动剩余时间"
                    @click="openPanel('event')"
                  >
                    <UiIcon name="clock" />8天
                  </button>
                </div>
                <div class="depot-position entrance" style="--delay: 800ms">
                  <button
                    class="depot menu-button"
                    type="button"
                    aria-label="仓库"
                    @click="openPanel('depot')"
                  >
                    <UiIcon name="boxes" /><span>仓库</span>
                  </button>
                </div>
              </nav>

              <button
                class="pack-banner entrance"
                style="--delay: 600ms"
                type="button"
                aria-label="限时礼包"
                @click="openPanel('pack')"
              >
                <span class="sr-only">BREAKING NEWS 礼包限时上架 ¥168</span>
              </button>
              <nav
                class="social-menu entrance"
                style="--delay: 660ms"
                aria-label="社交和档案"
              >
                <button
                  type="button"
                  class="friends"
                  @click="openPanel('friends')"
                >
                  <b>FRIENDS</b><span>好友</span>
                </button>
                <button
                  type="button"
                  class="archives"
                  @click="openPanel('archives')"
                >
                  <b>ARCHIVES</b><span>档案</span>
                </button>
              </nav>
              <span class="online-count"
                ><UiIcon name="users" />70 人正在看</span
              >
              <div v-if="!assetsReady" class="scene-loading" role="status">
                LOADING <span>正在载入教室…</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <p class="replica-credit no-rem">
        使用GPT-6 Astra 高进行的《明日方舟》UI复刻
      </p>
    </div>

    <ModalWrapper
      v-model="panelVisible"
      width="760px"
      :tactical-text="`[${activePanel.toUpperCase()}]`"
      close-title="关闭窗口 (ESC)"
    >
      <section class="game-panel no-rem" :aria-label="panel.title">
        <div class="panel-eyebrow">
          RHODES ISLAND <span>INTERACTIVE DEMO</span>
        </div>
        <h2>
          {{ panel.en }}<span>{{ panel.title }}</span>
        </h2>
        <p class="panel-description">{{ panel.description }}</p>

        <template v-if="activePanel === 'terminal'">
          <div class="panel-options">
            <button
              v-for="stage in stages"
              :key="stage.code"
              type="button"
              :class="{ selected: selectedStage.code === stage.code }"
              @click="selectedStage = stage"
            >
              <b>{{ stage.code }}</b
              ><span>{{ stage.title }}</span
              ><small>理智 −{{ stage.cost }}</small>
            </button>
          </div>
          <button
            class="panel-action"
            type="button"
            :disabled="sanity < selectedStage.cost"
            @click="startOperation"
          >
            开始行动 · {{ selectedStage.code }} <span>→</span>
          </button>
        </template>
        <template
          v-else-if="activePanel === 'squads' || activePanel === 'operator'"
        >
          <div class="panel-tabs">
            <button
              v-for="n in 3"
              :key="n"
              type="button"
              :class="{ selected: squad === n }"
              @click="squad = n"
            >
              编队 0{{ n }}
            </button>
          </div>
          <div class="operator-grid">
            <button
              v-for="operator in operators"
              :key="operator.name"
              type="button"
              :class="{
                selected: selectedOperators[squad - 1].includes(operator.name),
              }"
              :aria-pressed="
                selectedOperators[squad - 1].includes(operator.name)
              "
              @click="toggleOperator(operator.name)"
            >
              <span class="operator-mark">{{ operator.mark }}</span
              ><small>★★★★★★</small><b>{{ operator.name }}</b
              ><span>{{ operator.role }} · LV 90</span
              ><em>{{
                selectedOperators[squad - 1].includes(operator.name)
                  ? '已编入'
                  : '加入编队'
              }}</em>
            </button>
          </div>
          <p class="panel-note">
            编队 0{{ squad }} · 已选择
            {{ selectedOperators[squad - 1].length }} 位干员
          </p>
        </template>
        <template v-else-if="activePanel === 'store' || activePanel === 'pack'">
          <div class="panel-options">
            <button
              v-for="product in products"
              :key="product.name"
              type="button"
              @click="buyProduct(product)"
            >
              <b>{{ product.icon }}</b
              ><span>{{ product.name }}</span
              ><small
                >{{ product.price.toLocaleString() }} 龙门币 · 点击兑换</small
              >
            </button>
          </div>
          <p class="panel-note">
            当前龙门币 {{ lmd.toLocaleString() }} · 演示兑换，不产生真实交易。
          </p>
        </template>
        <template v-else-if="activePanel === 'recruit'">
          <div class="panel-tabs">
            <button
              v-for="tag in recruitTags"
              :key="tag"
              type="button"
              :class="{ selected: selectedTags.includes(tag) }"
              :aria-pressed="selectedTags.includes(tag)"
              @click="toggleTag(tag)"
            >
              {{ tag }}
            </button>
          </div>
          <label class="recruit-duration"
            >招募时限
            <input v-model="recruitHours" type="range" min="1" max="9" /><b
              >{{ recruitHours }}:00:00</b
            ></label
          >
          <button
            class="panel-action"
            type="button"
            :disabled="recruitStarted"
            @click="startRecruit"
          >
            {{ recruitStarted ? '招募进行中' : '开始公开招募' }} <span>→</span>
          </button>
        </template>
        <template v-else-if="activePanel === 'headhunt'">
          <div class="headhunt-card">
            <span>{{ recruited ? '★★★★★' : '◈' }}</span
            ><b>{{ recruited ? '阿米娅' : '与特别课外活动部一同出发' }}</b
            ><small>{{
              recruited
                ? '术师干员 · 已加入仓库记录'
                : '演示寻访 · 单次消耗 600 合成玉'
            }}</small>
          </div>
          <button
            class="panel-action"
            type="button"
            :disabled="orundum < 600"
            @click="headhunt"
          >
            寻访一次 · 600 <span>→</span>
          </button>
        </template>
        <template v-else-if="activePanel === 'mission'">
          <div class="mission-list">
            <div v-for="mission in missions" :key="mission.name">
              <span
                ><b>{{ mission.name }}</b
                ><small>{{ mission.reward }} 龙门币</small></span
              ><button
                type="button"
                :disabled="mission.claimed"
                @click="claimMission(mission)"
              >
                {{ mission.claimed ? '已领取' : '领取奖励' }}
              </button>
            </div>
          </div>
        </template>
        <template v-else-if="activePanel === 'base'">
          <div class="base-grid">
            <div
              v-for="room in ['控制中枢', '贸易站', '制造站', '宿舍']"
              :key="room"
            >
              <UiIcon name="boxes" /><b>{{ room }}</b
              ><small>{{ baseCollected ? '运转中' : '待收取' }}</small>
            </div>
          </div>
          <button
            class="panel-action"
            type="button"
            :disabled="baseCollected"
            @click="collectBase"
          >
            {{ baseCollected ? '收益已收取' : '一键收取 · 12,000 龙门币' }}
            <span>→</span>
          </button>
        </template>
        <template v-else-if="activePanel === 'depot'">
          <div class="panel-tabs">
            <button
              v-for="filter in ['全部', '养成材料', '招募凭证']"
              :key="filter"
              type="button"
              :class="{ selected: depotFilter === filter }"
              @click="depotFilter = filter"
            >
              {{ filter }}
            </button>
          </div>
          <div class="inventory-grid">
            <div v-for="item in filteredInventory" :key="item.name">
              <b>{{ item.icon }}</b
              ><span>{{ item.name }}</span
              ><small>× {{ item.count }}</small>
            </div>
          </div>
        </template>
        <template v-else-if="activePanel === 'settings'">
          <button
            class="setting-row"
            type="button"
            :aria-pressed="motionEnabled"
            @click="toggleMotion"
          >
            <span>人物视差与动态花瓣</span
            ><b>{{ motionEnabled ? '开启' : '关闭' }}</b>
          </button>
          <button class="setting-row" type="button" @click="replayFromSettings">
            <span>重新播放入场动画</span><b>↻</b>
          </button>
        </template>
        <template v-else-if="activePanel === 'sanity'">
          <div class="sanity-meter">
            <strong>{{ sanity }}<small>/210</small></strong
            ><progress :value="sanity" max="210" />
          </div>
          <button
            class="panel-action"
            type="button"
            :disabled="sanity >= 210 || recoveryCount === 0"
            @click="recoverSanity"
          >
            恢复 60 理智 · 剩余 {{ recoveryCount }} 份 <span>+</span>
          </button>
        </template>
        <template
          v-else-if="activePanel === 'calendar' || activePanel === 'mail'"
        >
          <div v-if="activePanel === 'calendar'" class="sign-in-days">
            <span
              v-for="n in 7"
              :key="n"
              :class="{ selected: n === 1 && signedIn }"
              ><small>DAY {{ n }}</small
              ><b>{{ n === 7 ? '◈' : '▧' }}</b></span
            >
          </div>
          <button
            class="panel-action"
            type="button"
            :disabled="activePanel === 'calendar' ? signedIn : mailClaimed"
            @click="claimDaily"
          >
            {{
              (activePanel === 'calendar' ? signedIn : mailClaimed)
                ? '已领取'
                : '领取 2,000 龙门币'
            }}
            <span>→</span>
          </button>
        </template>
        <template v-else>
          <div class="info-sheet">
            <span>{{ panel.detailLabel || '罗德岛终端' }}</span
            ><strong>{{ panel.detail || '此刻，我们在同一片蓝天下。' }}</strong
            ><small>{{ panel.note || 'ARKNIGHTS × PERSONA 3 RELOAD' }}</small>
          </div>
          <button
            v-if="['event', 'exhibition'].includes(activePanel)"
            class="panel-action"
            type="button"
            @click="openPanel('terminal')"
          >
            前往活动终端 <span>→</span>
          </button>
        </template>
        <p class="panel-feedback" role="status" aria-live="polite">
          {{ feedback }}
        </p>
        <div class="panel-footer">
          UI 交互演示 · 数据仅在本次页面停留期间有效
        </div>
      </section>
    </ModalWrapper>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'

import ModalWrapper from '@/components/ModalWrapper/index.vue'
import ToolPageLayout from '@/components/ToolPageLayout/index.vue'

import { mainMenus, operators, panels, stages, utilities } from './data'
import UiIcon from './UiIcon.vue'

const classroom =
  'https://assets.anuluca.com/Island/playground/arknight-persona/classroom.webp'
const protagonist =
  'https://assets.anuluca.com/Island/playground/arknight-persona/protagonist.webp'

const viewport = ref<HTMLElement | null>(null)
const scene = ref<HTMLElement | null>(null)
const character = ref<HTMLImageElement | null>(null)
const scale = ref(1)
const entranceKey = ref(0)
const backgroundReady = ref(false)
const characterReady = ref(false)
const assetsReady = computed(
  () => backgroundReady.value && characterReady.value
)
const motionEnabled = ref(true)
const clock = ref('2026/09/05 14:51')
const panelVisible = ref(false)
const activePanel = ref('terminal')
const feedback = ref('')
const lmd = ref(13764074)
const orundum = ref(236171)
const sanity = ref(52)
const recoveryCount = ref(3)
const selectedStage = ref(stages[0])
const squad = ref(1)
const selectedOperators = ref([['结城理', '阿米娅'], ['能天使'], ['凯尔希']])
const selectedTags = ref<string[]>([])
const recruitTags = ['近战位', '远程位', '输出', '治疗', '支援']
const recruitHours = ref(9)
const recruitStarted = ref(false)
const recruited = ref(false)
const baseCollected = ref(false)
const signedIn = ref(false)
const mailClaimed = ref(false)
const depotFilter = ref('全部')
const products = [
  { name: '高级作战记录', icon: '▤', price: 2000 },
  { name: '技巧概要', icon: '▱', price: 1200 },
  { name: '招聘许可', icon: '◈', price: 600 },
]
const inventory = ref([
  { name: '高级作战记录', icon: '▤', count: 128, category: '养成材料' },
  { name: '技巧概要', icon: '▱', count: 64, category: '养成材料' },
  { name: '招聘许可', icon: '◈', count: 12, category: '招募凭证' },
  { name: '龙骨', icon: '⬡', count: 8, category: '养成材料' },
])
const missions = ref([
  { name: '每日登录 · 已完成', reward: 1000, claimed: false },
  { name: '基建值班 · 已完成', reward: 2000, claimed: false },
  { name: '物资整理 · 已完成', reward: 3000, claimed: false },
])
const panel = computed(() => panels[activePanel.value] || panels.terminal)
const filteredInventory = computed(() =>
  inventory.value.filter(
    (item) =>
      depotFilter.value === '全部' || item.category === depotFilter.value
  )
)
// 固定序列让静态生成与客户端水合得到相同的花瓣位置。
const petals = Array.from({ length: 22 }, (_, id) => ({
  id,
  style: {
    left: `${(id * 37 + 5) % 100}%`,
    top: `${(id * 23 + 17) % 100}%`,
    '--petal-delay': `${-(id % 9)}s`,
    '--petal-duration': `${12 + (id % 5) * 2}s`,
    '--petal-size': `${9 + (id % 4) * 3}px`,
  },
}))

let resizeObserver: ResizeObserver | null = null
let clockTimer: ReturnType<typeof setInterval> | null = null
let motionQuery: MediaQueryList | null = null
let animationFrame = 0
let targetX = 0
let targetY = 0
let currentX = 0
let currentY = 0

const resizeScene = () => {
  if (!viewport.value) return
  scale.value = Math.min(
    viewport.value.clientWidth / 1600,
    viewport.value.clientHeight / 912
  )
}
const animateCharacter = () => {
  currentX += (targetX - currentX) * 0.085
  currentY += (targetY - currentY) * 0.085
  character.value?.style.setProperty(
    'transform',
    `translate3d(${currentX}px, ${currentY}px, 0)`
  )
  if (Math.abs(currentX - targetX) + Math.abs(currentY - targetY) > 0.03) {
    animationFrame = requestAnimationFrame(animateCharacter)
  } else {
    animationFrame = 0
  }
}
const scheduleMotion = () => {
  if (!animationFrame) animationFrame = requestAnimationFrame(animateCharacter)
}
const moveCharacter = (event: PointerEvent) => {
  if (
    !motionEnabled.value ||
    motionQuery?.matches ||
    event.pointerType === 'touch' ||
    !scene.value
  )
    return
  const rect = scene.value.getBoundingClientRect()
  targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 32
  targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 18
  scheduleMotion()
}
const resetCharacter = () => {
  targetX = 0
  targetY = 0
  scheduleMotion()
}
const toggleMotion = () => {
  motionEnabled.value = !motionEnabled.value
  resetCharacter()
}
const syncMotionPreference = () => {
  motionEnabled.value = !motionQuery?.matches
  resetCharacter()
}
const replayEntrance = async () => {
  if (animationFrame) cancelAnimationFrame(animationFrame)
  animationFrame = 0
  currentX = currentY = targetX = targetY = 0
  entranceKey.value++
  await nextTick()
}
const openPanel = (id: string) => {
  activePanel.value = id
  feedback.value = ''
  panelVisible.value = true
  resetCharacter()
}
const startOperation = () => {
  if (sanity.value < selectedStage.value.cost) return
  sanity.value -= selectedStage.value.cost
  feedback.value = `${selectedStage.value.code} ${selectedStage.value.title} · 行动已启动（演示），消耗 ${selectedStage.value.cost} 理智。`
}
const recoverSanity = () => {
  if (!recoveryCount.value || sanity.value >= 210) return
  const recovered = Math.min(60, 210 - sanity.value)
  sanity.value += recovered
  recoveryCount.value--
  feedback.value = `理智已恢复 +${recovered}。`
}
const toggleOperator = (name: string) => {
  const members = selectedOperators.value[squad.value - 1]
  const index = members.indexOf(name)
  if (index >= 0) members.splice(index, 1)
  else members.push(name)
}
const toggleTag = (tag: string) => {
  const index = selectedTags.value.indexOf(tag)
  if (index >= 0) selectedTags.value.splice(index, 1)
  else if (selectedTags.value.length < 3) selectedTags.value.push(tag)
  else feedback.value = '最多选择 3 个招募标签。'
}
const startRecruit = () => {
  if (recruitStarted.value) return
  recruitStarted.value = true
  feedback.value = `招募已开始：${
    selectedTags.value.join(' / ') || '不限职业'
  }，${recruitHours.value} 小时。`
}
const replayFromSettings = () => {
  panelVisible.value = false
  replayEntrance()
}
const buyProduct = (product: (typeof products)[number]) => {
  if (lmd.value < product.price) {
    feedback.value = '龙门币不足。'
    return
  }
  lmd.value -= product.price
  const item = inventory.value.find((item) => item.name === product.name)
  if (item) item.count++
  feedback.value = `已兑换 ${product.name} ×1，已放入仓库。`
}
const headhunt = () => {
  if (orundum.value < 600) return
  orundum.value -= 600
  recruited.value = true
  const item = inventory.value.find((item) => item.name === '阿米娅信物')
  if (item) item.count++
  else
    inventory.value.push({
      name: '阿米娅信物',
      icon: '✦',
      count: 1,
      category: '招募凭证',
    })
  feedback.value = '演示结果：获得阿米娅信物 ×1。'
}
const claimMission = (mission: (typeof missions.value)[number]) => {
  if (mission.claimed) return
  mission.claimed = true
  lmd.value += mission.reward
  feedback.value = `奖励已领取：龙门币 +${mission.reward}。`
}
const collectBase = () => {
  if (baseCollected.value) return
  baseCollected.value = true
  lmd.value += 12000
  feedback.value = '基建收益已收取：龙门币 +12,000。'
}
const claimDaily = () => {
  const claimed = activePanel.value === 'calendar' ? signedIn : mailClaimed
  if (claimed.value) return
  claimed.value = true
  lmd.value += 2000
  feedback.value = '龙门币 +2,000，已添加至账户。'
}
const updateClock = () => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  clock.value = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(
    now.getDate()
  )} ${pad(now.getHours())}:${pad(now.getMinutes())}`
}
onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionEnabled.value = !motionQuery.matches
  motionQuery.addEventListener('change', syncMotionPreference)
  resizeObserver = new ResizeObserver(resizeScene)
  if (viewport.value) resizeObserver.observe(viewport.value)
  resizeScene()
  updateClock()
  clockTimer = setInterval(updateClock, 30000)
})
onUnmounted(() => {
  resizeObserver?.disconnect()
  if (clockTimer) clearInterval(clockTimer)
  if (animationFrame) cancelAnimationFrame(animationFrame)
  motionQuery?.removeEventListener('change', syncMotionPreference)
})
</script>

<style scoped lang="less" src="./index.less" />
