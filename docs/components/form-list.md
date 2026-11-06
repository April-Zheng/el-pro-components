# 字段组 formList

`valueType: 'formList'` 把一列变成「可增删的对象数组」，`children` 是每一项里的字段。

**何时使用**

- 联系人、明细行、多个收货地址——一个字段里装 N 个结构相同的对象

## 代码演示

### 可增删的字段组

比如联系人列表：可以加一项、删一项、复制一项，校验跟着表单一起走。

<DemoPreview path="form-list" />

## 校验是怎么跑的

每一项里的 `el-form-item` 都还挂在**根表单**上（逐层 inject 到的都是同一个 `el-form`），`prop` 写成带下标的路径 `contacts.0.name`。所以 `ElProForm.validate()` 天然会连嵌套项一起校验，不需要把子规则收集起来再聚合。

组自己也要校验时，**记得写 `type: 'array'`**，否则 async-validator 不会按键长判空：

```ts
rules: [{ required: true, type: 'array', message: '至少需要一位联系人' }]
```

## 一个坑：下标会随增删漂移

行的 `v-for` key 用的是 Symbol（跟着 `JSON.stringify` 一起被忽略，不会混进提交数据），删掉中间一项后剩下的输入框不会跟错行。如果你给 `creator` 传了对象，也别在里面放 `__key` 之类的字段名——用不到，而且会提交上去。

## API

### formListProps

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| min | 最少几项。初始不足会**自动补齐**，等于这个数时删除按钮禁用 | `number` | `0` |
| max | 最多几项，达到后添加按钮禁用 | `number` | — |
| copyable | 每项可复制（插在原项后面） | `boolean` | `false` |
| creator | 新增一项的初值工厂 | `(index) => Record` | `() => ({})` |
| itemTitle | 每项标题，默认「第 N 项」 | `string \| (index) => string` | — |
| span | 每项内部字段的默认栅格（被子列的 formSpan 覆盖） | `number` | `12` |
| gutter | 栅格间距 | `number` | `16` |

### 列配置

| 参数 | 说明 |
| --- | --- |
| children | 每一项里的字段定义（和 ElProForm 的列同构，`formSpan` 生效） |
| formSpan | 该字段组占的栅格数，一般写 `24` |
