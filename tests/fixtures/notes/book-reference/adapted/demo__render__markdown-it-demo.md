# 一级标题 8-)
## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题


## 分割线

___

---

***


## 排版字符替换

启用 typographer 选项后，可以查看排版字符自动替换的效果。

(c) (C) (r) (R) (tm) (TM) (p) (P) +-

测试.. 测试... 测试..... 测试?..... 测试!....

!!!!!! ???? ,,  -- ---

"智能排版的双引号"与'单引号'


## 强调

**这是加粗文字**

__这是加粗文字__

*这是斜体文字*

_这是斜体文字_

~~删除线~~


## 引用块


> 引用块也可以嵌套……
>> ……只需连续添加大于号……
> > > ……也可以在大于号之间加入空格。


## 列表

无序列表

+ 在行首使用 `+`、`-` 或 `*` 创建列表
+ 缩进两个空格即可创建子列表：
  - 更换标记符号会开始一个新列表：
    * 第一个子列表项目
    + 第二个子列表项目
    - 第三个子列表项目
+ 使用方法很简单！

有序列表

1. 第一个有序列表项目
2. 第二个有序列表项目
3. 第三个有序列表项目


1. 可以使用连续编号……
1. ……也可以让所有项目都使用 `1.`

从指定编号开始：

57. 项目甲
1. 项目乙


## 代码

行内 `代码`

缩进代码块

    // 示例注释
    代码第一行
    代码第二行
    代码第三行


围栏代码块

```
这里是示例文字……
```

语法高亮

``` js
var foo = function (bar) {
  return bar++;
};

console.log(foo(5));
```

## 表格

| 选项 | 说明 |
| ------ | ----------- |
| data   | 数据文件路径，用于提供传入模板的数据。 |
| engine | 用于处理模板的引擎，默认使用 Handlebars。 |
| ext    | 目标文件使用的扩展名。 |

右对齐的列

| 选项 | 说明 |
| ------:| -----------:|
| data   | 数据文件路径，用于提供传入模板的数据。 |
| engine | 用于处理模板的引擎，默认使用 Handlebars。 |
| ext    | 目标文件使用的扩展名。 |


## 链接

[链接文字](http://dev.nodeca.com)

[带标题的链接](http://nodeca.github.io/pica/demo/ "链接标题！")

自动识别的链接 https://github.com/nodeca/pica （启用 linkify 后可查看效果）


## 图片

![小黄人猫](https://assets.anuluca.com/Island/notes/other/minion.png)
![冲锋队猫](https://assets.anuluca.com/Island/notes/other/stormtroopocat.jpg "冲锋队猫")

与链接一样，图片也支持引用式语法

![图片替代文字][id]

在文档后方定义引用对应的图片地址：

[id]: https://assets.anuluca.com/Island/notes/other/dojocat.jpg  "道场猫"


## 插件

`markdown-it` 的一个主要特点是高效支持[语法插件](https://www.npmjs.org/browse/keyword/markdown-it-plugin)。


### [表情符号](https://github.com/markdown-it/markdown-it-emoji)

> 常规标记： :wink: :crush: :cry: :tear: :laughing: :yum:
>
> 快捷表情： :-) :-( 8-) ;)

参阅[如何更改输出](https://github.com/markdown-it/markdown-it-emoji#change-output)，使用 twemoji 替换表情输出。


### [下标](https://github.com/markdown-it/markdown-it-sub) / [上标](https://github.com/markdown-it/markdown-it-sup)

- 19^th^
- H~2~O


### [\<ins>](https://github.com/markdown-it/markdown-it-ins)

++插入的文字++


### [\<mark>](https://github.com/markdown-it/markdown-it-mark)

==标记的文字==


### [脚注](https://github.com/markdown-it/markdown-it-footnote)

脚注一链接[^first].

脚注二链接[^second].

行内脚注^[行内脚注的内容]定义。

重复引用同一条脚注[^second].

[^first]: 脚注**可以包含格式标记**

    也可以包含多个段落。

[^second]: 脚注内容。


### [定义列表](https://github.com/markdown-it/markdown-it-deflist)

术语一

:   定义一，
下一行无需额外缩进。

带有*行内格式*的术语二

:   定义二

        { 示例代码，属于定义二 }

    定义二的第三个段落。

_紧凑样式：_

术语一
  ~ 定义一

术语二
  ~ 定义二甲
  ~ 定义二乙


### [缩写](https://github.com/markdown-it/markdown-it-abbr)

这是 HTML 缩写示例。

独立的 "HTML" 会转换为缩写标签，而 "xxxHTMLyyy" 这类单词中的片段会保持原样。

*[HTML]: 超文本标记语言

### [自定义容器](https://github.com/markdown-it/markdown-it-container)

::: warning
*这里有需要注意的内容*
:::
