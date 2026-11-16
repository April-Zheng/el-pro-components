<script setup lang="ts">
/**
 * ElProLayout 的独立 / 非受控用法演示。
 *
 * 目的：把「不绑 v-model:collapsed、只给 default-collapsed」这条非受控路径露出来 ——
 * 预期是点内层顶栏左边的折叠按钮，侧栏收起；若点了没反应，即非受控折叠未生效。
 * 下面再放一张绑了 v-model:collapsed 的受控布局作对照。
 */
import { ref } from 'vue'
import { ElProLayout } from '@/index'
import type { ProLayoutMenuItem } from '@/index'

const menus: ProLayoutMenuItem[] = [
  { title: '仪表盘', path: '/dash' },
  { title: '订单管理', path: '/orders' },
  { title: '用户', path: '/users' },
  { title: '外部文档', href: 'https://element-plus.org' },
]

/** 带 query 的菜单：router 模式跳转时 query 拼进路由参数，index 仍是 path */
const queryMenus: ProLayoutMenuItem[] = [
  { title: '用户（带 query）', path: '/users', query: { tab: 'audit' } },
]

const controlledCollapsed = ref(false)

const boxStyle =
  'height: 380px; overflow: hidden; border: 1px solid var(--el-border-color-lighter); border-radius: 6px'
</script>

<template>
  <div class="demo-card">
    <h3 class="demo-section-title">非受控折叠（只给 default-collapsed，不绑 v-model:collapsed）</h3>
    <p class="demo-section-desc">
      点内层顶栏左边的折叠按钮：侧栏收起 / 展开。这张不绑 v-model，状态由布局内部维护
      （光标 hover 到按钮上有「收起菜单 / 展开菜单」提示）。
    </p>
    <div :style="boxStyle">
      <ElProLayout
        :menus="menus"
        active-path="/dash"
        :router="false"
        :default-collapsed="false"
        title="非受控"
        style="min-height: 100%"
      >
        <p class="demo-p">非受控布局的内容区。</p>
      </ElProLayout>
    </div>
  </div>

  <div class="demo-card" style="margin-top: 16px">
    <h3 class="demo-section-title">菜单外链与 query（href / query 字段）</h3>
    <p class="demo-section-desc">
      「外部文档」配了 href：点击新窗打开外链，不触发内部路由；「用户（带 query）」配了
      query：router 模式跳转时拼进路由参数，菜单高亮仍按 path 匹配。第二张开了 router
      模式并 mock 了跳转，实际项目里接 vue-router 后 push 的就是 { path, query }。
    </p>
    <div :style="boxStyle">
      <ElProLayout
        :menus="queryMenus"
        active-path="/users"
        router
        title="带 query"
        style="min-height: 100%"
      >
        <p class="demo-p">router 模式：点菜单项走 el-menu 的 router 跳转，query 随 route 对象传递。</p>
      </ElProLayout>
    </div>
  </div>

  <div class="demo-card" style="margin-top: 16px">
    <h3 class="demo-section-title">受控折叠（绑 v-model:collapsed，作对照）</h3>
    <p class="demo-section-desc">
      当前 collapsed = <b>{{ controlledCollapsed }}</b>。这张点折叠按钮会正常收起。
    </p>
    <div :style="boxStyle">
      <ElProLayout
        v-model:collapsed="controlledCollapsed"
        :menus="menus"
        active-path="/dash"
        :router="false"
        title="受控"
        style="min-height: 100%"
      >
        <p class="demo-p">受控布局的内容区。</p>
      </ElProLayout>
    </div>
  </div>
</template>
