<script setup lang="ts">
defineProps<{ kind: 'license' | 'copyright' }>()
</script>

<template>
  <p v-if="kind === 'license'" class="footer-license">
    The copyright statement for articles and pictures: free to reprint,
    non-commercial, non-derivative, with attribution (
    <a
      class="license"
      data-magnetic
      href="https://creativecommons.org/licenses/by-nc-nd/3.0/cn/"
      target="_blank"
      rel="noopener noreferrer"
    >
      Creative Commons 3.0 license
    </a>
    ).
  </p>
  <p v-else class="footer-copyright">
    DESIGNED & ENGINEERED BY ANULUCA. © 2018-2026 Anuluca. All rights reserved.
  </p>
</template>

<style scoped>
.license {
  color: inherit;
  text-decoration: underline;
  cursor: pointer;
  transition: color 0.1s, background-color 0.1s;
}
.license:hover {
  color: #000;
  background-color: var(--page-theme-color, #e23456);
}
</style>
