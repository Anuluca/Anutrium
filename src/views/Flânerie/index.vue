<script setup lang="ts">
import PageFooter from '@/components/PageFooter/index.vue'
import PageHeroTitle from '@/components/PageHeroTitle/index.vue'

import JourneyContent from './JourneyContent.vue'
</script>

<template>
  <div class="flanerie-page main-container">
    <PageHeroTitle />
    <JourneyContent />
    <PageFooter />
  </div>
</template>

<style scoped>
.main-container {
  width: 100%;
  color: #fff;
}
</style>
