/**
 * valueType 的格式化内核。
 *
 * 这一层刻意不 import 任何组件、不返回 VNode —— 只把原始值解析成
 * 「一段文本 + 一点点元信息（tag 颜色 / 进度百分比 / 图片地址）」。
 * 好处是同一套规则可以同时喂给表格单元格、描述列表项和纯文本导出，
 * 真正需要区分的只是最后那层外壳由谁渲染。
 */
import type { ProValueType, ValueEnum } from '../types'

const pad2 = (n: number) => String(n).padStart(2, '0')

/** 兼容 'YYYY-MM-DD HH:mm:ss' 这类非 ISO 字符串（Safari 直接 new Date 会 NaN） */
export function parseDate(value: any): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const s = String(value).trim()
  const d = new Date(s.includes('T') ? s : s.replace(/-/g, '/'))
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDate(value: any, fmt = 'YYYY-MM-DD'): string {
  const d = parseDate(value)
  if (!d) return value === null || value === undefined ? '' : String(value)
  const map: Record<string, string> = {
    YYYY: String(d.getFullYear()),
    MM: pad2(d.getMonth() + 1),
    DD: pad2(d.getDate()),
    HH: pad2(d.getHours()),
    mm: pad2(d.getMinutes()),
    ss: pad2(d.getSeconds()),
  }
  return fmt.replace(/YYYY|MM|DD|HH|mm|ss/g, (m) => map[m] ?? m)
}

/** ISO 周序号，用于 dateWeek */
export function getISOWeek(value: any): number {
  const d = parseDate(value)
  if (!d) return 0
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  // ISO 8601：周四所在的周属于哪一年，那一周就是第 1 周
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7))
  const firstThursday = new Date(target.getFullYear(), 0, 4)
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7))
  const diff = target.getTime() - firstThursday.getTime()
  return 1 + Math.round(diff / (7 * 24 * 3600 * 1000))
}

