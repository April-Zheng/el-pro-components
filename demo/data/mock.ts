/**
 * demo 用的假数据与假接口。
 * 单独放一层是为了让页面只关心「怎么用组件」，不用在读列定义时被 87 行 mock 打断。
 */
import type { ProRequest } from '@/index'

export interface User {
  id: number
  name: string
  avatar: string
  email: string
  role: 'admin' | 'editor' | 'viewer'
  status: 'active' | 'pending' | 'disabled'
  score: number
  progress: number
  amount: number
  createdAt: string
}

const SURNAMES = ['赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈', '褚', '卫']
const GIVEN = ['明轩', '思远', '雨桐', '子涵', '嘉懿', '书瑶', '若曦', '泽宇', '欣怡', '浩然']

/** 用 data URI 生成头像，避免依赖外网图片 */
function avatarOf(text: string, seed: number) {
  const hue = (seed * 47) % 360
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="hsl(${hue},52%,58%)"/><text x="32" y="41" font-size="26" text-anchor="middle" fill="#fff" font-family="sans-serif">${text}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const pad = (n: number) => String(n).padStart(2, '0')

export const ALL: User[] = Array.from({ length: 87 }, (_, i) => {
  const name = SURNAMES[i % 12] + GIVEN[i % 10]
  const roleKeys = ['admin', 'editor', 'viewer'] as const
  const statusKeys = ['active', 'pending', 'disabled'] as const
  const d = new Date(2026, 0, 1 + i * 3)
  return {
    id: i + 1,
    name,
    avatar: avatarOf(name.slice(-1), i),
    email: `user${i + 1}@example.com`,
    role: roleKeys[i % 3],
    status: statusKeys[i % 3],
    score: (i % 5) + 1,
    progress: (i * 7) % 101,
    amount: (i + 1) * 1288.5,
    createdAt: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(8 + (i % 10))}:${pad((i * 7) % 60)}:00`,
  }
})

/** 可被 signal 打断的延时，用来真实验证「切页丢掉旧请求」 */
export function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      const err = new Error('request aborted')
      err.name = 'AbortError'
      reject(err)
    })
  })
}

/** 表格页和列表页共用的请求：筛选 + 服务端排序 + 分页 + 可取消 */
export const requestUsers: ProRequest<User> = async (params, sort, { signal }) => {
  await delay(450, signal)
  let list = ALL.slice()

  if (params.name) list = list.filter((u) => u.name.includes(String(params.name)))
  if (params.role) list = list.filter((u) => u.role === params.role)
  if (params.status) list = list.filter((u) => u.status === params.status)
  if (params.startTime && params.endTime) {
    list = list.filter(
      (u) => u.createdAt >= `${params.startTime} 00:00:00` && u.createdAt <= `${params.endTime} 23:59:59`,
    )
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
