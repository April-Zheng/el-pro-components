<script setup lang="ts">
/**
 * 展示类组件补齐示例：批次 5 的能力逐块演示。
 */
import { reactive, ref } from 'vue'
import { ElAlert, ElButton, ElMessage } from 'element-plus'
import {
  ElProCard,
  ElProCardDivider,
  ElProCheckCard,
  ElProCheckCardGroup,
  ElProDescriptions,
  ElProList,
  ElProSkeleton,
  ElProStatisticCard,
} from '@/index'
import type { ProColumn } from '@/index'

/* ------------------------- 1. Descriptions editable 等 ------------------------- */

const detail = reactive({
  name: '张三',
  'org.name': '研发中心 / 前端组',
  role: 'admin',
  amount: 1234.5,
})
const detailColumns: ProColumn[] = [
  { prop: 'name', label: '姓名', labelTooltip: '员工的真实姓名，可在系统内修改' },
  { prop: 'org.name', label: '所属组织' },
  { prop: 'role', label: '角色', valueType: 'tag', valueEnum: { admin: '管理员', user: '用户' } },
  { prop: 'amount', label: '额度', valueType: 'money' },
  { prop: 'actions', label: '操作', valueType: 'option' },
]
async function saveDetail(key: string, value: any) {
  await new Promise((r) => setTimeout(r, 400))
  ElMessage.success(`已保存 ${key} = ${JSON.stringify(value)}`)
}

/* ------------------------- 3. List 行选择 / 展开行 / loadMore ------------------------- */

interface Msg {
  id: number
  title: string
  desc: string
  amount: number
}
const pageSize = 4
const nextId = ref(9)
const listData = ref<Msg[]>(
  Array.from({ length: pageSize }, (_, i) => ({
    id: i + 1,
    title: `工单 ${i + 1}`,
    desc: '待处理',
    amount: (i + 1) * 50,
  })),
)
const listSelectedKeys = ref<(string | number)[]>([])
const listExpandedKeys = ref<(string | number)[]>([1])
const listColumns: ProColumn<Msg>[] = [
  { prop: 'title', label: '标题', listSlot: 'title' },
  { prop: 'desc', label: '描述', listSlot: 'description' },
  { prop: 'amount', label: '金额', valueType: 'money', listSlot: 'extra' },
]
async function loadMore() {
  await new Promise((r) => setTimeout(r, 600))
  const from = nextId.value
  listData.value = [
    ...listData.value,
    ...Array.from({ length: 2 }, (_, i) => ({
      id: from + i,
      title: `工单 ${from + i}`,
      desc: '已加载',
      amount: (from + i) * 50,
    })),
  ]
  nextId.value = from + 2
}

/* ------------------------- 5/6. CheckCard ------------------------- */

const groupModel = ref('basic')
const ghostModel = ref(true)

/* ------------------------- 8. Skeleton 页面级 ------------------------- */
</script>

