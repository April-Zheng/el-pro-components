<script setup lang="ts">
/**
 * 递归渲染一个列节点：有 `children` 就渲染成分组表头，否则渲染成真正的列。
 *
 * 抽出来的唯一原因是**递归**：`el-table` 的多级表头靠 `el-table-column` 嵌套，
 * 而模板没法自己调自己写在同一层，只能做成组件。既然要拆，
 * 顺带把单元格那 80 行模板也搬过来，ElProTable 就只剩「布局 + 状态」。
 *
 * 单元格要用到的状态（编辑态、插槽、草稿值）全部来自 PRO_TABLE_CELL 上下文，
 * 所以这一层递归无论多深都不用多传参数。
 */
import { computed, inject } from 'vue'
import { ElButton, ElTableColumn } from 'element-plus'
import CellRenderer from '../../fields/CellRenderer.vue'
import FormField from '../../fields/FormField.vue'
import { PRO_TABLE_CELL } from '../../core/tableCellContext'
import type { ProColumn } from '../../types'

defineOptions({ name: 'TableColumnNode' })

const props = defineProps<{
  column: ProColumn
  /** 递归深度，只用于给分组表头加 class，不影响逻辑 */
  depth?: number
}>()

/**
 * 显式声明插槽类型。
 *
 * 不写的话，递归分支里 `#editableActions="scope"` 的 scope 会因为「自己转发给自己」
 * 推断成循环引用，vue-tsc 直接报 TS7022。
 *
 * 末尾那条索引签名是给**动态列插槽**用的：`<slot :name="列 prop">` 的插槽名是运行时
 * 才确定的，只声明具名插槽的话索引会报 TS7053。
 */
defineSlots<{
  editableActions?: (scope: {
    row: any
    column: ProColumn
    index: number
    editing: boolean
    edit: () => void
    save: () => void
    cancel: () => void
    remove: () => void
  }) => any
  [name: string]: ((scope: any) => any) | undefined
}>()

const ctx = inject(PRO_TABLE_CELL)
if (!ctx) {
  throw new Error('[ElProTable] TableColumnNode 必须放在 ElProTable 内部使用')
}

const children = computed(() => props.column.children ?? [])
const isGroup = computed(() => children.value.length > 0)

/**
 * 列宽怎么交给 el-table，决定了这张表能不能撑满容器。
 *
 * el-table 只在**存在没有 width 的列**时才把剩余空间分出去
 * （table-layout.mjs：`if (flexColumns.length > 0 && fit)`，flexColumns 就是
 * 「width 不是数字」的列）。schema 里每列都老老实实写了 width 时，它一步都不动 ——
 * 表格停在 Σwidth，右边留一条空白，看起来像没撑开。
 *
 * antd 不是这个脾气：`table-layout: auto` 下 width 只是下限，多出来的宽度
 * 由浏览器摊给所有列。所以这里把 width 当 **min-width** 传，让每列都成为
 * flex 列，撑满行为就和 antd 对齐了；容器真不够宽时 el-table 会置 scrollX 并
 * 回落到 min-width，和原来的表现一样。
 *
 * 要钉死某列宽度（图标列、操作列这种不希望变宽的）就写 `flex: false`，走原生的 width。
 */
const flexible = computed(() => props.column.flex !== false)
const widthBinding = computed(() => (flexible.value ? undefined : props.column.width))
const minWidthBinding = computed(() => {
  // 显式给了 minWidth 就以它为准，别再拿 width 顶上去
  if (props.column.minWidth !== undefined) return props.column.minWidth
  return flexible.value ? props.column.width : undefined
})

/**
 * 列插槽（`#${列的 prop}`）的渲染器。
 *
 * 为什么不能直接写 `<slot :name="列 prop">`：`<slot>` 取的是**当前组件自己**的
 * `$slots`，而列插槽挂在 ElProTable 上，到这一层已经不存在了 —— 写成动态 name
 * 只会安静地渲染出空内容（这个坑是实测出来的：操作列整列空白，没有任何报错）。
 *
 * 所以改成从 `ctx.slots`（ElProTable 的插槽表）里取函数来调。
 * 按插槽名缓存一层包装组件，是为了让 `:is` 拿到稳定引用 ——
 * 每次渲染都新建函数的话，Vue 会当成新组件，把里面的弹层、输入框状态全部重建。
 */
const slotComps = new Map<string, (scope: any) => any>()

function columnSlot(name: string) {
  let comp = slotComps.get(name)
  if (!comp) {
    comp = (scope: any) => ctx!.slots[name]?.(scope) ?? null
    slotComps.set(name, comp)
  }
  return comp
}
</script>

