# Notes：Markdown 笔记

## 实现范围

- 删除旧的 6 条占位数据及废弃的 `essaysTalks.ts`，移除对应导入和国际化入口。
- 初始演示已由 24 篇中文标题的参考测试笔记替换；来源、正文适配、发布与验证见 [渲染测试语料](notes-book-tests.md)。
- Notes 复用 `ScrollViewport` 的固定头部和底部插槽；分类栏与分页器留在面板内，只有卡片区域滚动。切换分页或分类后将卡片区滚动位置重置为顶部。
- 按用户确认保留 R2 的 `Island/notes/` 历史图片、视频，不执行本地或线上素材删除。
- 点击卡片使用 `ModalWrapper` 弹窗阅读，复用电视机动画与外侧底部居中关闭按钮；`/atrium/notes?note=<id>` 可直接打开弹窗。列表保持挂载，关闭后保留滚动位置。桌面弹窗高度固定为 `90vh`，宽度按 `4:3` 计算，取消固定像素宽度上限，仅限制不超过视口宽度减 `48px`；桌面可用宽度不足时优先保留高度，比例随可用宽度调整；手机宽高比固定为 `3:4`，受视口宽度减 `20px`、高度减 `192px` 的可用空间限制。尺寸由视口与比例决定，加载和短内容不改变尺寸。

## 文件与渲染

- 原演示笔记曾迁入 R2：`notes/46625c0b-2bd5-491e-aef9-da54e9ac3700.md`；2026-11-01 已在 24 篇新测试笔记发布并回读校验后按版本删除。前后台均从服务器读取，不内置演示条目或正文。
- `tests/fixtures/notes/markdown-demo.md` 仅供测试，不进入运行时数据源。
- 所有笔记来自 UTF-8 `.md` 文件，标题、日期、分类、可选封面与正文保存为单文件。
- Markdown 转换使用 `markdown-it`，扩展支持公式、脚注、提示容器、定义列表、任务列表及 Hexo 测试标签；原始 HTML 开关仍关闭，仅放行受控展示标签，并保留危险链接协议校验。
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
- 标签定义集中在 `src/config/noteCategories.ts`，后台镜像为 `AnuConsole/src/lib/note-categories.ts`；`test` 配置 `excludeFromAll: true`，前台 ALL 的列表、计数与分页均排除测试文章，TEST 单独展示；新增标签时同步配置即可自动更新选项、展示与文件校验，不再修改多处条件分支。旧本地草稿的 `frontend` 映射为技术、`other` 映射为日常，新文件不再接受旧标签。
- `cover`：可省略；存在时必须是线上 R2 地址。
- 无元信息的 `.md` 可通过 AnuConsole 导入，后台用文件名填充标题，并由表单补全元信息。

## 在线发布

1. 管理员进入 AnuConsole `/anutrium/notes`。
2. 导入 `.md`，或填写标题、分类、日期、可选封面与 Markdown 正文。
3. 检查实时预览，点击「发布笔记」。未发布内容保存在当前浏览器本地草稿中。
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

## 查询、编辑与删除

- AnuConsole 支持标题搜索、分类筛选、服务器正文预览和 Markdown 原文查看；只读账号只显示读取操作。
- 点击编辑后，表单载入原文件及 ETag，保存更新同一篇文章，不创建重复条目。
- 未保存内容自动保存为本地草稿，同时记录原文章 ID 与版本。刷新后恢复草稿仍使用原版本校验；切换、新建、导入或重新载入前确认未保存修改。
- 删除复用后台 `ManagementModal` 的 danger 确认框，支持取消和 Escape，不自动转移焦点。
- 修改或删除发生版本冲突时保留当前文章与草稿，要求用户查看最新服务器内容后再操作。
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
