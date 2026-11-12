<script setup lang="ts">
/**
 * 页面容器示例。
 *
 * 这一页想把「一个列表页的骨架」摆出来：页头（面包屑 / 标题 / 标签 / 说明 / tab）
 * 归 ElProPageContainer，表格只管列和接口，底部固定条归 `#footer` 插槽。
 *
 * 几个值得点一点的地方：
 * - 返回按钮不是开关控制的，**只要你监听了 `@back` 它就会出现**（源码就是这么判的）
 * - 吸顶用 el-affix，滚动时页头留在顶部，内容从它下面过
 * - 底部条是 fixed 的，左边要避开侧栏 —— `offsetLeft` 吃 `--el-pro-sider-width`，
 *   折叠菜单时会跟着变
 * - `loading` 只顶掉内容区，页头和 tab 还在，切页面时不会闪
 */
import { ref } from 'vue'
import { ElButton, ElMessage } from 'element-plus'
import { ElProPageContainer, ElProPageHeader, ElProTable } from '@/index'
import type { ProColumn, ProPageTab } from '@/index'
import { ROLE_ENUM, STATUS_ENUM } from '../data/enums'
import { requestUsers } from '../data/mock'
import type { User } from '../data/mock'

const columns: ProColumn<User>[] = [
  { prop: 'name', label: '姓名', valueType: 'text', minWidth: 110 },
  { prop: 'avatar', label: '头像', valueType: 'avatar', width: 76 },
  { prop: 'role', label: '角色', valueType: 'tag', valueEnum: ROLE_ENUM, width: 100 },
  { prop: 'status', label: '状态', valueType: 'status', valueEnum: STATUS_ENUM, width: 110 },
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
    search: { span: 8, valueType: 'dateRange' },
  },
]

const tabList: ProPageTab[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '启用中' },
  { key: 'archived', label: '已归档', disabled: true },
]

const activeTab = ref<string | number>('all')
const fixedHeader = ref(true)
const loading = ref(false)
const selected = ref<User[]>([])

function simulateLoading() {
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 900)
}

function onBack() {
  ElMessage.info('收到 back 事件（真实项目里这里 router.back()）')
}

function onBreadcrumbClick(item: { title: string; path?: string }) {
  ElMessage.info(`面包屑点击：${item.title} → ${item.path}`)
}

function batchRemove() {
  ElMessage.warning(`批量删除 ${selected.value.length} 项（演示）`)
}
</script>

<template>
  <div class="page-container-demo">
    <ElProPageContainer
      v-model:tab-active-key="activeTab"
      title="用户管理"
      sub-title="列表页骨架"
      :tags="[{ text: '运行中', type: 'success' }, '只读演示']"
      :breadcrumb="[
        { title: '首页', path: '/' },
        { title: '系统管理', path: '/system' },
        { title: '用户管理' },
      ]"
      content="页头、内容区、底部操作条都由 ElProPageContainer 提供，表格只需要给列和接口。"
      :tab-list="tabList"
      :fixed-header="fixedHeader"
      :loading="loading"
      :footer-tool-bar-props="{ offsetLeft: 'var(--el-pro-sider-width, 0px)' }"
      @back="onBack"
      @breadcrumb-click="onBreadcrumbClick"
    >
      <template #extra>
        <ElButton size="small" @click="simulateLoading">模拟加载</ElButton>
        <ElButton size="small" @click="fixedHeader = !fixedHeader">
          {{ fixedHeader ? '取消吸顶' : '吸顶页头' }}
        </ElButton>
      </template>

      <template #extraContent>
        <div class="page-container-demo__stat">
          <span class="page-container-demo__stat-label">当前 tab</span>
          <span class="page-container-demo__stat-value">{{ activeTab }}</span>
        </div>
      </template>

      <template #tabBarExtra>
        <ElButton size="small" text type="primary" @click="simulateLoading">刷新</ElButton>
      </template>

      <template #footerExtra>已选 {{ selected.length }} 项</template>

      <template #footer>
        <ElButton size="small" :disabled="!selected.length" @click="selected = []">清空选择</ElButton>
        <ElButton
          size="small"
          type="danger"
          plain
          :disabled="!selected.length"
          @click="batchRemove"
        >
          批量删除
        </ElButton>
        <ElButton size="small" type="primary" @click="ElMessage.success('已保存（演示）')">
          保存
        </ElButton>
      </template>

      <ElProTable
        :columns="columns"
        :request="requestUsers"
        row-key="id"
        selection
        :search="false"
        :default-page-size="8"
        @selection-change="(rows: User[]) => (selected = rows)"
      />
    </ElProPageContainer>

    <div class="demo-card" style="margin-top: 16px">
      <h3 class="demo-section-title">ElProPageHeader 独立使用 · content 简写</h3>
      <p class="demo-section-desc">
        `content="…"` 直接渲染说明行。上面的容器里说明行走的是页面容器自带的说明区；
        独立用页头时它此前是死代码，现已生效。
      </p>
      <ElProPageHeader
        title="独立页头"
        sub-title="subTitle"
        content="这行文字来自 content 属性。"
        :tags="['独立']"
        :breadcrumb="[{ title: '首页', path: '/' }, { title: '独立页头' }]"
        @back="onBack"
      />
    </div>

    <div class="demo-card" style="margin-top: 16px">
      <h3 class="demo-section-title">ElProPageContainer · 非受控 tab（不绑 v-model:tab-active-key）</h3>
      <p class="demo-section-desc">
        只给 `tab-list`、不绑 `tab-active-key`：组件应默认选中第一个「全部」
        （此前内部初值是空串，导致一个都不选中）。
      </p>
      <ElProPageContainer
        title="非受控 tab"
        content="没有 v-model:tab-active-key，选中态由组件自己接管。"
        :tab-list="tabList"
      >
        <ElProTable
          :columns="columns"
          :request="requestUsers"
          row-key="id"
          :search="false"
          :default-page-size="5"
        />
      </ElProPageContainer>
    </div>
  </div>
</template>

<style scoped>
/* 抵掉 demo 布局给内容区的内边距，让它贴着页面边缘，看得出页头真正的样子 */
.page-container-demo {
  margin: -16px;
}
.page-container-demo__stat {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}
.page-container-demo__stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.page-container-demo__stat-value {
  font-size: 18px;
  font-weight: 500;
  color: var(--el-color-primary);
}
</style>
