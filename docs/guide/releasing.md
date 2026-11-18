# 发版

版本号、`CHANGELOG.md`、git tag 三件事都由 [changesets](https://changesets.dev) 从入库的变更记录里算出来，不靠记忆判断这一版该升 minor 还是 patch。

## 一、改代码时：先记一条变更

```bash
npm run changeset
```

交互里选级别、写一句中文说明，生成 `.changeset/<随机词>-<随机词>-<随机词>.md`：

```md
---
"el-pro-components": minor
---

ElProRichText：Quill 2 封装，支持图片上传注入与粘贴/拖拽管道
```

级别：`patch` 修 bug 且不改公开 API 语义；`minor` 加能力且旧用法仍成立；`major` 破坏性变更（0.x 阶段留给第一次正式发布）。写完和代码一起提交。

**级别写错不用重来**，那个 md 就是纯文本，发版前改字即可。

## 二、发版：跑一个脚本

```bash
bash scripts/release.sh
```

Windows 上要在 **Git Bash** 里跑（`npm run` 在 cmd 下解析不到 bash）。

脚本依次做这些，任一步失败就停下并说明原因：

1. 前置检查：在 `main`、工作区干净、`changeset` 已装、有待升 changeset、npm 已登录
2. 升版本号、生成 `CHANGELOG.md` 段落、同步 `package-lock.json`
3. 打印新版本号的 CHANGELOG 段落与待提交的改动清单
4. 提交 `chore: release v<version>`
5. **停下问 `y/N`**
6. `npx changeset publish` 发布，成功后自动打 `v<version>` 注释 tag
7. `git push --follow-tags` 推提交与 tag

**停手点在提交之后、发布之前**，这是刻意的：发布不可撤销，得由一次明确的回车守住；而先把版本提交做掉，答 `n` 时的状态就是干净的「已提交未发布」，撤销只要 `git reset --hard HEAD~1`，不会留下一堆半成品文件。

## 三、脚本背后实际发生了什么

- **`npm run release:version`** 做三件事：把 `version` 升到 changeset 汇总出的版本、在 `CHANGELOG.md` 顶部插入该版本段落、把 `package-lock.json` 两处根 version 一起同步。第三件不能省——`changeset version` 自己不动锁文件，不同步的话 `npm ci` 不会失败，但锁文件会开始描述一个不存在的版本。
- **版本提交必须在发布之前**，因为 tag 指向 `HEAD`，`HEAD` 得先包含新版本号与 CHANGELOG。
- **`npx changeset publish`** 只发布 npm 上还不存在的版本，已经是线上版本就跳过。因此它会触发 `prepublishOnly`，也就是完整的 `npm run verify`：`typecheck` → `test` → `build` → `smoke` → `build:demo`。**几分钟没输出属于预期**，不是卡住。
- **tag 在发布成功后才打**，所以不会出现「tag 指向 npm 上不存在的版本」。单包仓库的 tag 是 `v<version>`，不是 `<包名>@<版本>`（后者是 monorepo 形式）。注释 tag 也不是形式主义：`git push --follow-tags` 只推注释 tag，轻量的那种它不推。

## 四、不想用脚本时的手工等价步骤

```bash
npm run release:version          # 升版本 + 写 CHANGELOG + 同步锁文件
git diff package.json CHANGELOG.md
V=$(npm pkg get version | tr -d '"')
git add -A && git commit -m "chore: release v$V"
npx changeset publish            # 发布，成功后自动打 tag
git push --follow-tags
```

发版前想先看会升到哪个版本、有哪些条目：

```bash
npx changeset status --verbose
```

## 五、漏记一条 changeset 会怎样

不会报错。工具无法判断哪些改动「本该」有记录：一条记录都没有时 `npm run release:version` 会直接失败（脚本会先把这种情况拦在前置检查里），但只要本次已有别的 changeset，漏掉的那条就静默缺席 CHANGELOG。

所以发版前对一遍这段时间的提交：

```bash
git log --oneline --no-merges $(git describe --tags --abbrev=0)..HEAD
```

## 六、两种失败状态

**已升版本、已提交，发布失败**（网络、`npm whoami` 认证、`verify` 挂了）：修好原因后直接重跑 `npx changeset publish`。它按 registry 上有没有这个版本判断，不会因为版本号已经是新值就跳过。脚本在这种情况下会打印同样的话并退出。

如果这时才发现级别升错了：`git reset --hard HEAD~1` 回到升版本之前，改 `.changeset/` 里的 md，再重跑。

**已发布，但 git 还没推**：`git push --follow-tags` 补推。别再跑 publish，它会发现没有待发布的版本、什么都不做。

## 七、刻意不做的事

- **不自动发版**。CI 只跑质量闸门与文档部署，不持有 `NPM_TOKEN`，发布只在本地手动执行。
- **不改写 `v0.1.0` / `v0.2.0` tag**，也不回填这两版的 CHANGELOG。它们的版本号是手改的、没有变更记录，补写只能靠人读 commit 归纳；`git log` 仍是准的来源。
- **不发 GitHub Release**。CHANGELOG 与 tag 已经回答了「这一版改了什么」。
- **脚本不做 `git fetch`**，也不检查是否落后远端。发版前自己确认本地与远端同步；落后时会在最后推送那步失败，重试即可。
