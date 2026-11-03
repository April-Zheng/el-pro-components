/**
 * el-pro-components 的公共类型定义。
 *
 * 设计取向：**Element Plus 优先**。
 * 列/表单配置里凡是 Element Plus 原生的字段（label / prop / sortable / showOverflowTooltip /
 * rules ...）一律原样透传，不做重命名；只在 Element Plus 没有对应概念时才新增扩展字段，
 * 且扩展字段统一加 `pro` 无关的前缀（valueType / valueEnum / search ...）。
 */
import type { Component, CSSProperties, VNode } from 'vue'

/* -------------------------------------------------------------------------- */
/* 响应式（卡片 / 列表的 colSpan、gutter、grid 共用）                            */
/* -------------------------------------------------------------------------- */

/** 断点。阈值与 antd Grid 一致（xs 0 / sm 576 / md 768 / lg 992 / xl 1200 / xxl 1600） */
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'

/** 可以直给，也可以按断点给 */
export type ResponsiveValue<T> = T | Partial<Record<Breakpoint, T>>


/* -------------------------------------------------------------------------- */
/* valueType                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * 值的类型。决定三处渲染形态：
 * - 表格单元格 / 描述列表：格式化成文本、tag、进度条、图片
 * - 搜索栏 / 表单：用哪个输入控件
 *
 * 命名与 ProComponents 保持一致的几个（text / money / select / dateRange / index / option），
 * 其余用 Element Plus 社区更常用的叫法。
 */
export type ValueType =
  /* 文本 */
  | 'text'
  | 'textarea'
  | 'password'
  | 'code'
  /* 数值 */
  | 'number'
  /** 数字区间，值是 `[最小值, 最大值]` */
  | 'digitRange'
  | 'money'
  | 'percent'
  /** 时长：值是秒数，展示成「1 小时 2 分钟 3 秒」 */
  | 'second'
  | 'rate'
  | 'slider'
  /* 选择 */
  | 'select'
  | 'radio'
  | 'radioButton'
  | 'checkbox'
  | 'switch'
  | 'segmented'
  | 'cascader'
  | 'treeSelect'
  /* 日期时间 */
  | 'date'
  | 'dateTime'
  | 'dateRange'
  | 'dateTimeRange'
  | 'time'
  | 'timeRange'
  | 'dateWeek'
  | 'dateMonth'
  | 'dateQuarter'
  | 'dateYear'
  | 'dateMonthRange'
  | 'dateQuarterRange'
  | 'dateYearRange'
  | 'fromNow'
  /* 展示 */
  | 'tag'
  | 'status'
  | 'progress'
  | 'image'
  | 'avatar'
  | 'color'
  | 'index'
  | 'indexBorder'
  | 'option'

/** valueEnum 的单项。也可以直接写字符串（视为只有 text）。 */
export type ValueEnumItem =
  | string
  | {
      text: string
      /** 映射到 el-tag 的 type */
      status?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
      /** 映射到 el-tag 的 color，优先级高于 status */
      color?: string
      /** 搜索下拉里禁用该项 */
      disabled?: boolean
      /** 不在搜索下拉里出现（只用作文本展示） */
      hideInSelect?: boolean
    }

export type ValueEnum = Record<string | number, ValueEnumItem>

/** el-table / 工具栏密度 */
export type TableSize = 'large' | 'default' | 'small'

/* -------------------------------------------------------------------------- */
/* 布局                                                                        */
/* -------------------------------------------------------------------------- */

export interface ProLayoutMenuItem {
  /** 菜单标题，同时作为无 path 时的唯一标识 */
  title: string
  /** 路由路径。有 children 时作为父级标识 */
  path?: string
  /** 图标：可以直接传组件（如 @element-plus/icons-vue 的某个图标），也可以传字符串由使用方自行处理 */
  icon?: Component | string
  children?: ProLayoutMenuItem[]
  hideInMenu?: boolean
  /** 面包屑里不出现这一级 */
  hideInBreadcrumb?: boolean
  /** 外部链接 */
  href?: string
  /** 路由 query */
  query?: Record<string, any>
  /** 徽标数字/文案 */
  badge?: string | number
}

