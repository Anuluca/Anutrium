<script lang="ts" setup>
import { useRoute } from "vue-router";
import BackStars from "@/components/BackStars/index.vue";
import { computed } from "vue";
import { visualState } from "@/stores";

const route = useRoute();
const visualStateStore = visualState();
const ifDarken = computed(() => {
  if (currentRouter.value === "/") {
    return false;
  } else {
    return true;
  }
});
const currentRouter = computed(() => {
  return route.path;
});
const theme = computed(() => {
  if (visualStateStore.theme === "light") {
    return "light";
  } else {
    return "dawn";
  }
});
</script>
<template>
  <div class="back-controller">
    <BackStars :theme="theme" :ifDarken="ifDarken" />
  </div>
</template>

<style></style>
