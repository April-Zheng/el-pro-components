/**
 * 订单假数据。给「真业务页」（OrderPage）用。
 *
 * 和 `mock.ts` 里的用户数据分开：用户那份是给单个组件做演示的，
 * 这份要支撑一整条链路（tab 分状态 → 筛选 → 分页 → 批量 → 编辑 → 详情），
 * 字段得够真实，状态分布也得够真实（不然翻两页全是一个状态，测不出什么）。
 */
import type { ProRequest, ValueEnum } from '@/index'
import { delay } from './mock'

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'done' | 'refunded'
export type OrderChannel = 'app' | 'web' | 'miniapp' | 'offline'

export interface Order {
  id: number
  orderNo: string
  customer: string
  channel: OrderChannel
  status: OrderStatus
  amount: number
  itemCount: number
  address: string
  remark: string
  createdAt: string
  paidAt: string | null
}

export const ORDER_STATUS_ENUM: ValueEnum = {
  pending: { text: '待付款', status: 'warning' },
  paid: { text: '已付款', status: 'primary' },
  shipped: { text: '已发货', status: 'success' },
  done: { text: '已完成', status: 'info' },
  refunded: { text: '已退款', status: 'danger' },
}

export const CHANNEL_ENUM: ValueEnum = {
  app: { text: 'App', status: 'primary' },
  web: { text: '网页', status: 'info' },
  miniapp: { text: '小程序', status: 'success' },
  offline: { text: '线下', status: 'warning' },
}

const CUSTOMERS = [
  '赵明轩', '钱思远', '孙雨桐', '李子涵', '周嘉懿', '吴书瑶',
  '郑若曦', '王泽宇', '冯欣怡', '陈浩然', '褚一鸣', '卫南风',
]
const CITIES = ['杭州', '上海', '北京', '深圳', '成都', '武汉', '南京', '西安']
const CHANNELS: OrderChannel[] = ['app', 'web', 'miniapp', 'offline', 'app', 'web']
/** 状态不是均匀分布：真实业务里「已完成」永远最多 */
const STATUS_POOL: OrderStatus[] = [
  'done', 'done', 'done', 'shipped', 'shipped', 'paid', 'pending', 'refunded',
]

const pad = (n: number) => String(n).padStart(2, '0')

