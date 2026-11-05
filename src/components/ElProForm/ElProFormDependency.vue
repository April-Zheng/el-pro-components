<script setup lang="ts">
/**
 * ElProFormDependency —— 按「其它字段的当前值」渲染任意子树。
 *
 * 与列级 `dependency` 的分工：列级只决定**某一列**显不显示、长什么样；
 * 这个组件决定**一段任意内容**（若干字段、说明文字、甚至另一张表单）渲不渲染。
 * 对齐 React 的 ProFormDependency：children 是个作用域插槽，拿到依赖字段的当前值。
 *
 * 依赖关系写在 `name` 里（与列级 dependsOn 同款字符串，支持 `a.b` 路径），
 * 响应式只跟踪这几个字段，改无关字段不会触发子树重算。
 */
import { computed } from 'vue'
import { pickDeps } from '../../core/formDependency'

defineOptions({ name: 'ElProFormDependency' })

const props = defineProps<{
  /** 表单数据对象（外层那个） */
  model: Record<string, any>
  /** 依赖的字段路径。单个字符串或数组；数组时插槽拿到 `{ a, b }` 形状 */
  name: string | string[]
}>()

const scoped = computed(() => pickDeps(props.model, Array.isArray(props.name) ? props.name : [props.name]))

/** 单字段时直接给值，多字段给对象——与 React 的 name 语义一致 */
const slotProps = computed(() => (Array.isArray(props.name) ? scoped.value : scoped.value[props.name as string]))
</script>

<template>
  <slot :values="scoped" :value="slotProps">
    <!-- 未提供插槽内容时什么都不渲染：这个组件的意义就是「按依赖决定渲染」 -->
  </slot>
</template>
