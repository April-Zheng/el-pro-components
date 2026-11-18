# Changesets

这个目录存的是「待发版的变更记录」：改完会进入包的改动，跑 `npm run changeset` 写一条；发版时 `npm run release:version` 把它们汇总成版本号与 `CHANGELOG.md` 段落。完整流程见 [发版](/guide/releasing)，上游文档见 <https://changesets.dev>。

## config.json 为什么只有两个键

其余键都是 `@changesets/config` 的默认值——`baseBranch: main`、`changelog: @changesets/cli/changelog`、`commit: false`、空 `fixed`/`linked`/`ignore`。写出来只会让以后升级时多几处要对照，行为完全一样。

真正非默认的只有一个：`access: public`。包本来就公开发布在 npm 上，默认值 `restricted` 会让首次发布报 402。

`commit: false` 值得记住后果：changeset 文件里不会记 commit hash，所以 `CHANGELOG.md` 的条目是纯摘要、不带 hash。
