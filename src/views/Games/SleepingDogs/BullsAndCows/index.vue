<template>
  <GamePageLayout
    page-class="sleeping-dogs-game"
    :title="copy.pageTitle"
    :subtitle="copy.pageSubtitle"
    back-label="HOME"
    back-path="/"
  >
    <template #game>
      <BullsAndCowsGame />
    </template>

    <template #description>
      <BullsAndCowsDescription />
    </template>
  </GamePageLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import GamePageLayout from '@/components/GamePageLayout/index.vue'
import BullsAndCowsDescription from '@/views/Games/SleepingDogs/BullsAndCows/BullsAndCowsDescription.vue'
import BullsAndCowsGame from '@/views/Games/SleepingDogs/BullsAndCows/BullsAndCowsGame.vue'

const { locale } = useI18n()

const copy = computed(() =>
  locale.value === 'en'
    ? {
        pageTitle: 'Guess the Number',
        pageSubtitle: 'Sleeping Dogs Mini-game',
      }
    : {
        pageTitle: '猜数字',
        pageSubtitle: '《热血无赖》小游戏',
      }
)
</script>
