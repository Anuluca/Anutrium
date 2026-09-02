<template>
  <GamePageLayout
    page-class="sleeping-dogs-game sleeping-dogs-safety-box"
    :title="copy.pageTitle"
    :subtitle="copy.pageSubtitle"
    :rules-text="copy.rulesBody"
    :rules-note="copy.refreshNote"
    :source-text="copy.sourceBody"
    :supported-inputs="['keyboardMouse', 'gamepad', 'mobile']"
    game-icon="https://assets.anuluca.com/other/sleepingDogs.png"
    back-label="HOME"
    back-path="/"
  >
    <template #game>
      <SafetyBoxGame />
    </template>
  </GamePageLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import GamePageLayout from '@/components/GamePageLayout/index.vue'
import SafetyBoxGame from '@/views/Games/SleepingDogs/SafetyBox/SafetyBoxGame.vue'

const { locale } = useI18n()

const copy = computed(() =>
  locale.value === 'en'
    ? {
        pageTitle: '保险箱小游戏',
        pageSubtitle: 'Sleeping Dogs Mini-game',
        refreshNote:
          'The three-number combination refreshes daily at midnight.',
        rulesBody:
          'Crack all three tumblers in order: counter-clockwise, clockwise, then counter-clockwise. Use A / ←, D / →, or the gamepad right stick and follow the signal peak.',
        sourceBody: '复刻《热血无赖》保险箱小游戏玩法。',
      }
    : {
        pageTitle: '保险箱小游戏',
        pageSubtitle: '《热血无赖》小游戏',
        refreshNote: '三个密码数字每天 24 点刷新',
        rulesBody:
          '三个旋钮依次只能逆时针、顺时针、逆时针旋转。A / ← 控制逆时针，D / → 控制顺时针，也可使用手柄右摇杆，并通过信号峰值寻找正确数字。',
        sourceBody: '复刻《热血无赖》保险箱小游戏玩法。',
      }
)
</script>
