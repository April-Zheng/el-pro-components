<script setup lang="ts">
import { h, reactive, ref } from 'vue'
import { ElButton, ElDialog, ElMessage, ElMessageBox, ElTag } from 'element-plus'
import {
  ElProDescriptions,
  ElProForm,
  ElProLayout,
  ElProTable,
} from '@/index'
import type { ProColumn, ProLayoutMenuItem, ProRequest, ValueEnum } from '@/index'

/* ============================== 菜单 ============================== */

const IconList = () =>
  h('svg', { viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.4 }, [
    h('rect', { x: 2, y: 3, width: 12, height: 10, rx: 1.5 }),
    h('path', { d: 'M2 6.5h12M6.2 6.5V13' }),
  ])

const menus: ProLayoutMenuItem[] = [
  { title: '用户列表', path: '/users', icon: IconList },
  { title: '表单示例', path: '/form' },
  { title: '详情示例', path: '/detail' },
  {
    title: '分组菜单',
    children: [
      { title: '一级子项', path: '/group/a' },
      { title: '二级嵌二级', children: [{ title: '深层子项', path: '/group/b/c', badge: 3 }] },
    ],
  },
]

/** 支持 ?page=/form 直接打开某个页面，方便截图与分享 */
const initialPage =
  typeof location !== 'undefined' ? new URLSearchParams(location.search).get('page') : null

const active = ref(initialPage || '/users')

/* ============================== 字典 ============================== */

const ROLE_ENUM: ValueEnum = {
  admin: { text: '管理员', status: 'danger' },
  editor: { text: '编辑', status: 'primary' },
  viewer: { text: '访客', status: 'info' },
}

const STATUS_ENUM: ValueEnum = {
  active: { text: '正常', status: 'success' },
  pending: { text: '待审核', status: 'warning' },
  disabled: { text: '已停用', status: 'info' },
}

/* ============================== Mock 数据 ============================== */