function stamp(seed: number) {
  const d = new Date(2026, 0, 1 + seed * 2)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(8 + (seed % 11))}:${pad((seed * 13) % 60)}:00`
}

export const ORDERS: Order[] = Array.from({ length: 64 }, (_, i) => {
  const status = STATUS_POOL[i % STATUS_POOL.length]
  const createdAt = stamp(i)
  return {
    id: i + 1,
    orderNo: `SO${2026}${pad(1 + (i % 12))}${String(10000 + i * 7)}`,
    customer: CUSTOMERS[i % CUSTOMERS.length],
    channel: CHANNELS[i % CHANNELS.length],
    status,
    amount: Math.round(((i + 1) * 317.42 + (i % 5) * 99) * 100) / 100,
    itemCount: (i % 6) + 1,
    address: `${CITIES[i % CITIES.length]}市西湖区文一路 ${100 + i} 号`,
    remark: i % 7 === 0 ? '客户要求工作日送达，勿放快递柜' : '',
    createdAt,
    paidAt: status === 'pending' ? null : createdAt,
  }
})

/**
 * 订单列表请求。
 *
 * 条件形状就是 QueryFilter 交出来的原样：
 * - `keyword`：订单号 / 客户名，模糊
 * - `amount`：`digitRange`，值是 `[min, max]`，两端都可能为空
 * - `createdAt`：`dateRange`，值是 `['2026-01-01', '2026-02-01']`
 *
 * 故意不在这里做 field 映射：那是「后端参数名和前端不一致」时才需要的 `paramsAdapter`，
 * demo 里前后端是一份代码，硬加一层反而看不出真实链路长什么样。
 */
export const requestOrders: ProRequest<Order> = async (params, sort, { signal }) => {
  await delay(420, signal)
  let list = ORDERS.slice()

  if (params.keyword) {
    const kw = String(params.keyword).trim()
    if (kw) list = list.filter((o) => o.orderNo.includes(kw) || o.customer.includes(kw))
  }
  if (params.status) list = list.filter((o) => o.status === params.status)
  if (params.channel) list = list.filter((o) => o.channel === params.channel)

  if (Array.isArray(params.amount)) {
    const [min, max] = params.amount as [number | null, number | null]
    if (min != null) list = list.filter((o) => o.amount >= min)
    if (max != null) list = list.filter((o) => o.amount <= max)
  }

  if (Array.isArray(params.createdAt) && params.createdAt.length === 2) {
    const [start, end] = params.createdAt as [string, string]
    list = list.filter((o) => o.createdAt.slice(0, 10) >= start && o.createdAt.slice(0, 10) <= end)
  }

  const sortKey = Object.keys(sort)[0]
  if (sortKey) {
    const dir = sort[sortKey] === 'asc' ? 1 : -1
    list.sort((a, b) => {
      const av = (a as any)[sortKey]
      const bv = (b as any)[sortKey]
      if (av === bv) return 0
      return (av > bv ? 1 : -1) * dir
    })
  }

  const total = list.length
  const start = (params.current - 1) * params.pageSize
  return { data: list.slice(start, start + params.pageSize), total, success: true }
}

/** 发货 / 删除这类写操作也走延时，界面上的 loading 才不是假的 */
export async function shipOrders(ids: number[]) {
  await delay(500)
  for (const o of ORDERS) if (ids.includes(o.id) && o.status === 'paid') o.status = 'shipped'
}

export async function removeOrders(ids: number[]) {
  await delay(400)
  for (const id of ids) {
    const i = ORDERS.findIndex((o) => o.id === id)
    if (i >= 0) ORDERS.splice(i, 1)
  }
}

/**
 * 新建订单。
 *
 * 刻意**真的写进 ORDERS**：如果这里只 `ElMessage.success` 一下就完事，
 * 页面上的「提交 → 关窗 → 列表刷新 → 总数 +1」这条链路就没被验证过，
 * 而这恰恰是业务页最容易漏的一环（关窗了但没刷新，用户以为没保存）。
 */
export async function createOrder(input: Record<string, any>) {
  await delay(350)
  const id = Math.max(0, ...ORDERS.map((o) => o.id)) + 1
  const now = new Date()
  const birthday = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  const order: Order = {
    id,
    orderNo: `SO2026${String(900000 + id).slice(-6)}`,
    customer: String(input.customer ?? '').trim() || '未命名客户',
    channel: (input.channel as OrderChannel) ?? 'web',
    // 新建单一律从「待付款」开始，这是业务规则，不是默认值
    status: 'pending',
    amount: Number(input.amount) || 0,
    itemCount: Number(input.itemCount) || 1,
    address: String(input.address ?? ''),
    remark: String(input.remark ?? ''),
    createdAt: birthday,
    paidAt: null,
  }
  ORDERS.unshift(order)
  return order
}

/** 编辑：只覆盖表单里那几项，状态/订单号这类不允许被表单改的字段原样留着 */
export async function updateOrder(id: number, input: Record<string, any>) {
  await delay(350)
  const target = ORDERS.find((o) => o.id === id)
  if (!target) throw new Error('订单不存在，可能已被别人删除')
  target.customer = String(input.customer ?? target.customer).trim() || target.customer
  if (input.channel) target.channel = input.channel as OrderChannel
  if (input.amount != null) target.amount = Number(input.amount)
  if (input.itemCount != null) target.itemCount = Number(input.itemCount)
  if (input.address != null) target.address = String(input.address)
  if (input.remark != null) target.remark = String(input.remark)
  return target
}
