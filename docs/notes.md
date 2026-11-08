# Notes：Markdown 笔记

## 实现范围

- 删除旧的 6 条占位数据及废弃的 `essaysTalks.ts`，移除对应导入和国际化入口。
- 初始演示已由参考测试笔记替换（当前线上 16 篇、本地回归语料 18 篇）；来源、正文适配、发布与验证见 [渲染测试语料](notes-book-tests.md)。
- Notes 复用 `ScrollViewport` 的固定头部和底部插槽；分类栏与分页器留在面板内，只有卡片区域滚动。切换分页或分类后将卡片区滚动位置重置为顶部。
- 按用户确认保留 R2 的 `Island/notes/` 历史图片、视频，不执行本地或线上素材删除。
- 点击卡片使用 `ModalWrapper` 弹窗阅读，复用电视机动画与外侧底部居中关闭按钮；`/atrium/notes?note=<id>` 可直接打开弹窗。列表保持挂载，关闭后保留滚动位置。桌面弹窗以 `16:9` 按视口最大可用宽高铺开，无固定像素宽度上限，并为窗口外关闭按钮预留空间。手机列表每行两张卡片；详情按 `100dvh` 铺满可用高度，上、左、右各留 `8px` 并避让安全区域，底部预留 `76px` 与底部安全区域。关闭按钮位于弹窗下方 `12px`，点击区域 `44px`，下方留 `20px`；阅读期间隐藏底部移动端提示，避免遮挡关闭按钮。加载和短内容不改变弹窗尺寸。

## 文件与渲染

- 原演示笔记曾迁入 R2：`notes/46625c0b-2bd5-491e-aef9-da54e9ac3700.md`；2026-11-01 已在 24 篇新测试笔记发布并回读校验后按版本删除。前后台均从服务器读取，不内置演示条目或正文。
- `tests/fixtures/notes/markdown-demo.md` 仅供测试，不进入运行时数据源。
- 所有笔记来自 UTF-8 `.md` 文件，标题、日期、分类、可选封面与正文保存为单文件。
- Markdown 转换使用 `markdown-it`，扩展支持公式、脚注、提示容器、定义列表、任务列表及 Hexo 测试标签；原始 HTML 开关仍关闭，仅放行受控展示标签，并保留危险链接协议校验。AnuConsole 的实时预览与查看弹窗通过 `scripts/sync-note-preview.mjs` 使用网站同源的渲染器、正文样式和字体，可用 `--check` 校验一致性。
- 内容通过 `parseNoteDocument` 校验。文件最大 256 KiB，YAML 元信息最大 4 KiB，禁止别名、重复字段、未知字段和无效日期。
- `AnuConsole/src/lib/note-document.ts` 与网站 `src/utils/noteDocument.ts` 使用相同协议；修改协议与标签配置时同步两端并运行测试。

```markdown
---
title: "Vue 组件记录"
date: "2026-10-31"
category: technology
cover: "https://assets.anuluca.com/path/to/image.jpg"
---

## 问题

记录问题与解决过程。
```

- `category`：`technology`（技术）、`pokemon`（宝可梦）、`daily`（日常）、`test`（测试）。
- 标签定义集中在 `src/config/noteCategories.ts`，后台镜像为 `AnuConsole/src/lib/note-categories.ts`；`test` 配置 `excludeFromAll: true`，前台 ALL 的列表、计数与分页均排除测试文章，TEST 单独展示；新增标签时同步配置即可自动更新选项、展示与文件校验，不再修改多处条件分支。新文件不接受旧的 frontend／other 标签。
- `cover`：可省略；存在时必须是线上 R2 地址。
- 无元信息的 `.md` 可通过 AnuConsole 导入，后台用文件名填充标题，并由表单补全元信息。

## 在线发布

