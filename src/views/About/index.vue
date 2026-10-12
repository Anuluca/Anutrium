<script setup lang="ts">
import { useRouter } from 'vue-router'

import AboutContent from './AboutContent.vue'

const router = useRouter()
</script>
<template><AboutContent @close="router.push('/')" /></template>
