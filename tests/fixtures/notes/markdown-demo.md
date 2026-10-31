---
title: "前端手记：Markdown 排版与代码示例"
date: "2026-10-31"
category: technology
---
# 前端手记

这是一篇 **Markdown 演示笔记**。以后所有笔记都以 `.md` 文件保存，再转换为阅读页面。

## 文字与引用

可以使用 **粗体**、*斜体*、~~删除线~~ 与 `行内代码`，组织需要反复查阅的知识。

> 先记录问题，再记录解决过程，最后留下可复现的代码。

## Vue 组件示例

下面的代码演示如何用计算属性从原始数据派生展示内容。

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'

const keyword = ref('')
const notes = ref(['Vue 组件', 'CSS 布局', 'TypeScript 类型'])

// 展示列表随关键词更新，不修改原始数据。
const visibleNotes = computed(() =>
  notes.value.filter(title => title.toLowerCase().includes(keyword.value.toLowerCase()))
)
</script>

<template>
  <input v-model="keyword" placeholder="搜索笔记" />
  <ul>
    <li v-for="title in visibleNotes" :key="title">{{ title }}</li>
  </ul>
</template>
```

## 列表与步骤

- 用标题划分主题。
- 用列表整理并列信息。
- 用代码块保留可以复现的示例。

1. 在 AnuConsole 打开「笔记管理」。
2. 导入 Markdown 文件，或在线填写标题、分类、日期与正文。
3. 预览后发布，Notes 页面将读取新笔记。

## 表格

| 内容 | Markdown 写法 | 用途 |
| --- | --- | --- |
| 标题 | `## 标题` | 划分章节 |
| 行内代码 | 反引号包裹 | 标记变量与命令 |
| 链接 | `[文字](地址)` | 关联参考资料 |
| 代码块 | 三个反引号 | 保存完整示例 |

---

## 参考链接

- [Vue 官方文档](https://cn.vuejs.org/)
- [MDN Web 文档](https://developer.mozilla.org/zh-CN/)

正文支持 Markdown 标准排版；原始 HTML 作为文本显示。