1. 管理员进入 AnuConsole `/anutrium/notes`。
2. 导入 `.md`，或填写标题、分类、日期、可选封面与 Markdown 正文。
3. 检查实时预览，点击「发布笔记」。不保存本地草稿，关闭编辑弹窗或刷新会丢弃尚未提交的内容。
4. 后台执行 `requireAdmin()` 与同源校验，通过服务端请求 Worker；只读账号仅可读取列表。
5. Worker 复用 `HOME_FEATURES_TOKEN` 鉴权，将原始文件写入 `notes/<uuid>.md`。同一次 R2 写入附带列表索引元数据，不创建独立 JSON 索引。
6. 新增通过 PUT，相同 ID 与内容的重试保持幂等。编辑通过 PATCH，必须携带读取时的实体标签（ETag）；版本不匹配返回 412，不覆盖服务器内容。
7. 前台刷新后读取在线列表，按日期倒序展示；笔记详情不提供下载按钮。

## 接口

| 接口 | 权限 | 用途 |
| --- | --- | --- |
| `GET /notes?cursor=...` | 公开 | 每页最多 100 条元数据及 `nextCursor` |
| `GET /notes/<uuid>` | 公开 | 原始 Markdown 文件 |
| `GET /admin/notes?cursor=...` | 管理令牌 | 后台列表 |
| `GET /admin/notes/<uuid>` | 管理令牌 | 后台读取文件 |
| `PUT /admin/notes/<uuid>` | 管理令牌 | 新增文件；`Content-Type: text/markdown` |
| `PATCH /admin/notes/<uuid>` | 管理令牌 | 编辑文件；Markdown 请求体与 `If-Match` 版本头 |
| `DELETE /admin/notes/<uuid>` | 管理令牌 | 删除文章；必须携带 `If-Match` |

- 列表与正文的 HTTP 请求禁用缓存。客户端共享笔记列表与进行中的请求，内存缓存有效期为 60 秒；组件挂载、窗口重新获得焦点或页面恢复可见时检查有效期，过期后后台更新并保留已有卡片。短时间页面内往返不重复请求；空列表同样遵循有效期。列表客户端持续读取 `nextCursor`，避免超过一页后遗漏笔记。
- 前台生产使用 Netlify `/api/notes` 同源代理；开发直接读取线上 Worker，不使用本地文件回退。
- 服务异常时保留已读列表并显示重试入口；首次读取失败或服务器返回空列表时，不生成本地笔记；不存在的文件显示明确错误。

## 分类直达链接

- ALL：`/atrium/notes?category=all`（省略参数同样显示 ALL，排除测试文章）。
- TECHNOLOGY：`/atrium/notes?category=technology`。
- POKÉMON：`/atrium/notes?category=pokemon`。
- DAILY：`/atrium/notes?category=daily`。
- TEST：`/atrium/notes?category=test`。
- 点击分类使用路由历史记录，刷新与前进／后退会恢复对应分类；无效或重复的分类参数回退为 ALL。切换分类重置为第一页。
- 从分类列表打开笔记时保留 `category`、其他查询参数与 URL hash；关闭弹窗只移除 `note`，不重置当前分类和列表位置。

## 查询、编辑与删除

