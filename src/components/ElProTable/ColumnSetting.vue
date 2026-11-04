<script setup lang="ts">
/**
 * 列设置面板：显示/隐藏 + 拖拽排序 + 固定列首/列尾 + 重置。
 *
 * 从 TableToolbar 里抽出来的原因（对照 pro-components 的 ColumnSetting）：
 * 工具栏是「一排图标」，这里是「一个有状态、有交互、有拖拽的面板」，
 * 两者变化的原因完全不同 —— 加一个工具栏按钮不该翻到面板的拖拽代码里去。
 *
 * 本组件**只上报用户意图**，三份列状态（显隐 / 顺序 / 固定）都归 ElProTable 所有。
 * 面板里拼新状态会踩「props 快照」的坑：同一 tick 连点两次，第二次基于旧值覆盖第一次。
 *
 * 分组列（有 children 的列）在面板里显示成一行「组」，下面缩进列出叶子列：
 * - 组的勾选框是**全选/全不选它下面的叶子**，自身不落状态（组没有 prop）
 * - 分组存在时**关掉拖拽**：order 是扁平 prop 数组，表达不了「换到另一个组里去」
 * - 分组下的叶子**不给固定按钮**：el-table 固定的是顶层列，固定在分组下面不会生效
 */
import { computed, ref } from 'vue'
import { ElButton, ElCheckbox, ElTooltip } from 'element-plus'
import type { ProColumn } from '../../types'
import { flattenLeaves, hasGroupColumns, isSettableColumn, moveItem } from '../../core/column'
import type { ColumnFixed, ColumnFixedState } from '../../core/column'

const props = withDefaults(
  defineProps<{
    /** 已按用户顺序排好的列，所以面板里的顺序 = 表格里的显示顺序 */
    columns: ProColumn[]
    /** prop -> 是否可见。没有记录的视为可见 */
    columnState: Record<string, boolean>
    /** 用户设置的固定列（prop -> left/right） */
    columnFixed?: ColumnFixedState
    /** 面板列表最大高度（px），超出滚动 */
    listHeight?: number
    /** 是否显示勾选框。false 时面板只做排序/固定，不能隐藏列 */
    checkable?: boolean
    /** 是否允许拖拽排序（分组列存在时强制关闭，见上方说明） */
    draggable?: boolean
  }>(),
  {
    columnFixed: () => ({} as ColumnFixedState),
    checkable: true,
    draggable: true,
  },
)

const emit = defineEmits<{
  'update:columnState': [Record<string, boolean>]
  'update:columnOrder': [string[]]
  'update:columnFixed': [ColumnFixedState]
  /** 请求把某列固定到 left / right（再点一次同位置 = 取消） */
  pin: [string, ColumnFixed]
}>()

/* ------------------------------ 行模型 ------------------------------ */

type SettingRow =
  | { kind: 'group'; key: string; label: string; props: string[] }
  | { kind: 'leaf'; key: string; col: ProColumn; depth: number }

const grouped = computed(() => hasGroupColumns(props.columns))

/**
 * 面板按「组 → 它的叶子」铺开。
 *
 * 为什么不是 `columns.filter(isSettableColumn)`：分组列没有 prop，
 * 直接被过滤掉，它下面的叶子就永远进不了面板 —— 用户会发现表格里有列、
 * 面板里没有，只能改代码。
 */
const rows = computed<SettingRow[]>(() => {
  const out: SettingRow[] = []
  for (const col of props.columns) {
    if (col.children?.length) {
      const leaves = flattenLeaves(col.children).filter(isSettableColumn)
      if (!leaves.length) continue
      out.push({
        kind: 'group',
        key: `g:${col.label ?? col.prop ?? out.length}`,
        label: String(col.label ?? ''),
        props: leaves.map((l) => l.prop!),
      })
      for (const leaf of leaves) {
        out.push({ kind: 'leaf', key: `l:${leaf.prop}`, col: leaf, depth: 1 })
      }
    } else if (isSettableColumn(col)) {
      out.push({ kind: 'leaf', key: `l:${col.prop}`, col, depth: 0 })
    }
  }
  return out
})

/** 参与显隐状态的所有叶子列（分组列不参与） */
const leafColumns = computed(() =>
  rows.value.flatMap((r) => (r.kind === 'leaf' ? [r.col] : [])),
)

/* ------------------------------ 显隐 ------------------------------ */

function isVisible(prop: string) {
  return props.columnState[prop] !== false
}

/** 一次性把「可见的 prop 集合」换算成完整状态表再上报，避免半张表 */
function emitState(visibleKeys: string[]) {
  const next: Record<string, boolean> = {}
  for (const c of leafColumns.value) next[c.prop!] = visibleKeys.includes(c.prop!)
  emit('update:columnState', next)
}

const visibleProps = computed({
  get: () => leafColumns.value.filter((c) => isVisible(c.prop!)).map((c) => c.prop!),
  set: (keys: string[]) => emitState(keys),
})