<template>
  <!-- 分组表头：自己没有单元格，只负责 label 和子列的容器 -->
  <ElTableColumn
    v-if="isGroup"
    :label="column.label"
    :align="column.headerAlign ?? column.align"
    :class-name="column.className"
    :label-class-name="column.labelClassName"
    :fixed="column.fixed"
  >
    <TableColumnNode
      v-for="(child, i) in children"
      :key="child.prop ?? `${child.label ?? 'group'}-${i}`"
      :column="child"
      :depth="(depth ?? 0) + 1"
    >
      <template v-if="$slots.editableActions" #editableActions="scope">
        <slot name="editableActions" v-bind="scope" />
      </template>
    </TableColumnNode>
  </ElTableColumn>

  <ElTableColumn
    v-else
    :prop="column.prop"
    :label="column.label"
    :width="widthBinding"
    :min-width="minWidthBinding"
    :fixed="column.fixed ?? (column.valueType === 'option' ? 'right' : undefined)"
    :align="column.align ?? (column.valueType === 'option' ? 'center' : undefined)"
    :header-align="column.headerAlign"
    :sortable="column.sortable"
    :sort-method="column.sortMethod"
    :sort-by="column.sortBy"
    :show-overflow-tooltip="column.showOverflowTooltip"
    :class-name="column.className"
    :label-class-name="column.labelClassName"
    :resizable="column.resizable"
    :formatter="column.formatter"
  >
    <template #default="{ row, $index }">
    <div class="el-pro-table__cell" :class="{ 'is-draggable': ctx.dragSortKey.value === column.prop }">
      <span v-if="ctx.dragSortKey.value === column.prop" class="el-pro-table__drag-handle" aria-hidden="true">
        <svg viewBox="0 0 10 16" width="10" height="14" fill="currentColor"><circle cx="2" cy="3" r="1.4"/><circle cx="8" cy="3" r="1.4"/><circle cx="2" cy="8" r="1.4"/><circle cx="8" cy="8" r="1.4"/><circle cx="2" cy="13" r="1.4"/><circle cx="8" cy="13" r="1.4"/></svg>
      </span>
      <div class="el-pro-table__cell-body">
      <component
        :is="columnSlot(ctx.slotName(column))"
        v-if="ctx.hasSlot(column)"
        :row="row"
        :column="column"
        :index="$index"
        :value="column.prop ? row[column.prop] : undefined"
        :editing="ctx.isEditing(row)"
        :edit="() => ctx.startEdit(row)"
        :save="() => ctx.saveRow(row)"
        :cancel="() => ctx.cancelRow(row)"
        :remove="() => ctx.removeRow(row)"
      />
      <component
        :is="column.cellComponent"
        v-else-if="column.cellComponent"
        :row="row"
        :column="column"
        :index="$index"
        :value="column.prop ? row[column.prop] : undefined"
      />
      <!-- 编辑态：直接复用表单那套控件，valueType 词汇全场统一 -->
      <FormField
        v-else-if="ctx.isEditCell(row, column, $index)"
        :model-value="column.prop ? ctx.draftOf(row)[column.prop] : undefined"
        :column="column"
        @update:model-value="(v: any) => column.prop && ctx.setDraftValue(row, column.prop, v)"
      />
      <!-- 可编辑表格的操作列 -->
      <template v-else-if="ctx.editable.value && column.valueType === 'option'">
        <slot
          name="editableActions"
          :row="row"
          :column="column"
          :index="$index"
          :editing="ctx.isEditing(row)"
          :edit="() => ctx.startEdit(row)"
          :save="() => ctx.saveRow(row)"
          :cancel="() => ctx.cancelRow(row)"
          :remove="() => ctx.removeRow(row)"
        >
          <div class="el-pro-table__row-actions">
            <template v-if="ctx.isEditing(row)">
              <ElButton
                link
                type="primary"
                size="small"
                :loading="ctx.savingKey.value === ctx.keyOf(row)"
                @click="ctx.saveRow(row)"
              >
                保存
              </ElButton>
              <ElButton link size="small" @click="ctx.cancelRow(row)">取消</ElButton>
              <ElButton
                v-if="ctx.showDeleteRow.value"
                link
                type="danger"
                size="small"
                @click="ctx.removeRow(row)"
              >
                删除
              </ElButton>
            </template>
            <template v-else>
              <ElButton link type="primary" size="small" @click="ctx.startEdit(row)">编辑</ElButton>
              <ElButton
                v-if="ctx.showDeleteRow.value"
                link
                type="danger"
                size="small"
                @click="ctx.removeRow(row)"
              >
                删除
              </ElButton>
            </template>
          </div>
        </slot>
      </template>
      <CellRenderer
        v-else
        :value="column.prop ? row[column.prop] : undefined"
        :column="column"
        :row="row"
        :index="$index"
        :empty-text="ctx.emptyText.value"
      />
    </div>
    </div>
    </template>

    <template v-if="column.showOverflowTooltip === false" #header>
      {{ column.label }}
    </template>
  </ElTableColumn>
</template>
