<template>
  <div class="tl-grid"><slot /></div>
</template>

<style lang="less" scoped>
.tl-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24px 20px;
  margin-left: 2px;
  margin-right: 2px;
  margin-top: 20px;
  margin-bottom: 2px;
  position: relative;
}

@media (max-width: 900px) {
  .tl-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px), screen and (max-aspect-ratio: 1) {
  .tl-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
