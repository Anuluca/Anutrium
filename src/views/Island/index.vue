<template>
  <div class="island-page main-container">
    <PageHeader
      header-label="[THE_FOOL]"
      title-en="ISLAND"
      title-cn="个人海湾"
      meta-item="勿忘人皆有死"
      primary-color="#E23456"
    />
    <PageFooter cn-title="个人海湾" en-title="ISLAND" />
  </div>
</template>

<script setup lang="ts">
import PageHeader from '@/components/PageHeader/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
</script>

<style lang="less" scoped>
.island-page {
  width: 100%;
  color: #fff;
}
</style>