<template>
  <div class="display-advanced-page">
    <ElAlert title="本页演示批次 5 的展示类组件补齐，每块对应一项能力" type="info" :closable="false" show-icon />

    <!-- 1/2. Descriptions -->
    <section>
      <h4>1. Descriptions：editable 就地编辑 + option 归 extra + 嵌套路径 + label tooltip + order</h4>
      <p class="hint">悬浮任意字段出现编辑图标；「操作」列渲染在右上角 extra 区；「所属组织」用了嵌套路径</p>
      <ElProDescriptions
        :columns="detailColumns"
        :data="detail"
        editable
        :on-save="saveDetail"
      >
        <template #actions>
          <ElButton size="small" @click="ElMessage.info('编辑资料')">编辑资料</ElButton>
        </template>
      </ElProDescriptions>
    </section>

    <!-- 3. List -->
    <section>
      <h4>3. List：行选择 + 展开行 + 操作区 hover 显示 + loadMore（无分页）</h4>
      <p class="hint">勾选任意条目；点标题旁箭头展开；悬浮条目才出现操作区；底部「加载更多」</p>
      <ElProList
        v-model:selected-keys="listSelectedKeys"
        v-model:expanded-keys="listExpandedKeys"
        :columns="listColumns"
        :data-source="listData"
        selection
        expandable
        show-actions="hover"
        show-extra="hover"
        :load-more="loadMore"
        :pagination="false"
        row-key="id"
        @selection-change="(rows: Msg[]) => ElMessage.info(`已选 ${rows.length} 条`)"
      >
        <template #expanded-row-render="{ item }">
          工单 #{{ item.id }} 的处理记录：创建于本月初，当前处理人「李四」。
        </template>
        <template #actions="{ item }">
          <ElButton link type="primary" size="small" @click="ElMessage.info(`处理 ${item.title}`)">处理</ElButton>
        </template>
      </ElProList>
    </section>

    <!-- 4. CheckCardGroup / CheckCard -->
    <section>
      <h4>4. CheckCardGroup：loading 骨架 / string 选项 / bordered / size=large；CheckCard：actions / ghost / bodyStyle</h4>
      <p class="hint">上排：string 选项 + bordered + large；下排：ghost 卡片带底部操作区</p>
      <ElProCheckCardGroup v-model="groupModel" :options="['基础版', '专业版', '旗舰版']" bordered size="large" :column="3" />
      <div style="height: 12px" />
      <ElProCheckCardGroup v-model="ghostModel" multiple :column="2">
        <ElProCheckCard value="a" title="数据看板" :body-style="{ padding: '12px' }" ghost>
          <template #actions>
            <ElButton size="small" @click="ElMessage.info('配置数据看板')">配置</ElButton>
          </template>
        </ElProCheckCard>
        <ElProCheckCard value="b" title="定时报告" :body-style="{ padding: '12px' }" ghost>
          <template #actions>
            <ElButton size="small" @click="ElMessage.info('配置定时报告')">配置</ElButton>
          </template>
        </ElProCheckCard>
      </ElProCheckCardGroup>
    </section>

    <!-- 5/6. ProCard center + Divider + StatisticCard 操作区 -->
    <section>
      <h4>5. ProCard layout='center' + Divider；StatisticCard 右侧操作区</h4>
      <div style="display: flex; gap: 16px; flex-wrap: wrap">
        <ElProCard title="空态入口" layout="center" style="width: 280px">
          <p style="margin: 0">暂无数据，点击下方按钮创建</p>
          <ElButton type="primary" size="small" style="margin-top: 8px" @click="ElMessage.info('创建')">去创建</ElButton>
        </ElProCard>

        <ElProCard title="今日概览" style="flex: 1; min-width: 320px">
          <div style="display: flex">
            <div style="flex: 1">
              <ElProStatisticCard :statistic="{ title: '支付金额', value: 234566, precision: 2 }" />
              <ElProCardDivider type="horizontal" />
              <ElProStatisticCard :statistic="{ title: '支付笔数', value: 1234 }" />
            </div>
            <ElProCardDivider />
            <ElProStatisticCard :statistic="{ title: '转化率', value: 60 }">
              <template #actions>
                <ElButton link type="primary" size="small">明细</ElButton>
                <ElButton link size="small">导出</ElButton>
              </template>
            </ElProStatisticCard>
          </div>
        </ElProCard>
      </div>
    </section>

    <!-- 7. Skeleton 页面级组合 -->
    <section>
      <h4>7. Skeleton 页面级组合（pageHeader + statistic + toolbar + 列表）</h4>
      <ElProSkeleton type="list" :rows="3" page-header :statistic="3" toolbar />
    </section>
  </div>
</template>

<style>
.display-advanced-page section {
  margin-top: 24px;
}
.display-advanced-page h4 {
  margin: 0 0 4px;
  font-size: 14px;
}
.display-advanced-page .hint {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