- AnuConsole 支持标题搜索、分类筛选、服务器正文预览和 Markdown 原文查看；只读账号只显示读取操作。
- 点击编辑后，表单载入原文件及 ETag，保存更新同一篇文章，不创建重复条目。
- 编辑期间保留原文章 ID 与版本；不保存或恢复本地草稿。编辑／新增仅通过按钮打开桌面 16:9／手机 3:4 弹窗，发布按钮固定在底部，预览栏与网站共用渲染器。封面只填写 R2 路径，保存时补全固定资源域名，文件中仍为完整 URL。
- 删除复用后台 `ManagementModal` 的 danger 确认框，支持取消和 Escape，不自动转移焦点。
- 修改或删除发生版本冲突时保留当前文章与窗口内编辑内容，要求用户查看最新服务器内容后再操作。
- Worker 正文／写入响应使用 `X-Note-Version` 保留 R2 原始 ETag；后台代理和编辑器优先读取该版本头。CDN 压缩可能将 HTTP `ETag` 转为弱标记，不能直接用于强版本校验。[Cloudflare ETag 说明](https://developers.cloudflare.com/cache/reference/etag-headers/)
- R2 的 `delete()` 没有条件删除参数，因此 DELETE 使用带 ETag 条件的单次 `put()` 清空正文，并仅保留无正文的删除标记。公开／管理读取均返回 404，列表排除该条目，旧 ID 不能重新创建；不提供恢复功能。
- 条件写入在存储层检查版本，避免「先检查、再无条件删除」的并发窗口。[R2 条件操作参考](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/#conditional-operations)

## 部署顺序

1. 发布 `worker`（复用现有 R2 绑定与 `HOME_FEATURES_TOKEN`，无需新建数据库）。
2. 发布网站，使 Netlify 的 `/api/notes` 代理生效。
3. 发布 AnuConsole；服务端 `HOME_FEATURES_TOKEN` 必须与 Worker 一致，`HOME_FEATURES_URL` 沿用现有配置并只取其域名。
4. 在线新增一篇实际笔记，核验前台列表、正文与下载内容。

2026-10-31 已按用户要求发布生产 Worker `anutrium-steam-api`，版本为 `932cd058-cf1f-4441-b79e-c54aec29ca74`。网站与 AnuConsole 尚未发布。同日按用户要求将演示笔记通过管理接口写入真实 R2，并以逐字节回读及 SHA-256 校验确认内容一致。自动化写入测试仍使用隔离的 Miniflare R2。

线上验证通过：`/health` 200、`/notes` 200（已包含服务器演示笔记）、未鉴权 `/admin/notes` 401、使用 AnuConsole 管理密钥读取 `/admin/notes` 200、不存在的文件 404、`/site/home-features` 200，以及本地 3000 来源的跨域响应。

## 验证记录

- 网站：`yarn type-check`、`yarn build-only`。
- Worker：在 `worker` 目录运行 `npx tsc --noEmit` 与 `node --test tests/notes.test.mjs`，8 项通过；覆盖权限、文件校验、实际 R2 存储、重复提交、102 条记录分页、版本冲突与并发编辑、条件删除后不可读取或重新创建，以及三个新标签与旧标签拒绝校验。
- 前台：`npx playwright test --config=playwright.audit.config.ts tests/island-notes.spec.ts`，桌面与手机共 14 项通过；复用 3000 端口现有服务。
- AnuConsole：`npm run typecheck`、`npm test`（49 项通过）、`npm run build`。
- 后台编辑器：在 Chromium 中独立挂载真实 React 组件并模拟接口，1440px 与 390px 验证导入、预览、发布、列表刷新、只读状态与无横向溢出。
- AnuConsole 删查改：复用现有 3002 服务，`PLAYWRIGHT_CHANNEL=chrome npx playwright test tests/notes.spec.ts --project=desktop --project=mobile`，桌面与手机共 12 项通过；所有新增／修改／删除请求均由测试模拟，不操作真实笔记。
- 前台弹窗：`yarn check:overlay-scroll` 通过；Notes 的 12 项回归覆盖正文链接直达、ESC／关闭按钮／浏览器返回，以及列表滚动、内容锚点和 body 宽度偏移不超过 1px。
- 通用滚动回归：`yarn test:overlay-scroll --config=playwright.audit.config.ts` 的 10 个用例均通过，但系统 Chrome 测试工作进程退出超时导致命令退出码为 1。随后用已安装 Chromium、仅连接现有服务的临时配置复跑，9 项通过，桌面页脚用例出现关闭后 About 锚点缺失；该页脚用例单独重跑通过。未修改其他页面或测试以绕过该问题。
- 2026-10-31 已发布支持新标签和条件编辑／删除的 Worker，并通过版本校验将服务器演示笔记从 `frontend` 迁移至 `technology`，仅修改 category 字段；网站与 AnuConsole 最新代码尚未部署。未进行 Safari 真机验证。

## 标签迁移记录

- 2026-10-31：生产 Worker 更新为 `74a241f8-7440-486e-89af-60ddbafe38c9`，支持技术／宝可梦／日常标签与独立 `X-Note-Version` 版本头。
- 演示笔记 `46625c0b-2bd5-491e-aef9-da54e9ac3700` 的服务器文件已从 `category: frontend` 改为 `category: technology`，逐字节验证其余内容不变。
- 验证：前台 14 项、AnuConsole 页面 12 项、后台单元测试 49 项、Worker 测试 15 项、两端构建通过；实际 R2 数据在网站卡片、详情和后台列表均显示“技术”。

## 2026-11-01：测试分类迁移

- 新增 `test`（测试／TEST）；配置 `excludeFromAll: true`，ALL 的列表、数量和分页排除该分类。其余分类与新建笔记的默认分类保持不变。
- 同步 AnuConsole 分类配置、Worker 校验及 24 篇渲染语料与 SHA-256 清单。
- 生产 Worker 版本：`c4779844-e86e-4ba9-ba4e-b107ca2f1ccb`。
- 线上原有 24 篇文章均通过 PATCH + 原始 `X-Note-Version` 更新为 `category: test`，逐篇公开回读并核对 SHA-256；只改变分类行，正文、标题、日期与封面不变。
- 原文、更新文件、版本与逐篇验证结果备份于忽略提交的 `.tmp/notes-test-category-2026-10-31T18-23-00-397Z/`。备份不包含管理密钥。迁移脚本：`scripts/migrate-notes-test-category.mjs`，先 `--prepare` 生成计划，再 `--apply <plan.json>` 按版本更新，版本冲突时停止。
- 校验：网站与后台类型检查、后台文件协议 5 项、Worker 8 项、前台筛选／渲染 8 项通过。Worker 已部署，网站与后台界面代码保留在各自工作区。

- Notes 列表每页 12 篇；卡片网格底部预留 32px 源码间距（按现有 px→rem 规则缩放），留白随列表滚动，分类栏与分页器固定。

- Notes 进度条仅覆盖标签栏与分页器之间的滚动区，内容右侧保留 16px 间距。ScrollViewport 内嵌进度条使用布局偏移测量，避免 CRT 入场缩放影响坐标；测量复用 useFrameTask 合并。

- 详情头部顺序为大标题在上、标签与日期在下，正文与后台查看／编辑预览一致；标题与元信息之间保留 8px 间距。
- 阅读入场：保留 ModalWrapper 电视机开窗；标题模块初始目标 1.6 倍居中，整块标题采用 4% 高度柔边从下向上擦入，无额外延迟、持续 1.8 秒，缓动采用参考页的 (0.496, 0.004, 0, 1)。标题擦入收尾时（时间轴第 1.08 秒）标签先快速闪烁两下，再播放日期的两次闪烁（各 0.28 秒），完整停留 0.4 秒，再用 0.8 秒上移缩小归位，最后开始正文入场，长标题限制在可视范围。正文采用首屏语义块轻错峰入场。
- `src/utils/noteEntrance.ts` 为两端共用控制器；正文直接对首屏顶层语义块做 0.4 秒淡入与 8px 上移，相邻错峰约 40ms，总错峰不超过 200ms；引用、列表、表格、代码与公式保持完整，后续内容直接可见。不再使用 SplitText 或逐段滚动触发。
- 窗口尺寸改变、减少动态效果或入场期间滚动时恢复自然排版；关闭清理动画与尺寸观察器。后台仅查看弹窗播放整套入场，编辑实时预览即时更新。

- 重开入场由弹窗 active 状态触发，不依赖文章 ID／正文变化；关闭退场期间保留阅读器和当前画面，快速重开相同文章也重新创建动画。开窗后一帧再读取动画与初始尺寸，避免隐藏容器恢复尺寸被误判为缩放中断。


## 笔记隐藏

- AnuConsole 列表提供「隐藏」开关，点击即按当前 ETag 条件保存；新建／编辑表单也可设置，随发布／保存提交。默认关闭，旧文件缺少字段时保持显示。
- Markdown 元信息新增可选 `hidden: true/false`，隐藏状态随正文一次写入 R2，并同步列表索引。隐藏后公开列表排除该笔记，公开详情返回 404；后台仍可查看、编辑、删除或关闭隐藏开关恢复显示。
- 版本冲突时不更新开关，保留服务器内容并提示刷新；仅管理员可写入，沿用同源校验和原始 `X-Note-Version`。
- Anutrium 刷新后读取最新状态；已打开页面仍遵循原有 60 秒列表缓存。需先部署支持此字段的 Worker，再发布 AnuConsole。

## 正文内容块

正文支持以下受控扩展，仍保存为单个 `.md`，无需新增元信息或数据库。AnuConsole「插入内容块」可在正文选区处生成语法；也可导入包含该语法的文件。图片列表在网站复用 `MediaGallery`（网格／预览切换、原图查看），分组栏复用 Notes 分类使用的 `FilterRail`。后台共享解析器，提供可切换分组的缩略图预览。

```markdown
::::: tabs

:::: tab 分组一

::: gallery
![图片说明](https://assets.anuluca.com/Island/notes/example.jpg)
:::

::::

:::: tab 分组二

普通 Markdown 正文。

::::

:::::

::: tool-card
[工具名称](https://example.com/)

工具说明，可使用普通 Markdown。
:::
```

- 外层分组使用 5 个冒号、单页使用 4 个、图片列表使用 3 个；结束标记必须与所属块的冒号数量对应。
- 图片列表只接受线上 R2 图片；图注取自图片替代文本。混入其他正文时回退为普通 Markdown，避免丢失内容。
- 工具卡为受控 Markdown 展示块，链接沿用现有协议校验，不接受 Vue 模板、脚本或任意 HTML。
- 未闭合块按普通 Markdown 显示；嵌套最多解析 8 层。语法解析基于块规则，代码围栏内的标记不会触发内容块。
- 新增日志源文件为 `docs/notes/corocoro-pokemon.md`：保留参考文章 40 张图片及顺序，分为 BW、BW2、XY、ORAS、SM、假图六组；运行时仍从 Worker／R2 读取，不导入本地正文。

2026-11-02 已通过 AnuConsole 的同源管理接口新增《Corocoro宝可梦情报》，分类 `pokemon`，封面为 `Island/notes/pokemonCorocoro/BW2/IMG_2129.jpg`。文章 ID 为 `a12ee06a-a95f-4cbc-9b65-ff71bbca5371`；公开接口逐字节回读、列表分类／封面校验以及 40 张线上原图的 HTTP 200 检查均通过。发布回执见 `notes/corocoro-pokemon.publication.json`。网站与后台的内容块代码需随各自应用部署生效。

内容块验证：网站 `yarn type-check`、`yarn build-only`、受影响文件 ESLint、两端预览同步检查均通过；新增内容块桌面／手机共 4 项测试通过，原有 18 篇语料与安全渲染测试通过，`yarn check:overlay-scroll` 和 `yarn test:overlay-scroll --config=playwright.audit.config.ts`（10 项）通过。本地使用真实线上笔记与 R2 缩略图检查，六个分组正常，浏览器无未捕获错误。后台另完成桌面、手机 Chromium 与手机 WebKit 的插入及刷新回归；未进行 Safari 真机验证。

原有 Notes 列表、阅读器和前后篇导航的桌面／手机回归共 52 项全部通过（`tests/island-notes.spec.ts`、`tests/note-navigation.spec.ts`）。

### 简易联系栏

正文插入空的 `::: social-links` / `:::` 块，可复用 `FooterSocialLinkBar`，仅显示微信、邮箱、微博、B 站，按该顺序排列。微信沿用复制／唤起逻辑，微博在新窗口打开个人主页；不包含游戏平台。后台预览使用同源联系方式配置展示链接和微信号，配置随预览同步脚本生成，不单独维护副本。

《Corocoro宝可梦情报》已按作者要求移除来源声明与两段导语，替换为「如有遗漏欢迎讨论补充」及上述联系栏。

联系栏可使用 `::: social-links 如有遗漏欢迎补充` 添加同一行的说明文字，结束标记仍为 `:::`。说明与组件垂直居中，颜色由联系栏自身管理，阅读器的普通链接颜色不覆盖该组件。《Corocoro宝可梦情报》的联系行位于整个图片分组块之后。

标题与正文滚动按顺序衔接：首次竖向滚轮、触屏滑动或键盘翻页先触发标题收起，标题过渡结束后才将暂存位移交给正文；同一次触屏手势的后续移动可继续滚动，之后的手势保留原生惯性。回到顶部向上滑动时恢复展开，关闭、重开和切换笔记时清理输入队列。减少动态效果模式直接交接，不等待动画。


### 图片速览表格

使用标准 Markdown 表格排列缩略图；图片可用 `<abbr title="作品与获取条件">![编号 名称](线上 R2 地址)</abbr>` 包裹说明。纯图片表格显示为有边框的紧凑表格，缩略图使用 96px 尺寸；悬停或键盘聚焦时在顶层显示提示框，避免被正文滚动区域裁切。