/* -------------------------------------------------------------------------- */
/* 卡片                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * 折叠方式：
 * - `'icon'`   ：标题前出现箭头，点箭头折叠
 * - `'header'` ：点整条 header 折叠
 * - `true`     ：等价于 `'icon'`
 */
export type ProCardCollapsible = boolean | 'icon' | 'header'

/** 卡片头部的标签页。内容优先取 `content`，其次取 `#tab-<key>` 插槽 */
export interface ProCardTabItem {
  key: string
  label?: string
  disabled?: boolean
  content?: VNode | string | number
}

/** CheckCardGroup 的 options 项：一张卡片的全部数据 */
export interface ProCheckCardOption {
  value: string | number
  title?: string | number
  subTitle?: string | number
  description?: string | number
  avatar?: string | VNode
  cover?: string | VNode
  extra?: string | VNode
  disabled?: boolean
}

/* -------------------------------------------------------------------------- */
/* 统计数值                                                                    */
/* -------------------------------------------------------------------------- */

/** 数值前的状态圆点，映射到 Element Plus 的语义色 */
export type ProStatisticStatus = 'success' | 'processing' | 'default' | 'error' | 'warning'

/**
 * 趋势箭头。
 * **up 用红、down 用绿** —— 中国金融语义，与 pro-components 源码的取向一致
 * （源码注释写的也是「红涨绿跌」）。海外业务想要相反配色，覆盖
 * `--el-pro-statistic-trend-up-color` / `-down-color` 两个变量即可。
 */
export type ProStatisticTrend = 'up' | 'down'

/**
 * - `vertical`：标题在上、数值在下（默认，适合指标卡）
 * - `horizontal`：标题在左、数值在右，字号统一（适合列表里的一行）
 * - `inline`：标题和数值挤在一行，字号 13px、次级色（适合密集排布）
 */
export type ProStatisticLayout = 'horizontal' | 'vertical' | 'inline'

/** 统计数值的配置。挂 `ElProStatistic` 用，也可以整个塞进 `StatisticCard` 的 `statistic` */
export interface ProStatisticProps {
  value?: number | string
  title?: string | number
  /** 标题后的问号提示 */
  tip?: string
  /** 数值下方的描述文字 */
  description?: string | number
  /** 小数位数。不传则保留原值的位数，不做任何取舍 */
  precision?: number
  /** 完全自定义格式化。给了它就忽略 precision 与分组 */
  formatter?: (value: number | string) => string
  prefix?: string | number
  suffix?: string | number
  /** 左侧图标：可以直接传组件（如 @element-plus/icons-vue 的某个图标） */
  icon?: Component | string
  status?: ProStatisticStatus
  trend?: ProStatisticTrend
  layout?: ProStatisticLayout
  /** 千分位分隔符 @default ',' */
  groupSeparator?: string
  /** 小数点符号 @default '.' */
  decimalSeparator?: string
  /** 加载态：数值区换成一根占位条 */
  loading?: boolean
  /** 只作用于数值本身的样式（颜色、字号） */
  valueStyle?: CSSProperties
}

/* -------------------------------------------------------------------------- */
/* 列表                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * 列在列表项里的位置。ProList 和 ProTable 共用一份 ProColumn，
 * 靠这个字段决定「这一列在列表里渲染成什么角色」。
 */
export type ProListSlot =
  | 'title'
  | 'subTitle'
  | 'description'
  | 'avatar'
  | 'extra'
  | 'content'
  | 'actions'
  | 'aside'

/** 列表的分栏配置。`column` 为每行几个，其余键按断点覆盖 */
export interface ProListGrid {
  column?: number
  gutter?: number | [number, number]
  xs?: number
  sm?: number
  md?: number
  lg?: number
  xl?: number
  xxl?: number
}

/* -------------------------------------------------------------------------- */
/* 请求                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * 布局类 valueType：不产生值，只影响表单排版。
 * 与 ProComponents 的 PRO_FIELD_SCHEMA_LAYOUT_VALUE_TYPES 对应。单独成集，
 * 是为了让「有值字段」和「纯排版占位」在类型上不混在一起。
 */
export type ProLayoutValueType = 'divider' | 'group'

/** 列上允许出现的 valueType 全集 */
export type ProValueType = ValueType | ProLayoutValueType

