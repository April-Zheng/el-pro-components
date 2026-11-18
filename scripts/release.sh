#!/usr/bin/env bash
# 发版一条龙：升版本 → 提交 → 确认 → 发布 → 推送 tag。
#
# 为什么值得写成脚本：这几步的顺序有依赖——tag 指向 HEAD，所以「升版本 + 生成 CHANGELOG」的
# 提交必须发生在发布之前；而 changeset publish 只在发布成功后才打 tag。顺序错了要回滚两次。
#
# 用法（Windows 上在 Git Bash 里跑）：
#   bash scripts/release.sh
#
# 发布那次不可撤销，脚本会停下来等你按 y。
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

die() {
  printf '\n✗ %s\n' "$1" >&2
  exit 1
}

# ── 前置检查：按「出错最便宜」排序，让失败停在最早能解释清楚的那一步
current_branch=$(git rev-parse --abbrev-ref HEAD)
[ "$current_branch" = "main" ] || die "当前在 $current_branch 分支。发版只在 main 上做。"

[ -z "$(git status --porcelain)" ] || die "工作区不干净。先提交或 stash，再发版。"

[ -x node_modules/.bin/changeset ] || die "changeset 没装。先跑 npm install。"

pending=()
# 没有匹配时 glob 会原样返回字面量 `*.md`，边界会假阳性地说「有待升 changeset」。
shopt -s nullglob
for f in .changeset/*.md; do
  if [ "$(basename "$f")" = "README.md" ]; then
    continue
  fi
  pending+=("$f")
done
[ "${#pending[@]}" -gt 0 ] || die "没有待发布的 changeset。先跑 npm run changeset 记一条。"

# 登录检查放最后：它是本机最常见的缺失项，放前面会把其它问题都遮在后面
npm whoami >/dev/null 2>&1 || die "npm 未登录。先跑 npm login。"

# ── 升版本
printf '\n▸ 升版本（读 %d 条 changeset）\n\n' "${#pending[@]}"
npm run release:version

version=$(npm pkg get version | tr -d '"')

printf '\n▸ 新版本 %s，CHANGELOG 新增段落：\n\n' "$version"
# 只打印第一个 ## 段落：后面的历史段落与本次无关
awk 'seen && /^## / { exit } /^## / { seen = 1 } seen' CHANGELOG.md

printf '\n▸ 即将提交的改动：\n\n'
git status --short

git add -A
git commit -m "chore: release v$version"

# ── 发布前停手
printf '\n────────────────────────────────────────────\n'
printf '提交已完成，下面两步不可撤销：\n\n'
printf '  npx changeset publish    把 v%s 发布到 npm（会跑完整 verify，几分钟）\n' "$version"
printf '  git push --follow-tags   推送提交与 tag v%s\n' "$version"
printf '\n不继续的话，版本提交已在本地，撤销：git reset --hard HEAD~1\n'
printf '────────────────────────────────────────────\n'
# 无 stdin（管道、CI、`< /dev/null`）时 read 返回非零，set -e 会直接把脚本杀掉——
# 那时版本提上刚做完，却静默退出、一句提示都没有。空回答一律当「不发布」。
reply=""
read -r -p '继续发布？[y/N] ' reply || true

case "$reply" in
  [yY] | [yY][eE][sS]) ;;
  *)
    printf '\n已停在发布之前。v%s 已提交但未发布。\n' "$version"
    printf '  撤销：git reset --hard HEAD~1\n'
    printf '  稍后要发布：npx changeset publish && git push --follow-tags\n'
    exit 0
    ;;
esac

# ── 发布与推送
if ! npx changeset publish; then
  printf '\n✗ 发布失败。v%s 已提交，但 npm 上还没有它。\n' "$version" >&2
  printf '  常见原因：npm 认证失效、网络、prepublishOnly 里的 verify 有红项。\n' >&2
  printf '  修好后重跑：npx changeset publish\n' >&2
  printf '  重跑不会重复升版本——它按 registry 上是否已有该版本判断。\n' >&2
  exit 1
fi

git push --follow-tags || die "发布成功，但推送失败。补推：git push --follow-tags"

printf '\n✓ 已发布 v%s：https://www.npmjs.com/package/el-pro-components/v/%s\n' "$version" "$version"
printf '  提交与 tag v%s 已推送。\n\n' "$version"
