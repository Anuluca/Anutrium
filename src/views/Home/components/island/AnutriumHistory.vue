<script setup lang="ts">
import WorkCard from '@/components/WorkCard/index.vue'

defineProps<{ expanded?: boolean }>()
const versions = ['0.1-alpha', '1.0', '1.2', '2.0']
const entries = [
  {
    id: 'garden',
    title: '路卡的自由庭院岛',
    company: 'HEXO · 旧版博客',
    img: 'https://assets.anuluca.com/other/iShot_2026-06-04_20.59.04.jpg',
    link: 'https://garden.anuluca.com/',
  },
  ...versions.map((version) => ({
    id: version,
    title: `Anutrium ${version}`,
    company: 'ANUTRIUM HISTORY',
    img: `https://assets.anuluca.com/Island/laboratory/anutrium-history/previews/20261117_173052_v${version}.webp`,
    link: `https://history.anuluca.com/v${version}/`,
  })),
]
const openVersion = (link: string) => {
  window.open(link, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <section class="anutrium-history" :class="{ 'is-expanded': expanded }">
    <div class="laboratory-gallery-grid">
      <WorkCard
        v-for="entry in entries"
        :key="entry.id"
        :work="entry"
        theme-color="var(--page-theme-color)"
        display-mode="always-visible"
        @select="openVersion(entry.link)"
      />
    </div>
  </section>
</template>

<style scoped lang="less" src="./laboratoryGallery.less" />
