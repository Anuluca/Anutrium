<template>
  <svg
    viewBox="0 0 32 32"
    fill="none"
    stroke="currentColor"
    stroke-width="2.3"
    stroke-linecap="square"
    stroke-linejoin="miter"
    aria-hidden="true"
  >
    <template v-if="name === 'settings'">
      <path
        fill="currentColor"
        stroke="none"
        d="m13 1 6 0 1 5 4 2 5-1 3 6-4 3v4l3 3-3 5-5-1-4 2-1 3h-6l-1-4-4-2-4 1-3-6 4-3v-4L1 11l3-5 5 1 3-2z"
      />
      <circle cx="16" cy="16" r="6" fill="#91c7ec" stroke="none" />
    </template>
    <template v-else-if="name === 'warning'">
      <path d="M16 2 31 29H1Z" fill="currentColor" stroke="none" />
      <path d="M16 10v9m0 4v1" stroke="#7396b4" stroke-width="3" />
    </template>
    <template v-else-if="name === 'mail'">
      <path d="M2 5h28v23H2Z" fill="currentColor" stroke="none" />
      <path d="m4 8 12 10L28 8" stroke="#92a4b5" />
    </template>
    <template v-else-if="name === 'calendar'">
      <path d="M3 5h26v25H3zM3 11h26M10 2v5M22 2v5" />
      <path d="m9 21 5 4 10-10" stroke-width="3" />
    </template>
    <template v-else-if="name === 'battery'">
      <path d="M2 8h25v16H2zM30 13v6M8 12v8M14 12v8M20 12v8" />
    </template>
    <template v-else-if="name === 'chat'">
      <path
        d="M29 14c0 8-6 12-14 12l-7 4v-6C-3 15 3 2 16 2c8 0 13 5 13 12"
        fill="currentColor"
        stroke="none"
      />
      <path d="M9 14h1m5 0h1m5 0h1" stroke="#69b51f" />
    </template>
    <template v-else-if="name === 'clock'">
      <circle cx="16" cy="16" r="13" fill="currentColor" stroke="none" />
      <path d="M16 6v11l7 4" stroke="#90b344" />
    </template>
    <template v-else-if="name === 'boxes'">
      <path
        d="M3 4h10v10H3zM18 4h11v10H18zM3 19h10v10H3zM18 19h11v10H18z"
        stroke-width="3"
      />
    </template>
    <template v-else>
      <path
        d="M5 29v-5l6-5c-7-3-7-15 0-15s8 12 1 15l6 5v5M22 4c7 0 7 11 1 14l6 6v5"
      />
    </template>
  </svg>
</template>
<script setup lang="ts">
defineProps<{ name: string }>()
</script>
