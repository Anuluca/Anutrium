---
title: "标签插件测试"
date: "2026-11-01"
category: test
---

## 引用块

### 普通引用

> 这是普通引用内容，用于检查引用文字的边框、背景和段落间距。

### 引用书籍

{% blockquote 大卫·利维坦，《清醒》 %}
不要只为自己寻找幸福，也要为所有人寻找幸福。以善意，以慈悲。
{% endblockquote %}

### 引用社交平台内容

{% blockquote @DevDocs https://twitter.com/devdocs/status/356095192085962752 %}
新功能：DevDocs 现已支持语法高亮。 http://devdocs.io
{% endblockquote %}

### 引用网络文章

{% blockquote 塞斯·高汀 http://sethgodin.typepad.com/seths_blog/2009/07/welcome-to-island-marketing.html 欢迎来到岛屿营销 %}
每一次互动都很珍贵，也都是带来愉悦体验的机会。
{% endblockquote %}

## 代码块

### 普通代码块

```
alert('Hello World!');
```

### 带标题

{% codeblock Array.map %}
array.map(callback[, thisArg])
{% endcodeblock %}

### 带标题和链接

{% codeblock .compact http://underscorejs.org/#compact Underscore.js %}
.compact([0, 1, false, 2, ‘’, 3]);
=> [1, 2, 3]
{% endcodeblock %}

### 标记指定行

第 1、7–8、10 行应以不同颜色标记。

{% codeblock lang:js mark:1,7-8,10 %}
const http = require('http');

const hostname = '127.0.0.1';
const port = 1337;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World\n');
}).listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
{% endcodeblock %}

说明：主题应支持指定行高亮，建议使用选区或当前行的强调色。

## 抽出式引用

### 左侧引用

{% pullquote left %}
这是一段抽出式引用文字，用于检查引用区域的排版。
{% endpullquote %}

这是一段中文排版示例，用于检查抽出式引用与正文的组合效果。引用应保持独立的边框、背景和留白，正文按照阅读区域自然换行。较长的段落用于确认字体、行距以及不同屏幕尺寸下的显示效果。

### 右侧引用

{% pullquote right %}
这是一段抽出式引用文字，用于检查引用区域的排版。
{% endpullquote %}

这是一段中文排版示例，用于检查抽出式引用与正文的组合效果。引用应保持独立的边框、背景和留白，正文按照阅读区域自然换行。较长的段落用于确认字体、行距以及不同屏幕尺寸下的显示效果。
