<template>
  <GamePageLayout
    page-class="sleeping-dogs-game"
    :title="copy.pageTitle"
    :subtitle="copy.pageSubtitle"
    :rules-text="copy.rulesBody"
    :rules-note="copy.refreshNote"
    :source-text="copy.sourceBody"
    back-label="HOME"
    back-path="/"
  >
    <template #game>
      <BullsAndCowsGame />
    </template>
  </GamePageLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import GamePageLayout from '@/components/GamePageLayout/index.vue'
import BullsAndCowsGame from '@/views/Games/SleepingDogs/BullsAndCows/BullsAndCowsGame.vue'

const { locale } = useI18n()

const copy = computed(() =>
  locale.value === 'en'
    ? {
        pageTitle: 'Guess the Number',
        pageSubtitle: 'Sleeping Dogs Mini-game',
        refreshNote: 'The code refreshes daily at midnight.',
        rulesBody: 'Crack today’s four-digit code within six attempts.',
        sourceBody:
          'Recreated from the camera-hacking number puzzle in Sleeping Dogs, based on Bulls and Cows.',
      }
    : {
        pageTitle: '猜数字',
        pageSubtitle: '《热血无赖》小游戏',
        refreshNote: '数字每天24点刷新',
        rulesBody: '在六次机会内破解今天的四位数字。',
        sourceBody:
          '复刻《热血无赖》摄像头入侵玩法，核心规则源自 Bulls and Cows（猜数字）。',
      }
)
</script>
