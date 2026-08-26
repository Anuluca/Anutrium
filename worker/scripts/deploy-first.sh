#!/usr/bin/env bash

set -euo pipefail

if [[ ! -t 0 ]]; then
  echo "请在交互式终端中运行 yarn deploy:first。" >&2
  exit 1
fi

read -r -s -p "请粘贴 Steam Web API Key（输入不会显示），然后按回车：" STEAM_API_KEY
printf '\n'

if [[ -z "${STEAM_API_KEY}" ]]; then
  echo "Steam Web API Key 不能为空。" >&2
  exit 1
fi

# 新 Worker 无法预先写入 Secret，因此首次部署使用权限为 600 的临时文件；
# 无论部署成功或失败，退出时都会删除文件并清空当前 Shell 中的变量。
secret_file="$(mktemp "${TMPDIR:-/tmp}/anutrium-steam-secrets.XXXXXX")"
chmod 600 "${secret_file}"
cleanup() {
  rm -f "${secret_file}"
  unset STEAM_API_KEY
}
trap cleanup EXIT

printf 'STEAM_API_KEY=%s\n' "${STEAM_API_KEY}" > "${secret_file}"
npx wrangler deploy --secrets-file "${secret_file}"
