# Notes 渲染测试语料

- 来源：[hexo-theme-book-demo](https://github.com/kaiiiz/hexo-theme-book-demo)，固定提交 `6bffcf4e80bdfe6d94fbcc7a9d155603c2c6c275`。
- 渲染方案参考：[hexo-theme-book](https://github.com/kaiiiz/hexo-theme-book) 的 `scripts/render.js`、`source/js/book-post.js`、`source/css/_components/post.scss`，以及演示仓库 `_config.yml` 的 Markdown 插件配置。
- 范围：`test/hexo-unit-test` 15 篇、`demo/render` 4 篇、`demo/lorem-ipsum` 5 篇，共 24 篇。不包含 `bugfix` 和菜单演示。
- 用户确认：标题翻译为简体中文，正文保留原文；沿用本站卡片、主题与弹窗，不替换整站视觉。

## 文件与线上发布

- `tests/fixtures/notes/book-reference/original/`：原始 Markdown，仅供对照，不进入运行时数据源。
- `tests/fixtures/notes/book-reference/published/`：适配本站文件协议的 Markdown，仅供发布与回归，不作为前端回退。
- `manifest.json`：原始路径、中文标题、固定笔记 ID、源提交和内容 SHA-256；不包含凭据。
- 文件适配：用本站 `title/date/category` 元信息替换 Hexo 元信息，日期统一为 `2026-11-01`，分类为测试（`test`），仅在 TEST 分类显示。无标题样例按用户要求补中文标题，因此保留原正文但不再测试无标题元信息的兼容。
- 正文只调整图片资源 URL，文字、语言、示例语法和代码不翻译。参考站相册样例仅展示正文，主题未输出其 `photos` 元信息；本站同样不另插图片。
- 图片统一存储于线上 R2 `note-assets/book-demo/`。6 张参考图保留原文件；`placehold.it/350x150.jpg` 当前返回 403，改为同尺寸 SVG 占位图，不声称原图逐像素一致。
- 前端仍通过线上 Worker 读取 `notes/<uuid>.md`，无内置文章列表和正文。
- 准备文件：`node scripts/import-book-note-tests.mjs`。
- 发布并替换演示：`node scripts/import-book-note-tests.mjs --publish`。密钥从现有 AnuConsole 私有环境文件载入，不打印、不保存到仓库。
- 发布采用 PUT 幂等创建，每篇成功后通过公开接口回读、比较 SHA-256；24 篇全部验证完成后，才用首次读取的 `X-Note-Version` 作为 `If-Match` 删除旧演示 `46625c0b-2bd5-491e-aef9-da54e9ac3700`。旧内容备份在 `replaced-demo.md`。

## 渲染能力

- Markdown：标题锚点、段落与换行、分割线、嵌套列表、表格对齐、引用、图片说明、链接、排版替换。
- 扩展：缩写、定义列表、表情、上下标、插入与标记、禁用状态的任务复选框、脚注与脚注提示、提示容器。
- 数学：KaTeX 行内和块级公式，关闭 `trust`，限制宏展开与尺寸；块级公式在自身区域横向滚动。
- 代码：JavaScript、TypeScript、HTML/XML、CSS、JSON 高亮；Hexo 代码块标题、来源、行号与指定行标记。
- Hexo：`blockquote`、`pullquote`、`codeblock`、`youtube`、`vimeo`、`gist`、`jsfiddle`。
- 嵌入内容只接受固定服务与合法 ID，不执行文章中的脚本；远端播放和在线示例受第三方可用性、地区网络与浏览器策略限制。验证时 JSFiddle 返回 403，不能保证内容可播放或可运行。
- YouTube 嵌入使用 `strict-origin-when-cross-origin`，按官方要求发送站点来源以避免错误 153；跨站请求不包含笔记路径和参数。其他嵌入继续使用 `no-referrer`。浏览器回归通过拦截播放器请求确认实际 `Referer` 为站点根来源。
- 原始 HTML 总开关仍关闭，只解释测试正文所需的 `u/dl/dt/dd/sup/sub/cite/acronym/abbr` 展示标签及转义后的 `title` 属性。脚本、事件属性、任意 HTML、危险链接仍被拒绝或转义。
- 脚注跳转仅滚动弹窗内部容器，不滚动背景页面。
- 此次不更改笔记文件协议、Worker 或后台鉴权；AnuConsole 编辑器自身的预览仍使用其原有渲染器。

## 验证

- `tests/note-markdown-render.spec.ts`：完整解析 24 篇文档，检查全部扩展语法及脚本、链接、属性、TeX 注入防护。
- `tests/note-reference-pages.spec.ts`：桌面和手机检查 20 + 4 条分页、真实弹窗中的代表性语法、公式溢出、脚注滚动和关闭。
- `tests/island-notes.spec.ts`：原有加载、缓存、阅读、路由和滚动回归。
- `yarn check:overlay-scroll`、`yarn test:overlay-scroll`、`yarn type-check`、`yarn build-only`。

## 2026-11-01 执行记录

- 24 篇已写入生产 R2，每篇通过公开接口回读并完成 SHA-256 比较；线上列表为 24 篇，旧演示读取为 404。
- 7 个 R2 图片资源已上传；源站失效占位图的替代处理见上文。
- 28 项桌面／手机笔记与真实弹窗回归、10 项全局弹窗滚动回归通过。类型检查、生产构建和改动文件 ESLint 检查通过。
- 已检查桌面与手机公式页面截图；长公式及代码仅在各自区域横向滚动，不撑宽弹窗。
- 本次未部署网站或 Worker；线上笔记数据已更新，新增渲染能力在当前网站工作区中完成。

- 2026-11-01 后续分类迁移：24 篇线上文章改为 `test`，公开回读校验通过；本地发布语料与哈希清单同步更新，导入脚本今后也使用测试分类。ALL 不显示这些语料，TEST 显示 20 + 4 条分页。
