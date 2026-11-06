# ElProModalForm / ElProDrawerForm

同一套表单放进弹窗 / 抽屉。它只负责一件容易写错的事：**先校验，再提交，成功了才关窗**。

**何时使用**

- 列表页的新建/编辑弹窗
- 字段多到弹窗装不下时换 `ElProDrawerForm`（同一套行为、换个外壳）

## 代码演示

### 弹窗表单

提交前先校验，通过了才关窗；失败了留在窗内改。

<DemoPreview path="modal-form" />

### 抽屉表单

字段多到弹窗装不下时用抽屉，表单行为和弹窗一样。每次打开都重新初始化，取消后不残留输入。

<DemoPreview path="drawer-form" />

## 两种开窗方式

- `#trigger` 插槽：点它开窗，最省事
- `v-model:open` / `ref.open()`：开关交给父组件，或要在别处触发

数据怎么传：编辑已有数据传 `model`，组件不会重置它；一次性新建传 `initialValues`，每次打开重新拷贝。

## API

### Props

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| columns | 同 [ElProForm](/components/form) | `ProColumn[]` | —（必填） |
| model | 受控数据。传了就一直用这一份，组件**不会重置它** | `Record<string, any>` | — |
| initialValues | 内部草稿初值，仅未传 `model` 时生效；每次打开重新拷贝 | `Record<string, any>` | — |
| onFinish | 校验通过后调用（即 `@finish`）。**返回真值才关窗**；返回 `false` 可留在窗内做二次确认，reject 也保持打开；不传时提交不会自动关窗 | `(values) => Promise<any>` | — |
| v-model:open | 受控开窗 | `boolean` | `false` |
| title | 弹窗/抽屉标题 | `string` | — |
| loading | 外部已知的提交中状态，和内部状态一起控制按钮 loading | `boolean` | `false` |
| width | 弹窗宽度（DrawerForm 用 `drawerSize`——`size` 是**表单控件尺寸**，两个 size 混用会改半天没反应） | `string \| number` | — |

### 事件与实例方法

| 名称 | 说明 |
| --- | --- |
| `@finish(values)` | 校验通过后触发，同 `onFinish` |
| `@finish-error(err)` | `onFinish` 抛错时；想弹 toast 还是画在弹窗里都行 |
| `@cancel` / `@open-change` / `@invalid` | 取消 / 开关变化 / 校验没过 |
| `open()` / `close()` / `submit()` / `getValues()` | 实例方法 |
