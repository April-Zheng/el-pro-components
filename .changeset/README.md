# Changesets

这个目录存的是「待发版的变更记录」：改完会进入包的改动，跑 `npm run changeset` 写一条；发版时 `npm run release:version` 把它们汇总成版本号与 `CHANGELOG.md` 段落。完整流程见 [发版](/guide/releasing)，上游文档见 <https://changesets.dev>。

## config.json 为什么只有两个键

其余键都是 `@changesets/config` 的默认值——`baseBranch: main`、`changelog: @changesets/cli/changelog`、`commit: false`、空 `fixed`/`linked`/`ignore`。写出来只会让以后升级时多几处要对照，行为完全一样。

真正非默认的只有一个：`access: public`。包本来就公开发布在 npm 上，默认值 `restricted` 会让首次发布报 402。

`commit: false` 的含义是**工具不会自己提交**，不影响 CHANGELOG 里的 hash：升版本时 `@changesets/apply-release-plan` 会反查「添加该 changeset 文件的那次提交」，把 7 位 hash 写进条目。所以 changeset 文件必须和代码一起提交、且早于升版本——没提交过的那条，CHANGELOG 里就只剩摘要、没有 hash。
