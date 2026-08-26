# Anutrium Steam Worker

Steam Web API 的实时代理层。网站前端只访问 `/profile`，Steam API Key 始终保存在 Cloudflare Secret 中。

## 首次部署

```bash
cd worker
yarn install
npx wrangler login
npx wrangler secret put STEAM_API_KEY
yarn deploy
```

输入 Secret 时粘贴 Steam Web API Key。不要把 Key 写入 `wrangler.jsonc`、提交到 Git，或发送给其他人。

`wrangler.jsonc` 已将自定义域名配置为：

```text
https://anutrium-steam-api.tilucario.workers.dev
```

Cloudflare 账户必须已经接入 `anuluca.com` 域名。部署后验证：

```bash
curl https://anutrium-steam-api.tilucario.workers.dev/health
curl https://anutrium-steam-api.tilucario.workers.dev/profile
```

## 本地开发

```bash
cd worker
cp .dev.vars.example .dev.vars
```

在 `.dev.vars` 中填写本地测试 Key，然后运行：

```bash
yarn dev
```

`.dev.vars` 已被根目录 `.gitignore` 的 `*.local` 规则之外单独忽略。
