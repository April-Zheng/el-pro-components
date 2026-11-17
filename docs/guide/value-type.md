# valueType 词汇表

同一个 `valueType`，在表格/详情里决定**怎么显示**，在搜索栏/表单里决定**用什么控件**。这是整个库的通用词汇。

一行一个 valueType；同类变体（如 `radio` 与 `radioButton`）渲染语义相同，为了查找时一眼能对照，也各自占一行。

| valueType | 表格显示 | 表单控件 |
| --- | --- | --- |
| `text` | 纯文本 | ElInput |
| `textarea` | 纯文本 | ElInput textarea |
| `code` | 纯文本（等宽字体） | ElInput textarea |
| `jsonCode` | 代码对象 pretty-print | ElInput textarea |
| `password` | 纯文本 | ElInput password |
| `number` | 数字 | ElInputNumber |
| `digitRange` | `10 ~ 50` | 两个 ElInputNumber |
| `money` | ¥1,288.50 | ElInputNumber |
| `percent` | 65.0% | ElInputNumber |
| `second` | 2小时1分钟5秒 | ElInputNumber（单位是秒） |
| `rate` | 星星 | ElRate |
| `slider` | 数字 | ElSlider |
| `select` | 枚举文本 / ElTag | ElSelect |
| `tag` | 枚举文本 / ElTag | ElSelect |
| `status` | 圆点 + 文本 | ElSelect |
| `radio` | 枚举文本 | ElRadioGroup |
| `radioButton` | 枚举文本 | ElRadioGroup（button 样式） |
| `checkbox` | 值用「、」连接 | ElCheckboxGroup |
| `cascader` | 值用「、」连接 | ElCascader |
| `treeSelect` | 值用「、」连接 | ElTreeSelect |
| `switch` | 是 / 否 | ElSwitch |
| `segmented` | 枚举文本 | ElSegmented |
| `date` | 格式化日期 | ElDatePicker |
| `dateTime` | 格式化日期（到秒） | ElDatePicker |
| `dateRange` | `a ~ b` | 带 range 的 DatePicker |
| `dateTimeRange` | `a ~ b`（到秒） | 带 range 的 DatePicker |
| `time` | HH:mm:ss | ElTimePicker |
| `timeRange` | HH:mm:ss 区间 | ElTimePicker（range） |
| `dateWeek` | 2026 第 45 周 | week picker |
| `dateMonth` | YYYY-MM | month picker |
| `dateYear` | YYYY | year picker |
| `dateQuarter` | YYYY-Q4 | ⚠️ 降级为 month picker（Element Plus 没有季度选择器） |
| `dateMonthRange` | YYYY-MM ~ YYYY-MM | month range picker |
| `dateQuarterRange` | YYYY-Q4 ~ YYYY-Q4 | ⚠️ 降级为 month range picker |
| `dateYearRange` | YYYY ~ YYYY | ⚠️ 降级为 month range picker |
| `fromNow` | 10 个月前 | — |
| `progress` | 进度条 | — |
| `image` | 缩略图 | — |
| `avatar` | 圆形头像 | — |
| `color` | 色块 | ElColorPicker |
| `index` | 行号 | — |
| `indexBorder` | 行号圆底徽章（>3 变灰） | — |
| `option` | 操作列（配合插槽） | — |
| `codeEditor` | code 代码块 | Monaco 编辑器（需装可选依赖 monaco-editor） |
| `richText` | HTML 渲染 | Quill 编辑器（富文本，需装 quill） |
| `formList` | —（表单专属） | 一组可增删的字段 |
| `group` | —（表单专属） | 带标题的分组块 |

## valueEnum 是字典

string 或对象都能写：

```ts
const STATUS_ENUM = {
  active: { text: '正常', status: 'success' },   // status 映射到 el-tag 的 type
  pending: { text: '待审核', status: 'warning' },
  disabled: { text: '已停用', status: 'info' },
}
```

> 没写 `valueType` 但配了 `valueEnum` 时，按 `select` / `tag` 语义处理——和 ProComponents 的行为一致。

## 一个常见场景：表格显示到秒、搜索用日期区间

```ts
{
  prop: 'createdAt',
  label: '创建时间',
  valueType: 'dateTime',        // 表格里显示 2026-01-01 08:00:00
  search: {
    valueType: 'dateRange',     // 搜索时换成区间选择器
    span: 8,
    transform: (v) =>           // 把 [开始, 结束] 转成后端要的两个字段
      v?.length === 2 ? { startTime: v[0], endTime: v[1] } : {},
  },
}
```
