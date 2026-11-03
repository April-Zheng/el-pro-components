<script setup lang="ts">
/** 未实现的菜单项（比如分组菜单里的深层子项）落到这里，用来验证菜单高亮与面包屑 */
defineProps<{ path: string }>()
</script>

<template>
  <div class="demo-card">
    <h3 class="demo-section-title">{{ path }}</h3>
    <p class="demo-section-desc">占位页面，用来验证菜单高亮与面包屑。</p>
  </div>
</template>
