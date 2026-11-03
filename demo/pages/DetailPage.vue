<script setup lang="ts">
/** 详情页示例：与表格共用同一份列定义，所以 tag/status 的呈现自动一致 */
import { ElProDescriptions } from '@/index'
import type { ProColumn } from '@/index'
import { ROLE_ENUM, STATUS_ENUM } from '../data/enums'
import { ALL } from '../data/mock'
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
    <h3 class="demo-section-title">单列 / 竖排</h3>
    <p class="demo-section-desc">column 控制每行列数。</p>
    <ElProDescriptions :columns="detailCols.slice(0, 4)" :data="detailData" :column="1" />
  </div>
</template>
