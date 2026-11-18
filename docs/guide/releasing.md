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

## 二、发版

前提：在 `main`、工作区干净、与远端已同步。

```bash
npm run release:version     # 升版本号 + 写 CHANGELOG + 同步锁文件
git diff package.json CHANGELOG.md
V=$(npm pkg get version | tr -d '"')
git add -A && git commit -m "chore: release v$V"
npx changeset publish       # 发布到 npm，成功后自动打注释 tag
git push --follow-tags
```

`npm run release:version` 做三件事：把 `version` 升到 changeset 汇总出的版本、在 `CHANGELOG.md` 顶部插入该版本段落、把 `package-lock.json` 两处根 version 一起同步。第三件事不能省——`changeset version` 自己不动锁文件，不同步的话 `npm ci` 不会失败，但锁文件会开始描述一个不存在的版本。

版本提交要在发布之前，因为 tag 指向 HEAD，HEAD 得先包含新版本号与 CHANGELOG。

## 三、`npx changeset publish` 实际跑了什么

- 只发布 npm 上还不存在的版本；已经是线上版本就跳过。
- 因此会触发 `prepublishOnly`，也就是完整的 `npm run verify`：`typecheck` → `test` → `build` → `smoke` → `build:demo`。**几分钟没输出属于预期**，不是卡住。
- 发布成功后才执行 `git tag v<version> -m v<version>`，是注释 tag。顺序是刻意的：`npm publish` 是整条链路里唯一不可撤销的动作，git 侧永远在它成功之后才写，所以不会出现「tag 指向 npm 上不存在的版本」。
- 单包仓库的 tag 是 `v<version>`，不是 `<包名>@<版本>`（后者的 monorepo 形式）。既有 `v0.1.0` / `v0.2.0` 也是这个形式。
- 注释 tag 不是形式主义：`git push --follow-tags` 只推注释 tag，轻量的那种它不推。

发版前想先看会升到哪个版本、有哪些条目：

```bash
npx changeset status --verbose
```

## 四、漏记一条 changeset 会怎样

不会报错。工具无法判断哪些改动「本该」有记录：一条记录都没有时 `npm run release:version` 会直接失败，但只要本次已有别的 changeset，漏掉的那条就静默缺席 CHANGELOG。

所以发版前对一遍这段时间的提交：

```bash
git log --oneline --no-merges $(git describe --tags --abbrev=0)..HEAD
```

## 五、两种失败状态

**已升版本、已提交，发布失败**（网络、`npm whoami` 认证、`verify` 挂了）：修好原因后直接重跑 `npx changeset publish`。它按 registry 上有没有这个版本判断，不会因为版本号已经是新值就跳过。

如果这时才发现级别升错了：`git reset --hard HEAD~1` 回到升版本之前，改 `.changeset/` 里的 md，再重跑 `npm run release:version`。

**已发布，但 git 还没推**：`git push --follow-tags` 补推。别再跑 publish，它会发现没有待发布的版本、什么都不做。

## 六、刻意不做的事

- **不自动发版**。CI 只跑质量闸门与文档部署，不持有 `NPM_TOKEN`，发布只在本地手动执行。
- **不改写 `v0.1.0` / `v0.2.0` tag**，也不回填这两版的 CHANGELOG。它们的版本号是手改的、没有变更记录，补写只能靠人读 commit 归纳；`git log` 仍是准的来源。
- **不发 GitHub Release**。CHANGELOG 与 tag 已经回答了「这一版改了什么」。
