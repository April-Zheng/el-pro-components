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
