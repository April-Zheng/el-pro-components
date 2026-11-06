# ElProStepsForm

分步表单：每步校验过了才前进，最后一步统一 `onFinish`。

**何时使用**

- 表单步骤多、需要把「填 → 确认」拆成几步
- 每一步要独立校验，失败停在原地

## 代码演示

分步表单：每一步单独校验，过了才进下一步，最后一步提交全部数据。

<DemoPreview path="steps-basic" />

## 关键语义（对齐源码 layouts/StepsForm）

- **「下一步」不直接跳步**——它触发当前步表单提交，校验通过才前进，失败停在原地
- **所有步的表单常驻挂载**（非当前步 `v-show` 隐藏），跨步填的值、状态都保留
- 只有**最后一步**的提交触发 `onFinish`；它必须是**函数 prop**（不是事件），因为「返回 true 才重置」的约定事件拿不到返回值。合并规则：后面的步覆盖前面的同名字段
- 底部按钮：第 0 步 `[下一步]`（只有一步时直接 `[提交]`）、中间 `[上一步, 下一步]`、最后 `[上一步, 提交]`；`submitter: false` 整个隐藏
- `allowStepSelect`：允许点击步骤条直接跳步，**不触发校验**（源码同款）
- `layout: 'vertical'` 步骤条挪到左侧，宽度按断点 xxl4/xl6/lg7/md8/sm10/xs12（源码 `stepsProps.orientation` 的等价物）

## API

### Props

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| steps | 每步的列定义 | `ProStepsFormItem[]` | —（必填） |
| onFinish | 最后一步提交回调，**函数 prop**。返回 `true` → 回到第 0 步并重置各步表单 | `(values) => Promise<boolean \| any>` | — |
| v-model:current | 受控当前步 | `number` | — |
| allowStepSelect | 允许点击步骤条直接跳步（不校验） | `boolean` | `false` |
| layout | 步骤条方向 | `'horizontal' \| 'vertical'` | `'horizontal'` |
| submitter | `false` 隐藏按钮区；对象可配 `submitButtonProps` / `resetButtonProps` / `onSubmit` / `onReset` | `false \| ProStepsSubmitter` | — |
| stepsProps | 透传给 `el-steps`（别塞 `orientation`，用 `layout`） | `object` | — |
| formProps | 透传给每步的 `ElProForm`（`span` / `labelWidth` 等） | `object` | — |

### ProStepsFormItem

| 字段 | 说明 |
| --- | --- |
| name | 步标识（合并数据时的 key） |
| title | 步骤条标题 |
| description | 步骤条描述 |
| columns | 这一步的表单列，同 [ElProForm](/components/form) |
| initialValues | 这一步的初值 |
| stepProps | 透传给 `el-step` |

### 实例方法

| 方法 | 说明 |
| --- | --- |
| `getAllFieldsValue()` | 合并所有步当前值（含没提交过的步） |
| `setCurrentStep(i)` / `getCurrentStep()` | 跳步（不校验）/ 读当前步 |
| `getStepFormInstance(i)` | 拿某一步的表单实例 |
| `resetSteps()` | 重置所有步 |
