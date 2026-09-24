# Anutrium Profile Worker

Steam Web API 与 GitHub GraphQL API 的代理层。网站前端只访问 Worker，Steam API Key 和 GitHub Token 始终保存在 Cloudflare Secret 中。

## 接口

- `GET /profile`：Steam 资料。
- `GET /github/contributions`：GitHub 用户近一年的贡献日历，默认缓存 6 小时。

## 首次部署

```bash
cd worker
yarn install
npx wrangler login
npx wrangler secret put STEAM_API_KEY
npx wrangler secret put GITHUB_TOKEN
yarn deploy
```

输入 Secret 时分别粘贴 Steam Web API Key 和 GitHub Personal Access Token。不要把 Token 写入 `wrangler.jsonc`、提交到 Git，或发送给其他人。

GitHub Token 建议使用仅供此站点使用的 fine-grained personal access token，并设置到期时间。只展示公开贡献时不要授予仓库权限；需要计入已公开的私有贡献数量时，使用 classic token 并授予 `read:user`。

`wrangler.jsonc` 已将自定义域名配置为：

```text
https://steam-api.anuluca.com
```

Cloudflare 账户必须已经接入 `anuluca.com` 域名。部署后验证：

```bash
curl https://steam-api.anuluca.com/health
curl https://steam-api.anuluca.com/profile
curl https://steam-api.anuluca.com/github/contributions
```

## 本地开发

```bash
cd worker
cp .dev.vars.example .dev.vars
```

在 `.dev.vars` 中填写本地测试 Key 和 Token，然后运行：

```bash
yarn dev
```

`.dev.vars` 已被根目录 `.gitignore` 的 `*.local` 规则之外单独忽略。
