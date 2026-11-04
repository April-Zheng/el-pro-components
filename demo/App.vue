<script setup lang="ts">
/**
 * demo 的壳：侧边布局 + 按 active 切页。
 *
 * 这里刻意只留「路由」这一件事 —— 每个示例页的具体内容在 ./pages/，
 * 数据与字典在 ./data/，改某个示例不用在 600 行的文件里翻。
 */
import { ref } from 'vue'
import { ElTag } from 'element-plus'
import { ElProLayout } from '@/index'
import { initialPage, menus } from './menu'
import UsersPage from './pages/UsersPage.vue'
import OrderPage from './pages/OrderPage.vue'
import PageContainerPage from './pages/PageContainerPage.vue'
import GroupedPage from './pages/GroupedPage.vue'
import FormPage from './pages/FormPage.vue'
import FormContainerPage from './pages/FormContainerPage.vue'
import FormListPage from './pages/FormListPage.vue'
import StepsFormPage from './pages/StepsFormPage.vue'
import LightFilterPage from './pages/LightFilterPage.vue'
import QueryFilterPage from './pages/QueryFilterPage.vue'
import DetailPage from './pages/DetailPage.vue'
import CardPage from './pages/CardPage.vue'
import StatisticPage from './pages/StatisticPage.vue'
import ListPage from './pages/ListPage.vue'
import EditablePage from './pages/EditablePage.vue'
import DataModePage from './pages/DataModePage.vue'
import TableInteractivePage from './pages/TableInteractivePage.vue'
import PlaceholderPage from './pages/PlaceholderPage.vue'

const active = ref(initialPage())
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

    <UsersPage v-if="active === '/users'" />
    <OrderPage v-else-if="active === '/order'" />
    <PageContainerPage v-else-if="active === '/page-container'" />
    <GroupedPage v-else-if="active === '/grouped'" />
    <FormPage v-else-if="active === '/form'" />
    <FormContainerPage v-else-if="active === '/form-container'" />
    <FormListPage v-else-if="active === '/form-list'" />
    <StepsFormPage v-else-if="active === '/steps-form'" />
    <LightFilterPage v-else-if="active === '/light-filter'" />
    <QueryFilterPage v-else-if="active === '/query-filter'" />
    <DetailPage v-else-if="active === '/detail'" />
    <CardPage v-else-if="active === '/card'" />
    <StatisticPage v-else-if="active === '/statistic'" />
    <ListPage v-else-if="active === '/list'" />
    <EditablePage v-else-if="active === '/editable'" />
    <DataModePage v-else-if="active === '/data-mode'" />
    <TableInteractivePage v-else-if="active === '/table-interactive'" />
    <PlaceholderPage v-else :path="active" />

    <template #footer>
      el-pro-components · 由列 schema 驱动 · valueType 渲染器内核 + request 生命周期
    </template>
  </ElProLayout>
</template>
