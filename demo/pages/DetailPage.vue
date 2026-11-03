<script setup lang="ts">
/** 详情页示例：与表格共用同一份列定义，所以 tag/status 的呈现自动一致 */
import { reactive, ref } from 'vue'
import { ElButton } from 'element-plus'
import { ElProDescriptions } from '@/index'
import type { ProColumn, ProDescriptionsRequest } from '@/index'
import { ROLE_ENUM, STATUS_ENUM } from '../data/enums'
import { ALL, delay } from '../data/mock'
import type { User } from '../data/mock'

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

/* ---- request 模式：组件自己拉数据 ---- */

/* ---- second / digitRange 的展示形态 ---- */

const extraCols: ProColumn[] = [
  { prop: 'sla', label: '响应时限', valueType: 'second' },
  { prop: 'seatRange', label: '人数区间', valueType: 'digitRange' },
  { prop: 'badRange', label: '只有一端', valueType: 'digitRange' },
]
const extraData = { sla: 7265, seatRange: [10, 50], badRange: [null, 88] }

const descRef = ref<InstanceType<typeof ElProDescriptions> | null>(null)
const failNext = ref(false)
/** 必须是稳定引用：模板里写 `:params="{ id: 1 }"` 每次渲染都是新对象，会无限重查 */
const descParams = reactive({ id: detailData.id })

const detailRequest: ProDescriptionsRequest<User> = async (params, { signal }) => {
  await delay(600, signal)
  if (failNext.value) {
    return { data: {} as User, success: false, errorMessage: '接口返回业务错误：该记录已归档' }
  }
  return { data: ALL.find((u) => u.id === params.id) ?? ALL[0] }
}
</script>

<template>
  <div class="demo-card">
    <h3 class="demo-section-title">ElProDescriptions</h3>
    <p class="demo-section-desc">
      与表格共用同一份列定义，所以表格里显示成 tag 的字段，这里会自动是同一个 tag。
    </p>

    <ElProDescriptions :columns="detailCols" :data="detailData" :column="3" />
  </div>

  <div class="demo-card" style="margin-top: 16px">
    <h3 class="demo-section-title">request 模式 + 响应式列数</h3>
    <p class="demo-section-desc">
      组件自己拉数据，自带加载骨架与错误提示；<code>column</code> 写成
      <code>{ xs: 1, md: 2, lg: 3 }</code> 后，窄屏不会把标签挤成竖排。
    </p>
    <div style="margin-bottom: 12px; display: flex; gap: 8px">
      <ElButton size="small" @click="descRef?.reload()">重新加载</ElButton>
      <ElButton size="small" :type="failNext ? 'warning' : 'default'" @click="failNext = !failNext">
        {{ failNext ? '下次请求返回业务失败（开）' : '模拟业务失败' }}
      </ElButton>
    </div>
    <ElProDescriptions
      ref="descRef"
      :columns="detailCols.slice(0, 8)"
      :request="detailRequest"
      :params="descParams"
      :column="{ xs: 1, md: 2, lg: 3 }"
    />
  </div>

  <div class="demo-card" style="margin-top: 16px">
    <h3 class="demo-section-title">second / digitRange</h3>
    <p class="demo-section-desc">
      <code>second</code> 的值是秒数，展示成「2小时1分钟5秒」；<code>digitRange</code>
      的值是数组，两端都空时显示占位符，只有一端有值时只显示那一端。
    </p>
    <ElProDescriptions :columns="extraCols" :data="extraData" :column="3" />
  </div>

  <div class="demo-card" style="margin-top: 16px">
    <h3 class="demo-section-title">单列 / 竖排</h3>
    <p class="demo-section-desc">column 控制每行列数。</p>
    <ElProDescriptions :columns="detailCols.slice(0, 4)" :data="detailData" :column="1" />
  </div>
</template>
