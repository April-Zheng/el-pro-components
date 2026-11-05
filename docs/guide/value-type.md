# valueType 词汇表

同一个 `valueType`，在表格/详情里决定**怎么显示**，在搜索栏/表单里决定**用什么控件**。这是整个库的通用词汇。

| valueType | 表格显示 | 表单控件 |
| --- | --- | --- |
| `text` | 纯文本 | ElInput |
| `textarea` / `code` | 纯文本 | ElInput textarea（code 用等宽字体） |
| `password` | 纯文本 | ElInput password |
| `number` | 数字 | ElInputNumber |
| `digitRange` | `10 ~ 50` | 两个 ElInputNumber |
| `money` | ¥1,288.50 | ElInputNumber |
| `percent` | 65.0% | ElInputNumber |
| `second` | 2小时1分钟5秒 | ElInputNumber（单位是秒） |
| `rate` | 星星 | ElRate |
| `slider` | 数字 | ElSlider |
| `select` / `tag` | 枚举文本 / ElTag | ElSelect |
| `status` | 圆点 + 文本 | ElSelect |
| `radio` / `radioButton` | 枚举文本 | ElRadioGroup |
| `checkbox` / `cascader` / `treeSelect` | 值用「、」连接 | 对应控件 |
| `switch` | 是 / 否 | ElSwitch |
| `segmented` | 枚举文本 | ElSegmented |
| `date` / `dateTime` | 格式化日期 | ElDatePicker |
| `dateRange` / `dateTimeRange` | `a ~ b` | 带 range 的 DatePicker |
| `time` / `timeRange` | HH:mm:ss | ElTimePicker |
| `dateWeek` | 2026 第 45 周 | week picker |
| `dateMonth` / `dateYear` | YYYY-MM / YYYY | month / year picker |
| `dateQuarter` | YYYY-Q4 | ⚠️ 降级为 month picker（Element Plus 没有季度选择器） |
| `fromNow` | 10 个月前 | — |
| `progress` | 进度条 | — |
| `image` / `avatar` | 缩略图 / 圆形头像 | — |
| `color` | 色块 | ElColorPicker |
| `index` / `indexBorder` | 行号 | — |
| `option` | 操作列（配合插槽） | — |
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
