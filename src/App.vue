<script setup lang="ts">
import layout from './layout/index.vue'
import FooterCom from '@/components/FooterCom/index.vue'
import BackController from '@/components/BackController/index.vue'
import { onMounted } from 'vue'
import { visualState } from './stores'
import { useRouter, useRoute } from 'vue-router'

const $router = useRouter() // 这是路由跳转的
const visualStateStore = visualState()

</script>

<template>
  <el-container>
    <BackController />
    <layout></layout>
    <FooterCom />
  </el-container>
</template>
