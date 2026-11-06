# ElProStatistic / ElProStatisticCard

后台首页几乎必有的那块：一个数值 + 标题 + 趋势 + 可选图表。数值和卡片分成两层，所以字号、千分位、趋势配色只有一处实现。

**何时使用**

- 运营概览页的一排指标
- 指标旁边要放图表（进度环、迷你趋势）

![指标卡](/screenshots/statistic-card.png)

## 代码演示

### 一排指标卡

用 `Group` 把指标卡排成一行，中间自动画分割线。宽度用 `col-span` 分，`:col-span="6"` 就是四等分。

<DemoPreview path="statistic" />

### 卡片上放图表

`chart-placement` 决定图表放在数值旁边还是下面：

```vue
<ElProStatisticCard
  :col-span="12"
  chart-placement="right"
  :statistic="{ title: '磁盘占用', value: 68, suffix: '%' }"
>
  <template #chart>
    <ElProgress type="dashboard" :percentage="68" :width="96" />
  </template>
</ElProStatisticCard>
```

## API

### statistic 对象

| 字段 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| value | 数值 | `string \| number` | — |
| title | 标题 | `string \| number` | — |
| tip | 标题旁问号提示 | `string` | — |
| description | 数值下方说明 | `string \| number` | — |
| precision | 小数位数。不传则保留原值位数 | `number` | — |
| prefix | 数值前缀，如 `¥`，字号比数值小一号 | `string \| number` | — |
| suffix | 数值后缀，如 `人`、`%`，字号比数值小一号 | `string \| number` | — |
| trend | 趋势。**红涨绿跌**（中国金融语义）；想反过来覆盖 `--el-pro-statistic-trend-up-color` / `-down-color` | `'up' \| 'down'` | — |
| trendValue | 趋势数值文案 | `string` | — |
| status | 数值前的小圆点 | `'success' \| 'processing' \| 'warning' \| 'error' \| 'default'` | — |
| layout | 版式 | `'vertical' \| 'horizontal' \| 'inline'` | `'vertical'` |
| icon | 左侧图标 | `Component` | — |
| formatter | 完全自定义格式化，给了它就忽略 precision 与分组 | `(value) => string` | — |
| loading | 加载占位条 | `boolean` | `false` |
| groupSeparator | 千分位分组符 | `string` | `','` |

### 卡片侧（ElProStatisticCard）

卡片属性（`title` / `tooltip` / `extra` / `bordered` / `loading` / `col-span` / `gutter`）经 `$attrs` 原样透传给 `ElProCard`，两边不重复声明。

| 参数 | 说明 | 类型 |
| --- | --- | --- |
| statistic | 数值配置，见上表 | `object` |
| chartPlacement | 图表与数值的相对位置 | `'bottom' \| 'right'` |

`ElProStatisticCardGroup` 的 `direction` / `gutter` 决定排列与分割线。
