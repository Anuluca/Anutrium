<template>
  <section class="bulls-cows-description" :aria-label="copy.rulesTitle">
    <div class="bulls-cows-description__eyebrow">BULLS &amp; COWS</div>
    <h2>{{ copy.rulesTitle }}</h2>
    <p>{{ copy.rulesIntro }}</p>

    <ul>
      <li v-for="rule in copy.rules" :key="rule">{{ rule }}</li>
    </ul>

    <div class="design-source">
      <h3>{{ copy.sourceTitle }}</h3>
      <p>{{ copy.sourceBody }}</p>
    </div>

    <div class="rules-legend">
      <span><i class="rule-mark rule-mark--exact" />{{ copy.exact }}</span>
      <span
        ><i class="rule-mark rule-mark--misplaced" />{{ copy.misplaced }}</span
      >
      <span><i class="rule-mark rule-mark--absent" />{{ copy.absent }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

const copy = computed(() => {
  if (locale.value === 'en') {
    return {
      rulesTitle: 'RULES',
      rulesIntro: 'Crack today’s four-digit code within six attempts.',
      rules: [
        'All four digits are unique.',
        'The code changes once per local calendar day.',
        'A full four-digit entry is checked automatically.',
      ],
      sourceTitle: 'DESIGN SOURCE',
      sourceBody:
        'Recreated from the camera-hacking number puzzle in Sleeping Dogs, based on Bulls and Cows.',
      exact: 'Correct digit and position',
      misplaced: 'Correct digit, wrong position',
      absent: 'Digit is not in the code',
    }
  }

  return {
    rulesTitle: '游戏规则',
    rulesIntro: '在六次机会内破解今天的四位数字。',
    rules: [
      '四个数字互不重复。',
      '密码按本地日期每天更新一次。',
      '填满四位数字后自动验证。',
    ],
    sourceTitle: '小游戏设计来源',
    sourceBody:
      '复刻《热血无赖》摄像头入侵玩法，核心规则源自 Bulls and Cows（猜数字）。',
    exact: '数字与位置均正确',
    misplaced: '数字正确，位置错误',
    absent: '密码中没有该数字',
  }
})
</script>

<style lang="less" scoped>
.bulls-cows-description {
  position: relative;
  min-height: 100%;
  padding: clamp(18px, 2vw, 30px);
  box-sizing: border-box;
  color: #d7c9c9;
  background-color: #050305;
  background-image: repeating-linear-gradient(
    to bottom,
    rgba(110, 12, 25, 0.14) 0,
    rgba(110, 12, 25, 0.14) 1px,
    transparent 1px,
    transparent 4px
  );
  font-family: 'alibaba-puhuiti', sans-serif;

  &::before {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 3px;
    content: '';
    background: #861726;
  }

  &__eyebrow {
    margin-bottom: 7px;
    color: #8b2633;
    font-family: 'Courier New', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
  }

  h2 {
    margin: 0 0 14px;
    color: #d84a5c;
    font-size: clamp(21px, 2.1vw, 32px);
    font-weight: 900;
    letter-spacing: 0.08em;
    line-height: 1;
  }

  > p {
    margin: 0 0 16px;
    color: #eee5e5;
    font-size: clamp(12px, 1vw, 15px);
    line-height: 1.65;
  }

  ul {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 0 0 0 20px;
    color: #bcaeae;
    font-size: clamp(11px, 0.9vw, 14px);
    line-height: 1.55;
  }
}

.design-source,
.rules-legend {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(111, 16, 27, 0.72);
}

.design-source {
  h3 {
    margin: 0 0 7px;
    color: #b63a4a;
    font-size: 12px;
    letter-spacing: 0.08em;
  }

  p {
    margin: 0;
    color: #9f9292;
    font-size: 12px;
    line-height: 1.65;
  }
}

.rules-legend {
  display: grid;
  gap: 9px;
  font-size: 12px;

  span {
    display: flex;
    align-items: center;
    gap: 9px;
  }
}

.rule-mark {
  flex: 0 0 auto;
  width: 10px;
  height: 10px;

  &--exact {
    background: #22ef35;
  }

  &--misplaced {
    border-radius: 50%;
    background: #f1c640;
  }

  &--absent {
    background: #c80e15;
  }
}

@media (max-height: 600px) and (orientation: landscape) {
  .bulls-cows-description {
    padding: 14px 16px;

    h2 {
      margin-bottom: 8px;
      font-size: 19px;
    }

    > p {
      margin-bottom: 9px;
      font-size: 10px;
      line-height: 1.4;
    }

    ul {
      gap: 3px;
      font-size: 9px;
      line-height: 1.35;
    }
  }

  .design-source,
  .rules-legend {
    margin-top: 9px;
    padding-top: 8px;
  }

  .design-source p,
  .rules-legend {
    font-size: 9px;
  }
}
</style>
