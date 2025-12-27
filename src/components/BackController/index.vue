<script lang="ts" setup>
import { useRoute } from "vue-router";
import BackStars from "@/components/BackStars/index.vue";
import { computed } from "vue";
import { visualState } from "@/stores";

const route = useRoute();
const visualStateStore = visualState();
const isTextMenu = computed(() => {
  if (currentRouter.value === "/") {
    return false;
  } else {
    return true;
  }
});
const currentRouter = computed(() => {
  return route.path;
});
</script>
<template>
  <div class="back-controller">
    <BackStars :theme="visualStateStore.theme" :isTextMenu="isTextMenu" />
  </div>
</template>

<style></style>
