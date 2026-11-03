<script setup lang="ts">
/**
 * 查询筛选区示例。
 *
 * 重点不在「能筛」，而在**条件归页面所有**：`model` 是页面自己的响应式对象，
 * 组件只负责渲染和把值交回来。所以同一份条件能同时给表格请求和别处用
 * （这里右侧就把「已提交的条件」原样打了出来）。
 *
 * 另外演示一个常见需求：`expire` 在搜索里是区间选择器（`search.valueType`），
 * 换个场景还能是别的东西，同一列不用写两遍。
 */
import { reactive, ref } from 'vue'
import { ElProQueryFilter } from '@/index'
import type { ProColumn } from '@/index'
import { ROLE_ENUM, STATUS_ENUM } from '../data/enums'

const columns: ProColumn[] = [
  { prop: 'keyword', label: '关键词', valueType: 'text' },
  { prop: 'status', label: '状态', valueType: 'select', valueEnum: STATUS_ENUM },
  { prop: 'role', label: '角色', valueType: 'select', valueEnum: ROLE_ENUM },
  { prop: 'owner', label: '负责人', valueType: 'select', valueEnum: ROLE_ENUM },
  { prop: 'amount', label: '金额下限', valueType: 'money' },
  {
    prop: 'level',
    label: '优先级',
    valueType: 'select',
    valueEnum: { high: '高', mid: '中', low: '低' },
  },
  {
    prop: 'expire',
    label: '过期时间',
    valueType: 'dateTime',
    // 搜索时换成区间选择器：列定义只写一次，两种形态各自声明
    search: { valueType: 'dateRange' },
  },
  { prop: 'enabled', label: '启用', valueType: 'switch' },
]

const model = reactive<Record<string, any>>({ status: 'pending' })

const loading = ref(false)
const submitted = ref('')

function onSearch(values: Record<string, any>) {
  loading.value = true
  // 模拟一次请求，顺便证明按钮上的 loading 是组件接的
  setTimeout(() => {
    loading.value = false
    submitted.value = JSON.stringify(values, null, 2)
  }, 500)
}

function onReset(values: Record<string, any>) {
  submitted.value = JSON.stringify(values, null, 2)
}
</script>

<template>
  <div class="demo-card">
    <h3 class="demo-section-title">ElProQueryFilter</h3>
    <p class="demo-section-desc">
      默认折叠，只露「一行放得下的项数减一」，剩下的收进「展开」。
      条件存在页面里（model），组件不藏私；改窗口宽度会按断点改每项宽度。
    </p>

    <ElProQueryFilter
      :columns="columns"
      :model="model"
      :loading="loading"
      @search="onSearch"
      @reset="onReset"
    />
  </div>

  <div class="demo-card">
    <h3 class="demo-section-title">提交给页面的条件</h3>
    <p class="demo-section-desc">
      点「查询」才更新；重置会回到初始值（这里是 <code>status: pending</code>）。
    </p>
    <pre class="demo-query-json">{{ submitted || '（还没查询）' }}</pre>
  </div>
</template>

<style scoped>
.demo-query-json {
  margin: 0;
  padding: 12px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.6;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}
</style>
