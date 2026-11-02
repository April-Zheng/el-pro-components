/**
 * el-pro-components 的公共类型定义。
 *
 * 设计取向：**Element Plus 优先**。
 * 列/表单配置里凡是 Element Plus 原生的字段（label / prop / sortable / showOverflowTooltip /
 * rules ...）一律原样透传，不做重命名；只在 Element Plus 没有对应概念时才新增扩展字段，
 * 且扩展字段统一加 `pro` 无关的前缀（valueType / valueEnum / search ...）。
 */
import type { Component } from 'vue'

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
  | 'money'
  | 'percent'
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
/* 列定义                                                                      */
/* -------------------------------------------------------------------------- */

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
}
