<script setup lang="ts">
import PageFooter from '@/components/PageFooter/index.vue'
import PageHeroTitle from '@/components/PageHeroTitle/index.vue'

import ArchiveContent from './ArchiveContent.vue'
</script>

<template>
  <div class="archives-page main-container">
    <PageHeroTitle />
    <ArchiveContent />
    <PageFooter />
  </div>
</template>

<style scoped>
.main-container {
  width: 100%;
  color: #fff;
}
</style>