export type SortOrder = 'asc' | 'desc'

/** request 收到的第一个参数：翻页信息 + 搜索表单值 + params 的合并结果 */
export interface ProRequestParams {
  current: number
  pageSize: number
  [key: string]: any
}

export interface ProRequestResult<T = any> {
  data: T[]
  /** 不传则取 data.length。要做服务端分页必须传 */
  total?: number
  /** 返回 false 会让表格进入空态而不报错，用于业务层级的失败 */
  success?: boolean
  errorMessage?: string
}

/**
 * 数据请求函数。
 *
 * 第三个参数带 `signal`，配合 axios / fetch 即可实现「切页时取消上一次请求」。
 * 即使你不接 signal，内部也会用自增 id 丢弃过期响应，不会出现旧数据覆盖新数据。
 */
export type ProRequest<T = any, P extends Record<string, any> = Record<string, any>> = (
  params: P & ProRequestParams,
  sort: Record<string, SortOrder>,
  extra: { signal: AbortSignal },
) => Promise<ProRequestResult<T> | T[]> | ProRequestResult<T> | T[]

/* -------------------------------------------------------------------------- */
/* 描述列表                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 描述列表的请求结果。**必须包一层 `data`**：记录本身就是任意对象，
 * 若允许「裸对象直接当数据」，那记录里恰好有 `data` / `success` 字段时就无法区分。
 * 用类型卡住这个歧义，比运行时猜要可靠。
 */
export interface ProDescriptionsRequestResult<T = Record<string, any>> {
  data: T
  /** 返回 false 时不清空已有数据，只展示 errorMessage */
  success?: boolean
  errorMessage?: string
}

/** 描述列表的数据请求。第二个参数带 `signal`，切记录时可取消上一次请求 */
export type ProDescriptionsRequest<T = Record<string, any>> = (
  params: Record<string, any>,
  extra: { signal: AbortSignal },
) => Promise<ProDescriptionsRequestResult<T>> | ProDescriptionsRequestResult<T>

/* -------------------------------------------------------------------------- */
/* 行内编辑                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 可编辑表格的配置。挂在 ElProTable 的 `editable` 上，
 * 或直接用 ElProEditableTable（它只是把 editable 预置好的薄壳）。
 */
export interface ProEditableConfig {
  /**
   * single：一次只编辑一行，点另一行的「编辑」会先把当前行保存掉（保存失败则不切换）
   * multiple：允许多行同时编辑
   * @default 'single'
   */
  type?: 'single' | 'multiple'
  /** 「新增一行」时生成的行数据。不传则用各列的 defaultValue 拼一个空对象 */
  newRecord?: (rowIndex: number) => Record<string, any>
  /** 是否显示「新增一行」按钮 @default true */
  addable?: boolean
  /** 是否显示「删除」按钮 @default true */
  deletable?: boolean
  /**
   * 保存。在这里发请求。
   * 返回 `false` 或抛错都会让该行**留在编辑态**，数据也不会被写回。
   *
   * 也可以返回保存后的记录（通常是接口回包）：返回对象会被合并进该行。
   * 新增行靠这个拿到后端主键 —— 不返回的话该行会一直带着临时 key，
   * 之后再编辑/删除就只能拿 `__new_1` 去调接口了。
   */
  onSave?: (
    key: string | number,
    row: any,
    rowIndex: number,
  ) => boolean | void | Record<string, any> | Promise<boolean | void | Record<string, any>>
  /** 删除。返回 false 则不移除 */
  onDelete?: (
    key: string | number,
    row: any,
    rowIndex: number,
  ) => boolean | void | Promise<boolean | void>
  /** 取消编辑 */
  onCancel?: (key: string | number, row: any) => void
}

export interface ProSearchConfig {
  /** 搜索栏内的排位，越小越靠前。不传则按 columns 顺序 */
  order?: number
  /** 24 栅格占几格，默认 6（一行 4 个） */
  span?: number
  /** 透传给输入控件的 props */
  props?: Record<string, any>
  /** 占位文案 */
  placeholder?: string
  /**
   * 搜索时改用另一种 valueType。
   * 典型场景：表格里 `createdAt` 用 dateTime 显示到秒，搜索时用 dateRange 选区间。
   */
  valueType?: ValueType
  /**
   * 把搜索表单里的值转换成接口真正要的参数。
   * 返回的对象会合并进请求参数，同时原字段会被移除。
   *
   * @example
   * transform: (v) => v?.length === 2 ? { startTime: v[0], endTime: v[1] } : {}
   */
  transform?: (value: any) => Record<string, any> | void
}