const allChecked = computed({
  get: () => visibleProps.value.length === leafColumns.value.length,
  set: (val: boolean) => {
    visibleProps.value = val ? leafColumns.value.map((c) => c.prop!) : []
  },
})

function toggleColumn(prop: string, checked: boolean) {
  const keys = new Set(visibleProps.value)
  if (checked) keys.add(prop)
  else keys.delete(prop)
  visibleProps.value = [...keys]
}

function groupChecked(childProps: string[]) {
  return childProps.every(isVisible)
}

function groupIndeterminate(childProps: string[]) {
  const visible = childProps.filter(isVisible).length
  return visible > 0 && visible < childProps.length
}

function toggleGroup(childProps: string[], checked: boolean) {
  const keys = new Set(visibleProps.value)
  for (const p of childProps) {
    if (checked) keys.add(p)
    else keys.delete(p)
  }
  visibleProps.value = [...keys]
}

/* ------------------------------ 拖拽排序 ------------------------------ */

/** 正在拖的行下标 */
const dragFrom = ref(-1)
/** 当前悬停的行下标，用来画插入指示线 */
const dragOver = ref(-1)

function onDragStart(index: number, e: DragEvent) {
  dragFrom.value = index
  dragOver.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    // Firefox 不调 setData 就不会继续派发 drag / drop，别省这一行
    e.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragOver(index: number) {
  if (dragFrom.value === -1) return
  dragOver.value = index
}

function onDrop(index: number) {
  const from = dragFrom.value
  if (from === -1 || from === index) {
    resetDrag()
    return
  }
  emit(
    'update:columnOrder',
    moveItem(
      leafColumns.value.map((c) => c.prop!),
      from,
      index,
    ),
  )
  resetDrag()
}

function resetDrag() {
  dragFrom.value = -1
  dragOver.value = -1
}

function resetColumns() {
  const next: Record<string, boolean> = {}
  for (const c of leafColumns.value) next[c.prop!] = true
  emit('update:columnState', next)
  // 空数组 = 回到 columns 的原始顺序，不用记一份默认顺序
  emit('update:columnOrder', [])
  // 固定状态一起清掉，否则「重置」之后列还粘在两边，用户会以为没重置干净
  emit('update:columnFixed', {})
}

/* ------------------------------ 固定列 ------------------------------ */

/** 某列当前生效的固定位置：用户设置优先于 columns 里的 fixed */
function fixedOf(col: ProColumn): ColumnFixed | undefined {
  const user = props.columnFixed[col.prop!]
  if (user) return user
  return col.fixed === 'left' || col.fixed === 'right' ? col.fixed : undefined
}
</script>

<template>
  <div class="el-pro-setting">
    <div class="el-pro-setting__head">
      <ElCheckbox v-if="checkable" v-model="allChecked" size="small">列展示</ElCheckbox>
      <ElButton link type="primary" size="small" @click="resetColumns">重置</ElButton>
    </div>

    <!-- 用原生 HTML5 拖拽，不引 sortablejs：一行小列表不值一个运行时依赖 -->
    <div class="el-pro-setting__list" :style="listHeight ? { maxHeight: listHeight + 'px' } : undefined">
      <template v-for="(row, index) in rows" :key="row.key">
        <!-- 分组：只是全选开关，不落自己的显隐状态 -->
        <div v-if="row.kind === 'group'" class="el-pro-setting__row is-group">
          <span class="el-pro-setting__grip is-hidden" aria-hidden="true" />
          <ElCheckbox
            v-if="checkable"
            :model-value="groupChecked(row.props)"
            :indeterminate="groupIndeterminate(row.props)"
            size="small"
            @update:model-value="(v: any) => toggleGroup(row.props, !!v)"
          >
            {{ row.label }}
          </ElCheckbox>
        </div>

        <div
          v-else
          class="el-pro-setting__row"
          :class="{
            'is-child': row.depth > 0,
            'is-dragging': dragFrom === index,
            'is-over-top': dragOver === index && dragFrom > index,
            'is-over-bottom': dragOver === index && dragFrom < index,
          }"
          :draggable="!grouped && draggable"
          @dragstart="onDragStart(index, $event)"
          @dragover.prevent="onDragOver(index)"
          @drop.prevent="onDrop(index)"
          @dragend="resetDrag"
        >
          <span
            class="el-pro-setting__grip"
            :class="{ 'is-hidden': grouped || !draggable }"
            aria-hidden="true"
          >
            <svg viewBox="0 0 8 14" width="8" height="14" fill="currentColor">
              <circle cx="2" cy="2.5" r="1" />
              <circle cx="6" cy="2.5" r="1" />
              <circle cx="2" cy="7" r="1" />
              <circle cx="6" cy="7" r="1" />
              <circle cx="2" cy="11.5" r="1" />
              <circle cx="6" cy="11.5" r="1" />
            </svg>
          </span>
          <ElCheckbox
            v-if="checkable"
            :model-value="visibleProps.includes(row.col.prop!)"
            :disabled="!!row.col.disableSetting"
            size="small"
            @update:model-value="(v: any) => toggleColumn(row.col.prop!, !!v)"
          >
            {{ row.col.label ?? row.col.prop }}
          </ElCheckbox>
          <span v-else class="el-pro-setting__label">{{ row.col.label ?? row.col.prop }}</span>

          <!--
            固定在列首 / 列尾。用 ElTooltip 而不是原生 title：
            title 要悬停近 1 秒、样式跟系统走，和面板里其它提示不是一套。
            激活态的文案换成「取消…」，否则用户不知道再点一次会发生什么。
            这里每个按钮各挂一个 ElTooltip —— ElTooltip 的内容是懒渲染的，
            悬停前不产生 popper 节点，20 行也就 40 个空壳，不必为省这点开销牺牲体验。
          -->
          <span v-if="row.depth === 0" class="el-pro-setting__pins">
            <ElTooltip
              :content="fixedOf(row.col) === 'left' ? '取消固定在列首' : '固定在列首'"
              placement="top"
              :show-after="200"
            >
              <button
                type="button"
                class="el-pro-setting__pin"
                :class="{ 'is-active': fixedOf(row.col) === 'left' }"
                :aria-label="fixedOf(row.col) === 'left' ? '取消固定在列首' : '固定在列首'"
                @click.stop="emit('pin', row.col.prop!, 'left')"
              >
                <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M3.2 2.6v10.8" stroke-linecap="round" />
                  <path d="M12.4 4.2 8.2 8l4.2 3.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </ElTooltip>
            <ElTooltip
              :content="fixedOf(row.col) === 'right' ? '取消固定在列尾' : '固定在列尾'"
              placement="top"
              :show-after="200"
            >
              <button
                type="button"
                class="el-pro-setting__pin"
                :class="{ 'is-active': fixedOf(row.col) === 'right' }"
                :aria-label="fixedOf(row.col) === 'right' ? '取消固定在列尾' : '固定在列尾'"
                @click.stop="emit('pin', row.col.prop!, 'right')"
              >
                <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M12.8 2.6v10.8" stroke-linecap="round" />
                  <path d="M3.6 4.2 7.8 8l-4.2 3.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </ElTooltip>
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<style>
.el-pro-setting {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.el-pro-setting__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.el-pro-setting__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 260px;
  overflow-y: auto;
}
.el-pro-setting__row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 3px;
  height: 27px;
  padding-left: 2px;
  border-radius: 4px;
  /* 不加会拖到文字把文本选中，拖拽体验直接崩 */
  user-select: none;
}
.el-pro-setting__row:hover {
  background: var(--el-fill-color-light);
}
/* 分组行：压一层灰，和它下面的叶子列区分开 */
.el-pro-setting__row.is-group {
  background: var(--el-fill-color-lighter);
  font-weight: 500;
}
.el-pro-setting__row.is-group:hover {
  background: var(--el-fill-color-light);
}
/* 子列缩进。拖拽与固定都不给它用，缩进就是唯一的「从属」提示 */
.el-pro-setting__row.is-child {
  padding-left: 20px;
}
.el-pro-setting__row.is-dragging {
  opacity: 0.4;
}
/* 插入位置用伪元素画线，比加 border 好：加 border 会让行高跳 2px */
.el-pro-setting__row.is-over-top::before,
.el-pro-setting__row.is-over-bottom::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--el-color-primary);
  border-radius: 1px;
}
.el-pro-setting__row.is-over-top::before {
  top: -1px;
}
.el-pro-setting__row.is-over-bottom::after {
  bottom: -1px;
}
.el-pro-setting__grip {
  display: inline-flex;
  flex: none;
  color: var(--el-text-color-placeholder);
  cursor: grab;
}
.el-pro-setting__grip.is-hidden {
  visibility: hidden;
  cursor: default;
}
.el-pro-setting__row:active .el-pro-setting__grip {
  cursor: grabbing;
}
.el-pro-setting__row .el-checkbox {
  margin-right: 0;
  height: auto;
  min-width: 0;
  /* 撑开剩余宽度，把固定按钮推到右边 */
  flex: 1;
}
.el-pro-setting__row .el-checkbox__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.el-pro-setting__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.el-pro-setting__pins {
  display: inline-flex;
  flex: none;
  gap: 1px;
  /* 平时不占视觉焦点，悬停或已固定时才显形 */
  opacity: 0;
  transition: opacity 0.15s;
}
.el-pro-setting__row:hover .el-pro-setting__pins,
.el-pro-setting__pins:has(.is-active) {
  opacity: 1;
}
.el-pro-setting__pin {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 3px;
  color: var(--el-text-color-placeholder);
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}
.el-pro-setting__pin:hover {
  background: var(--el-fill-color-dark);
  color: var(--el-color-primary);
}
.el-pro-setting__pin.is-active {
  color: var(--el-color-primary);
}
</style>
