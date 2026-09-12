<template>
  <GamePageLayout
    page-class="chinese-chess-page"
    title="中国象棋"
    subtitle="中国棋牌游戏"
    back-label="HOME"
    back-path="/"
    :game-icon="elephantPieceIcon"
    :rules-text="copy.rules"
    :rules-note="copy.rulesNote"
    :source-text="copy.source"
    :supported-inputs="['mobile', 'keyboardMouse']"
  >
    <template #game>
      <ChineseChessGame :game-icon="elephantPieceIcon" />
    </template>
  </GamePageLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import GamePageLayout from '@/components/GamePageLayout/index.vue'

import ChineseChessGame from './ChineseChessGame.vue'

const elephantPieceIcon =
  'https://assets.anuluca.com/Island/myGames/chinese-chess-card-games/chinese-chess/elephant-piece.svg'

const { locale } = useI18n()

const copy = computed(() =>
  locale.value === 'en'
    ? {
        rules:
          'You play Red and move first. Drag a piece to a highlighted intersection. Checkmate the opposing general to win.',
        rulesNote: 'Play against the computer',
        source:
          'Classic Chinese Xiangqi, built with GPT-5.6 Sol. Rules and move validation use the open-source xiangqi.js engine.',
      }
    : {
        rules: '玩家执红先行。拖动棋子至高亮落点，将死电脑主帅即获胜。',
        rulesNote: '人机对弈',
        source:
          '经典中国象棋玩法，使用GPT5.6 Sol制作，规则与走法校验使用开源 xiangqi.js。',
      }
)
</script>