interface User {
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

const ALL: User[] = Array.from({ length: 87 }, (_, i) => {
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
function delay(ms: number, signal?: AbortSignal) {
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

const requestUsers: ProRequest<User> = async (params, sort, { signal }) => {
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

/* ============================== 表格 ============================== */

const columns: ProColumn<User>[] = [
  { prop: 'id', label: 'ID', valueType: 'indexBorder', width: 64, fixed: 'left', search: false },
  { prop: 'name', label: '姓名', valueType: 'text', copyable: true, minWidth: 110 },
  { prop: 'avatar', label: '头像', valueType: 'avatar', width: 76 },
  { prop: 'email', label: '邮箱', minWidth: 180, hideInTable: true },
  { prop: 'role', label: '角色', valueType: 'tag', valueEnum: ROLE_ENUM, width: 100 },
  { prop: 'status', label: '状态', valueType: 'status', valueEnum: STATUS_ENUM, width: 110 },
  { prop: 'score', label: '评分', valueType: 'rate', width: 132, search: false },
  { prop: 'progress', label: '完成度', valueType: 'progress', minWidth: 130, search: false },
  {
    prop: 'amount',
    label: '金额',
    valueType: 'money',
    width: 132,
    align: 'right',
    sortable: 'custom',
    search: false,
  },
  {
    prop: 'createdAt',
    label: '创建时间',
    valueType: 'dateTime',
    width: 172,
    sortable: 'custom',
    search: {
      span: 8,
      valueType: 'dateRange',
      transform: (v: string[]) =>
        Array.isArray(v) && v.length === 2 ? { startTime: v[0], endTime: v[1] } : {},
    },
  },
  { prop: 'actions', label: '操作', valueType: 'option', width: 128, fixed: 'right' },
]

const tableRef = ref<InstanceType<typeof ElProTable>>()
const selectedRows = ref<User[]>([])

function onSelectionChange(rows: User[]) {
  selectedRows.value = rows
}

const dialogVisible = ref(false)
const dialogTitle = ref('新建用户')
const editing = reactive<Record<string, any>>({})

const editColumns: ProColumn[] = [
  { prop: 'name', label: '姓名', valueType: 'text', rules: [{ required: true, message: '请输入姓名', trigger: 'blur' }] },
  { prop: 'email', label: '邮箱', valueType: 'text', rules: [{ required: true, message: '请输入邮箱', trigger: 'blur' }] },
  { prop: 'role', label: '角色', valueType: 'select', valueEnum: ROLE_ENUM },
  { prop: 'status', label: '状态', valueType: 'radioButton', valueEnum: STATUS_ENUM },
  { prop: 'amount', label: '金额', valueType: 'money' },
  { prop: 'enabled', label: '启用', valueType: 'switch' },
]

function openEdit(row: User) {
  for (const key of Object.keys(editing)) delete editing[key]
  Object.assign(editing, row)
  dialogTitle.value = `编辑：${row.name}`
  dialogVisible.value = true
}

function openCreate() {
  for (const key of Object.keys(editing)) delete editing[key]
  Object.assign(editing, { name: '', email: '', role: 'viewer', status: 'pending', amount: 0, enabled: true })
  dialogTitle.value = '新建用户'
  dialogVisible.value = true
}

function submitEdit() {
  ElMessage.success(`已提交：${editing.name || '(未命名)'}`)
  dialogVisible.value = false
  tableRef.value?.reload()
}

async function removeUser(row: User) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.name}」吗？`, '提示', { type: 'warning' })
    ElMessage.success('已删除（演示，不真的改数据）')
    tableRef.value?.reloadAndRest()
  } catch {
    /* 取消 */
  }
}

function batchRemove(rows: User[]) {
  ElMessage.warning(`已选中 ${rows.length} 项（演示）`)
}

/* ============================== 表单 ============================== */

const formColumns: ProColumn[] = [
  { prop: 'name', label: '项目名称', valueType: 'text', rules: [{ required: true, message: '请输入项目名称', trigger: 'blur' }] },
  { prop: 'owner', label: '负责人', valueType: 'select', valueEnum: ROLE_ENUM },
  { prop: 'level', label: '优先级', valueType: 'radioButton', valueEnum: { high: '高', mid: '中', low: '低' } },
  { prop: 'tags', label: '标签', valueType: 'checkbox', valueEnum: { front: '前端', back: '后端', ops: '运维' } },
  { prop: 'budget', label: '预算', valueType: 'money', fieldProps: { min: 0, step: 1000 } },
  { prop: 'ratio', label: '完成比例', valueType: 'slider', formSpan: 24, fieldProps: { max: 100, showInput: true } },
  { prop: 'startDate', label: '开始日期', valueType: 'date' },
  { prop: 'period', label: '周期', valueType: 'dateRange' },
  { prop: 'notify', label: '通知方式', valueType: 'segmented', valueEnum: { mail: '邮件', sms: '短信', none: '不通知' } },
  { prop: 'theme', label: '主题色', valueType: 'color' },
  { prop: 'enabled', label: '启用', valueType: 'switch' },
  { valueType: 'divider', label: '补充信息' },
  { prop: 'desc', label: '描述', valueType: 'textarea', formSpan: 24 },
  { prop: 'expire', label: '过期时间', valueType: 'dateTime' },
]

const formModel = reactive<Record<string, any>>({
  name: 'Element Plus Pro',
  owner: 'editor',
  level: 'mid',
  tags: ['front'],
  budget: 20000,
  ratio: 65,
  startDate: '2026-11-02',
  period: ['2026-11-01', '2026-11-30'],
  notify: 'mail',
  theme: '#409eff',
  enabled: true,
  desc: '',
  expire: '',
})

function onSubmit(model: Record<string, any>) {
  ElMessage.success(`表单校验通过，共 ${Object.keys(model).length} 个字段`)
  console.log('[ElProForm submit]', JSON.parse(JSON.stringify(model)))
}

/* ============================== 详情 ============================== */

const detailData = ALL[0]

const detailCols: ProColumn<User>[] = [
  { prop: 'name', label: '姓名', copyable: true },
  { prop: 'email', label: '邮箱' },
  { prop: 'role', label: '角色', valueType: 'tag', valueEnum: ROLE_ENUM },
  { prop: 'status', label: '状态', valueType: 'status', valueEnum: STATUS_ENUM },
  { prop: 'score', label: '评分', valueType: 'rate' },
  { prop: 'progress', label: '完成度', valueType: 'progress' },
  { prop: 'amount', label: '金额', valueType: 'money' },
  { prop: 'createdAt', label: '创建时间', valueType: 'dateTime' },
  { prop: 'createdAt', label: '距今', valueType: 'fromNow' },
  { prop: 'desc', label: '备注', descriptionsSpan: 3 },
]
</script>

<template>
  <ElProLayout
    :menus="menus"
    :active-path="active"
    :router="false"
    title="el-pro-components"
    @select="(p: string) => (active = p)"
  >
    <template #headerRight>
      <ElTag type="success" size="small" effect="light">Element Plus 版 ProComponents</ElTag>
    </template>

    <!-- ------------------------------ 表格 ------------------------------ -->
    <template v-if="active === '/users'">
      <ElProTable
        ref="tableRef"
        :columns="columns"
        :request="requestUsers"
        row-key="id"
        selection
        title="用户列表"
        tooltip="列配置同时驱动搜索栏、表格列和列设置面板"
        persistence-key="demo-users"
        :default-page-size="10"
        @selection-change="(rows: User[]) => (selectedRows = rows)"
      >
        <template #toolbarActions>
          <ElButton type="primary" @click="openCreate">新建用户</ElButton>
        </template>

        <template #actions="{ row }">
          <ElButton link type="primary" size="small" @click="openEdit(row as User)">编辑</ElButton>
          <ElButton link type="danger" size="small" @click="removeUser(row as User)">删除</ElButton>
        </template>

        <template #batch="{ selected }">
          <ElButton size="small" type="danger" plain @click="batchRemove(selected as User[])">
            批量删除
          </ElButton>
        </template>
      </ElProTable>

      <div class="demo-hint">
        试一下：连续快速点翻页 —— 旧请求会被丢弃，不会出现数据串页。
        <br />
        「创建时间」列在表格里显示到秒，搜索时自动变成日期区间，靠的是
        <code>search.valueType</code> + <code>search.transform</code>。
        <br />
        金额列点表头排序走服务端（<code>sortable="custom"</code>），会重新触发 request。
      </div>
    </template>

    <!-- ------------------------------ 表单 ------------------------------ -->
    <template v-else-if="active === '/form'">
      <div class="demo-card">
        <h3 class="demo-section-title">ElProForm</h3>
        <p class="demo-section-desc">
          一个 columns 数组生成整张表单。valueType 决定控件，rules 决定校验，formSpan 控制栅格。
        </p>

        <ElProForm
          :columns="formColumns"
          :model="formModel"
          :span="8"
          label-width="90px"
          @submit="onSubmit"
        />
      </div>
    </template>

    <!-- ------------------------------ 详情 ------------------------------ -->
    <template v-else-if="active === '/detail'">
      <div class="demo-card">
        <h3 class="demo-section-title">ElProDescriptions</h3>
        <p class="demo-section-desc">
          与表格共用同一份列定义，所以表格里显示成 tag 的字段，这里会自动是同一个 tag。
        </p>

        <ElProDescriptions :columns="detailCols" :data="detailData" :column="3" />
      </div>

      <div class="demo-card" style="margin-top: 16px">
        <h3 class="demo-section-title">单列 / 竖排</h3>
        <p class="demo-section-desc">column 控制每行列数。</p>
        <ElProDescriptions :columns="detailCols.slice(0, 4)" :data="detailData" :column="1" />
      </div>
    </template>

    <template v-else>
      <div class="demo-card">
        <h3 class="demo-section-title">{{ active }}</h3>
        <p class="demo-section-desc">占位页面，用来验证菜单高亮与面包屑。</p>
      </div>
    </template>

    <template #footer>
      el-pro-components · 由列 schema 驱动 · valueType 渲染器内核 + request 生命周期
    </template>
  </ElProLayout>

  <ElDialog v-model="dialogVisible" :title="dialogTitle" width="560px" destroy-on-close>
    <ElProForm
      :columns="editColumns"
      :model="editing"
      :span="12"
      label-width="70px"
      :show-actions="false"
    />
    <template #footer>
      <ElButton @click="dialogVisible = false">取消</ElButton>
      <ElButton type="primary" @click="submitEdit">保存</ElButton>
    </template>
  </ElDialog>
</template>
