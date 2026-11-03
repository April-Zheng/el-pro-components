<script setup lang="ts">
/**
 * 分组表头示例：多级表头 + 默认插槽插展开行 + 列设置里的分组。
 *
 * 三件事都在一个页面里，因为它们在真实业务里总是一起出现：
 * 一张「用户运营」表，前半是基础信息、中间是业绩，还要能展开看备注。
 */
import { ElButton, ElTableColumn, ElTag } from 'element-plus'
import { ElProTable } from '@/index'
import type { ProColumn } from '@/index'
import { ROLE_ENUM, STATUS_ENUM } from '../data/enums'
import { requestUsers } from '../data/mock'
import type { User } from '../data/mock'

const groupedColumns: ProColumn<User>[] = [
  {
    label: '基础信息',
    children: [
      { prop: 'name', label: '姓名', copyable: true, width: 120 },
      { prop: 'email', label: '邮箱', minWidth: 180 },
    ],
  },
  {
    label: '业绩',
    children: [
      { prop: 'score', label: '评分', valueType: 'rate', width: 140 },
      { prop: 'progress', label: '完成度', valueType: 'progress', width: 160 },
      { prop: 'amount', label: '金额', valueType: 'money', sortable: 'custom', width: 140 },
    ],
  },
  { prop: 'role', label: '角色', valueType: 'tag', valueEnum: ROLE_ENUM, width: 110 },
  { prop: 'status', label: '状态', valueType: 'status', valueEnum: STATUS_ENUM, width: 110 },
  { prop: 'createdAt', label: '创建时间', valueType: 'dateTime', width: 170 },
  { valueType: 'option', label: '操作', width: 100 },
]
</script>

<template>
  <div class="demo-card">
    <h3 class="demo-section-title">多级表头</h3>
    <p class="demo-section-desc">
      <code>columns</code> 里写 <code>children</code> 就是分组表头，可以继续嵌套。
      分组列自己不产生单元格，所以不需要 <code>prop</code>；它下面的叶子列照旧写。
    </p>

    <ElProTable
      :columns="groupedColumns"
      :request="requestUsers"
      row-key="id"
      :search="false"
      :pagination="{ pageSizes: [5, 10, 20] }"
      :default-page-size="5"
      persistence-key="demo-grouped"
    >
      <!-- 默认插槽 = 往表格里插任意 el-table-column。这里插一个展开行 -->
      <ElTableColumn type="expand" width="40">
        <template #default="{ row }">
          <div class="demo-expand">
            <p><b>备注：</b>{{ row.desc || '（无）' }}</p>
            <p>
              <b>标签：</b>
              <ElTag v-for="tag in row.tags" :key="tag" size="small" style="margin-right: 6px">
                {{ tag }}
              </ElTag>
            </p>
          </div>
        </template>
      </ElTableColumn>

      <template #option="{ row }">
        <ElButton link type="primary" size="small" @click="() => console.log('[查看]', row.id)">
          查看
        </ElButton>
      </template>
    </ElProTable>
  </div>

  <div class="demo-hint">
    右上角齿轮里可以看到分组：组的勾选框是「全选/全不选它下面的叶子」，子列缩进显示。
    有分组时<strong>拖拽排序会关闭</strong> —— 顺序存的是扁平 prop 数组，表达不了「换到另一个组里去」，
    与其拖了没反应，不如不给。<strong>分组下的子列也没有固定按钮</strong>：el-table 固定的是顶层列，
    固定在分组下面是无效的。
  </div>
</template>

<style>
.demo-expand {
  padding: 4px 16px 12px 48px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.8;
}
.demo-expand p {
  margin: 0;
}
</style>