/* -------------------------------------------------------------------------- */
/* 列定义                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * 列定义 = Element Plus 的 TableColumnCtx 常用字段 + Pro 扩展。
 *
 * 注意 `sortable` 沿用 Element Plus 语义：
 * - `true` → 本地排序
 * - `'custom'` → 服务端排序（触发 request 重跑，并把 sort 透传出去）
 * 这一点和 ProComponents 的 `sorter: true` 恰好相反，是迁移时最容易踩的地方。
 */
export interface ProColumn<T = any> {
  /* ---- Element Plus 原生字段，原样透传 ---- */
  prop?: string
  label?: string
  width?: string | number
  minWidth?: string | number
  fixed?: boolean | 'left' | 'right'
  align?: 'left' | 'center' | 'right'
  headerAlign?: 'left' | 'center' | 'right'
  sortable?: boolean | 'custom'
  sortMethod?: (a: T, b: T) => number
  sortBy?: string | string[] | ((row: T, index: number) => string)
  showOverflowTooltip?: boolean
  className?: string
  labelClassName?: string
  resizable?: boolean
  formatter?: (row: T, column: any, cellValue: any, index: number) => any

  /* ---- Pro 扩展 ---- */
  /** 值的类型，决定渲染形态与搜索控件。也可填布局类型（divider） */
  valueType?: ProValueType
  /** 枚举字典，key 为值，value 为显示文案/样式 */
  valueEnum?: ValueEnum
  /** 数字的精度、日期格式串等。数字传 '0.00' 形式，日期传 'YYYY-MM-DD HH:mm:ss' */
  valueFormat?: string
  /** 单元格内容可一键复制 */
  copyable?: boolean

  /** 是否出现在搜索栏：false 隐藏 / true 用默认 / 对象可细调 */
  search?: boolean | ProSearchConfig
  /** 搜索项的初始值 */
  defaultValue?: any
  /** 强制不进搜索栏（优先级高于 search） */
  hideInSearch?: boolean

  hideInTable?: boolean
  hideInForm?: boolean
  hideInDescriptions?: boolean
  /** 不出现在列设置面板里 */
  hideInSetting?: boolean
  /** 列设置面板里禁止勾选取消（如操作列） */
  disableSetting?: boolean

  /** 表格单元格自定义渲染组件，优先级高于 valueType */
  cellComponent?: Component | string
  /** 表单/搜索栏自定义控件组件，优先级高于 valueType */
  fieldComponent?: Component | string

  /** 在 el-descriptions 里占几列 */
  descriptionsSpan?: number
  /** 在 ElProList 的列表项里扮演什么角色。不传则按 valueType / 位置自动推断 */
  listSlot?: ProListSlot
  /** 在 el-pro-form 里占几格（24 栅格），不传则用表单的默认 span */
  formSpan?: number
  /** 表单/搜索栏里禁用 */
  readonly?: boolean
  /** 透传给输入控件的 props（搜索模式下会被 search.props 覆盖） */
  fieldProps?: Record<string, any>
  /** 表单校验规则，直接透传给 el-form-item 的 rules */
  rules?: any[]
  /** 表单项透传给 el-form-item 的 props */
  formItemProps?: Record<string, any>

  /**
   * 多级表头：有 `children` 时这一列变成分组表头，自己不产生单元格。
   *
   * 分组列不参与列设置的拖拽与固定（el-table 也没法固定「分组下的子列」），
   * 但它下面的叶子列可以在面板里勾选显隐。
   */
  children?: ProColumn<T>[]

  /**
   * 可编辑表格里这一列能否编辑。
   * - 不写：按 valueType 推断，纯展示型（index / option / progress / image / avatar / color / code）不可编辑
   * - true / false：强制
   * - 函数：按行决定（如「只有待审核的订单能改金额」）
   */
  editable?: boolean | ((row: T, index: number) => boolean)
}