export function formatQuarter(value: any): string {
  const d = parseDate(value)
  if (!d) return value === null || value === undefined ? '' : String(value)
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`
}

/** 相对时间。不引 dayjs，几十行足够覆盖展示场景 */
export function formatFromNow(value: any): string {
  const d = parseDate(value)
  if (!d) return value === null || value === undefined ? '' : String(value)
  const diff = Date.now() - d.getTime()
  const abs = Math.abs(diff)
  const suffix = diff >= 0 ? '前' : '后'
  const MIN = 60_000
  const HOUR = 3.6e6
  const DAY = 8.64e7
  const MONTH = 2.592e9
  const YEAR = 3.1536e10
  if (abs < 30_000) return '刚刚'
  if (abs < HOUR) return `${Math.floor(abs / MIN)} 分钟${suffix}`
  if (abs < DAY) return `${Math.floor(abs / HOUR)} 小时${suffix}`
  if (abs < MONTH) return `${Math.floor(abs / DAY)} 天${suffix}`
  if (abs < YEAR) return `${Math.floor(abs / MONTH)} 个月${suffix}`
  return `${Math.floor(abs / YEAR)} 年${suffix}`
}

/**
 * 数字格式化。`valueFormat` 只解析两件事：
 * 小数位数（小数点后几位）和有没有千分位（是否含逗号）。
 * 例：'0' → 无小数无千分位；'0.00' → 两位小数无千分位；'0,0.00' → 两位小数带千分位
 */
export function formatNumber(value: any, valueFormat?: string, fallbackDecimals = 2): string {
  const num = typeof value === 'number' ? value : Number(value)
  if (value === null || value === undefined || value === '' || !Number.isFinite(num)) {
    return value === null || value === undefined ? '' : String(value)
  }
  let decimals = fallbackDecimals
  let thousand = false
  if (valueFormat) {
    thousand = valueFormat.includes(',')
    const dot = valueFormat.indexOf('.')
    decimals = dot >= 0 ? valueFormat.length - dot - 1 : 0
  }
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: thousand,
  })
}

/**
 * 秒数格式化成人话：`3725` → `1小时2分钟5秒`。
 *
 * 与源码 `formatSecond` 保持一致：负数表示「还有多久」，后缀「前」。
 * 不显示为 0 的单位直接省略，所以 59 秒不会写成「0分钟59秒」。
 */
export function formatSecond(value: any): string {
  const num = Number(value)
  if (!Number.isFinite(num)) return value === null || value === undefined ? '' : String(value)

  const past = num < 0
  let rest = Math.abs(num)
  const d = Math.floor(rest / 86400)
  rest -= d * 86400
  const h = Math.floor(rest / 3600)
  rest -= h * 3600
  const m = Math.floor(rest / 60)
  const s = Math.floor(rest - m * 60)

  let text = `${s}秒`
  if (m > 0) text = `${m}分钟${text}`
  if (h > 0) text = `${h}小时${text}`
  if (d > 0) text = `${d}天${text}`
  return past ? `${text}前` : text
}

/**
 * valueEnum 解析后的结果。
 *
 * 这里显式声明结构而不是交叉 ValueEnumItem —— 后者是 `string | object` 的联合，
 * 交叉之后 `string & { text }` 拿不到 status/color，TS 会直接报错。
 */
export interface ResolvedEnumItem {
  text: string
  status?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  color?: string
  disabled?: boolean
  hideInSelect?: boolean
}

/** 取 valueEnum 里的展示项，自动把字符串项归一成对象 */
export function resolveEnumItem(
  valueEnum: ValueEnum | undefined,
  value: any,
): ResolvedEnumItem | undefined {
  if (!valueEnum) return undefined
  const raw = valueEnum[value as string | number]
  if (raw === undefined) return undefined
  if (typeof raw === 'string') return { text: raw }
  return {
    text: raw.text,
    status: raw.status,
    color: raw.color,
    disabled: raw.disabled,
    hideInSelect: (raw as { hideInSelect?: boolean }).hideInSelect,
  }
}

/** 把 valueEnum 转成下拉/单选用的平铺数组 */
export function enumToOptions(valueEnum: ValueEnum | undefined, skipHidden = false) {
  if (!valueEnum) return []
  return Object.entries(valueEnum)
    .map(([key, raw]) => {
      const item = typeof raw === 'string' ? { text: raw } : raw
      const numeric = key !== '' && !Number.isNaN(Number(key))
      return {
        value: numeric ? Number(key) : key,
        label: item.text,
        status: item.status,
        color: item.color,
        disabled: item.disabled,
        hideInSelect: (raw as any)?.hideInSelect as boolean | undefined,
      }
    })
    .filter((o) => !(skipHidden && o.hideInSelect))
}

export const TAG_STATUS = ['primary', 'success', 'warning', 'danger', 'info'] as const
export type TagStatus = (typeof TAG_STATUS)[number]

/**
 * 单元格解析结果。`kind` 决定用哪种外壳渲染，其余字段是给外壳的入参。
 */
export interface ResolvedCell {
  kind: 'text' | 'tag' | 'status' | 'progress' | 'image' | 'avatar' | 'color' | 'rate' | 'empty'
  text: string
  /** kind === 'tag' | 'status' */
  tagType?: TagStatus
  tagColor?: string
  /** kind === 'progress' */
  percentage?: number
  progressStatus?: '' | 'success' | 'warning' | 'exception'
  /** kind === 'image' | 'avatar' */
  src?: string
  /** kind === 'color' */
  colorValue?: string
  /** kind === 'rate' */
  rateValue?: number
  /** 原值，便于自定义插槽里使用 */
  raw: any
}

export interface ResolveCellOptions {
  value: any
  valueType?: ProValueType
  valueEnum?: ValueEnum
  valueFormat?: string
  row?: any
  index?: number
  /** 空值占位，默认 '-'，传 false 关掉 */
  emptyText?: string | false
}

const DATE_TYPE_FORMATS: Partial<Record<ProValueType, string>> = {
  date: 'YYYY-MM-DD',
  dateTime: 'YYYY-MM-DD HH:mm:ss',
  time: 'HH:mm:ss',
  dateMonth: 'YYYY-MM',
  dateYear: 'YYYY',
}

const isRangeType = (vt: ProValueType) =>
  vt === 'dateRange' ||
  vt === 'dateTimeRange' ||
  vt === 'timeRange' ||
  vt === 'dateMonthRange' ||
  vt === 'dateQuarterRange' ||
  vt === 'dateYearRange'

/** 把一行的某个字段解析成可渲染的描述 */
export function resolveCell(opts: ResolveCellOptions): ResolvedCell {
  const { value, valueType = 'text', valueEnum, valueFormat, index } = opts
  const emptyText = opts.emptyText === undefined ? '-' : opts.emptyText

  const empty = (): ResolvedCell => ({
    kind: 'empty',
    text: typeof emptyText === 'string' ? emptyText : '',
    raw: value,
  })

  if (valueType === 'index' || valueType === 'indexBorder') {
    return { kind: 'text', text: String((index ?? 0) + 1), raw: value }
  }

  // 枚举优先于类型：配了 valueEnum 就一定能翻译成文本
  const enumItem = resolveEnumItem(valueEnum, value)
  if (enumItem) {
    if (valueType === 'status') {
      return {
        kind: 'status',
        text: enumItem.text,
        tagType: enumItem.status ?? 'info',
        tagColor: enumItem.color,
        raw: value,
      }
    }
    if (enumItem.status) {
      return {
        kind: 'tag',
        text: enumItem.text,
        tagType: enumItem.status,
        tagColor: enumItem.color,
        raw: value,
      }
    }
    if (enumItem.color) {
      return { kind: 'tag', text: enumItem.text, tagColor: enumItem.color, raw: value }
    }
    if (valueType === 'tag') {
      return { kind: 'tag', text: enumItem.text, tagType: 'primary', raw: value }
    }
    return { kind: 'text', text: enumItem.text, raw: value }
  }

  if (value === null || value === undefined || value === '') return empty()

  if (isRangeType(valueType)) {
    if (!Array.isArray(value) || value.length < 2) {
      return { kind: 'text', text: String(value), raw: value }
    }
    const fmt =
      valueFormat ??
      (valueType === 'dateTimeRange'
        ? 'YYYY-MM-DD HH:mm:ss'
        : valueType === 'timeRange'
          ? 'HH:mm:ss'
          : valueType === 'dateMonthRange'
            ? 'YYYY-MM'
            : valueType === 'dateYearRange'
              ? 'YYYY'
              : 'YYYY-MM-DD')
    const formatOne =
      valueType === 'dateQuarterRange'
        ? (v: any) => formatQuarter(v)
        : (v: any) => formatDate(v, fmt)
    return {
      kind: 'text',
      text: `${formatOne(value[0])} ~ ${formatOne(value[1])}`,
      raw: value,
    }
  }

  switch (valueType) {
    case 'money':
      return { kind: 'text', text: `¥${formatNumber(value, valueFormat ?? '0,0.00')}`, raw: value }
    case 'number':
    case 'slider':
      return { kind: 'text', text: formatNumber(value, valueFormat, 0), raw: value }
    case 'digitRange': {
      if (!Array.isArray(value) || value.length < 2) {
        return value === null || value === undefined || value === ''
          ? empty()
          : { kind: 'text', text: String(value), raw: value }
      }
      const fmtOne = (v: any) =>
        v === null || v === undefined || v === '' ? '' : formatNumber(v, valueFormat, 0)
      const from = fmtOne(value[0])
      const to = fmtOne(value[1])
      if (!from && !to) return empty()
      // 只有一端有值时只显示那一端：写成「~ 5」比「0 ~ 5」更诚实
      if (!from || !to) return { kind: 'text', text: from || to, raw: value }
      return { kind: 'text', text: `${from} ~ ${to}`, raw: value }
    }
    case 'second':
      return { kind: 'text', text: formatSecond(value), raw: value }
    case 'percent':
      return { kind: 'text', text: `${formatNumber(value, valueFormat ?? '0.0')}%`, raw: value }
    case 'rate':
      return {
        kind: 'rate',
        text: String(value),
        rateValue: Number(value) || 0,
        raw: value,
      }
    case 'date':
    case 'dateTime':
    case 'time':
    case 'dateMonth':
    case 'dateYear':
      return {
        kind: 'text',
        text: formatDate(value, valueFormat ?? DATE_TYPE_FORMATS[valueType] ?? 'YYYY-MM-DD'),
        raw: value,
      }
    case 'dateQuarter':
      return { kind: 'text', text: formatQuarter(value), raw: value }
    case 'dateWeek': {
      const d = parseDate(value)
      return {
        kind: 'text',
        text: d ? `${d.getFullYear()} 第 ${getISOWeek(value)} 周` : String(value),
        raw: value,
      }
    }
    case 'fromNow':
      return { kind: 'text', text: formatFromNow(value), raw: value }
    case 'switch':
      return { kind: 'text', text: value ? '是' : '否', raw: value }
    case 'progress': {
      const num = Number(value)
      const pct = Number.isFinite(num) ? Math.max(0, Math.min(100, num)) : 0
      return {
        kind: 'progress',
        text: `${pct}%`,
        percentage: pct,
        // 只有满值才标绿。低值不自动标红 —— 进度低不等于出错，
        // 自动染红会让整张表看起来全是告警
        progressStatus: pct >= 100 ? 'success' : '',
        raw: value,
      }
    }
    case 'image':
      return { kind: 'image', text: String(value), src: String(value), raw: value }
    case 'avatar':
      return { kind: 'avatar', text: String(value), src: String(value), raw: value }
    case 'color':
      return { kind: 'color', text: String(value), colorValue: String(value), raw: value }
    case 'checkbox':
    case 'cascader':
    case 'treeSelect':
      return {
        kind: 'text',
        text: Array.isArray(value) ? value.join('、') : String(value),
        raw: value,
      }
    default:
      return { kind: 'text', text: String(value), raw: value }
  }
}

/** 需要 valueEnum 才能正常工作的 valueType */
export const ENUM_VALUE_TYPES: ProValueType[] = [
  'select',
  'radio',
  'radioButton',
  'checkbox',
  'tag',
  'status',
  'segmented',
]

/** 纯展示型 / 排版型，不该出现在表单、搜索栏里 */
export const DISPLAY_ONLY_VALUE_TYPES: ProValueType[] = [
  'index',
  'indexBorder',
  'option',
  'progress',
  'image',
  'avatar',
  'color',
  'code',
  'divider',
  'group',
]
