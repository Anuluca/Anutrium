<script setup lang="ts">
import './index.less'
import md from './README.md?raw'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/base16/dracula.css'

const render = new marked.Renderer()
marked.setOptions({
  renderer: new marked.Renderer(),
  highlight: function (code) {
    return hljs.highlightAuto(code).value
  }
})
console.log(md)
const MDHtml = marked(md)
</script>

<template>
  <div class="home-page">
    home
    <div v-html="MDHtml" class="markdown-body" />
  </div>
</template>
