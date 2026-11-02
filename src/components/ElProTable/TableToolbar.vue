<script setup lang="ts">
/**
 * 表格工具栏：标题 + 右侧操作区（刷新 / 密度 / 列设置 / 全屏）。
 * 所有开关都能单独关掉，关掉后对应图标不渲染，不留空白。
 */
import { computed, ref } from 'vue'
import {
  ElButton,
  ElCheckbox,
  ElCheckboxGroup,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElPopover,
  ElTooltip,
} from 'element-plus'
import type { ProColumn, TableSize } from '../../types'

const props = withDefaults(
  defineProps<{
    title?: string
    tooltip?: string
    columns: ProColumn[]
    columnState: Record<string, boolean>
    size?: TableSize
    fullscreen?: boolean
    loading?: boolean
    options?: {
      reload?: boolean
      density?: boolean
      setting?: boolean
      fullscreen?: boolean
    } | false
  }>(),
  {
    size: 'default',
    fullscreen: false,
    loading: false,
    // 同 ElProTable 里的说明：类型含 Boolean，不给 default 会被 cast 成 false
    options: () => ({ reload: true, density: true, setting: true, fullscreen: true }),
  },
)

const emit = defineEmits<{
  refresh: []
  'update:columnState': [Record<string, boolean>]
  'update:size': [TableSize]
  'update:fullscreen': [boolean]
}>()

const opts = computed(() => {
  if (props.options === false) {
    return { reload: false, density: false, setting: false, fullscreen: false }
  }
  return {
    reload: props.options?.reload ?? true,
    density: props.options?.density ?? true,
    setting: props.options?.setting ?? true,
    fullscreen: props.options?.fullscreen ?? true,
  }
})

const settingOpen = ref(false)

/** 可以进列设置的列：排除操作列、索引列、显式排除的 */
const settableColumns = computed(() =>
  props.columns.filter(
    (c) => c.prop && !c.hideInSetting && c.valueType !== 'option' && c.valueType !== 'index' && c.valueType !== 'indexBorder',
  ),
)

/** 当前可见列的 prop 列表。columnState 里没有记录的视为可见 */
const visibleProps = computed({
  get: () =>
    settableColumns.value
      .filter((c) => props.columnState[c.prop!] !== false)
      .map((c) => c.prop!),
  set: (keys: string[]) => {
    const next: Record<string, boolean> = {}
    for (const c of settableColumns.value) next[c.prop!] = keys.includes(c.prop!)
    emit('update:columnState', next)
  },
})

const allChecked = computed({
  get: () => visibleProps.value.length === settableColumns.value.length,
  set: (val: boolean) => {
    visibleProps.value = val ? settableColumns.value.map((c) => c.prop!) : []
  },
})

const densityItems: { key: TableSize; label: string }[] = [
  { key: 'large', label: '宽松' },
  { key: 'default', label: '默认' },
  { key: 'small', label: '紧凑' },
]

function resetColumns() {
  const next: Record<string, boolean> = {}
  for (const c of settableColumns.value) next[c.prop!] = true
  emit('update:columnState', next)
}
</script>

<template>
  <div class="el-pro-toolbar">
    <div class="el-pro-toolbar__left">
      <slot name="title">
        <span v-if="title" class="el-pro-toolbar__title">{{ title }}</span>
        <ElTooltip v-if="tooltip" :content="tooltip" placement="top">
          <span class="el-pro-toolbar__hint">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.2">
              <circle cx="8" cy="8" r="6.2" />
              <path d="M8 7.2v4M8 5.1v.9" stroke-linecap="round" />
            </svg>
          </span>
        </ElTooltip>
      </slot>
    </div>

    <div class="el-pro-toolbar__right">
      <ElTooltip v-if="opts.reload" content="刷新" placement="top" :show-after="300">
        <button type="button" class="el-pro-toolbar__icon" :class="{ 'is-loading': loading }" @click="emit('refresh')">
          <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4">
            <path d="M13.2 8a5.2 5.2 0 1 1-1.5-3.7" stroke-linecap="round" />
            <path d="M13.4 2.6v3.1h-3.1" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </ElTooltip>

      <ElDropdown
        v-if="opts.density"
        trigger="click"
        popper-class="el-pro-density-popper"
        @command="(v: TableSize) => emit('update:size', v)"
      >
        <ElTooltip content="密度" placement="top" :show-after="300">
          <button type="button" class="el-pro-toolbar__icon">
            <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4">
              <path d="M2.5 4h11M2.5 8h11M2.5 12h11" stroke-linecap="round" />
            </svg>
          </button>
        </ElTooltip>
        <template #dropdown>
          <ElDropdownMenu>
            <ElDropdownItem
              v-for="item in densityItems"
              :key="item.key"
              :command="item.key"
              :class="{ 'is-active': size === item.key }"
            >
              {{ item.label }}
            </ElDropdownItem>
          </ElDropdownMenu>
        </template>
      </ElDropdown>

      <ElPopover
        v-if="opts.setting && settableColumns.length"
        v-model:visible="settingOpen"
        trigger="click"
        placement="bottom-end"
        :width="200"
        popper-class="el-pro-setting-popper"
      >
        <template #reference>
          <ElTooltip content="列设置" placement="top" :show-after="300">
            <button type="button" class="el-pro-toolbar__icon">
              <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4">
                <circle cx="8" cy="8" r="2.1" />
                <path
                  d="M8 1.8v1.6M8 12.6v1.6M1.8 8h1.6M12.6 8h1.6M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M12.4 3.6l-1.1 1.1M4.7 11.3l-1.1 1.1"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </ElTooltip>
        </template>

        <div class="el-pro-setting">
          <div class="el-pro-setting__head">
            <ElCheckbox v-model="allChecked" size="small">列展示</ElCheckbox>
            <ElButton link type="primary" size="small" @click="resetColumns">重置</ElButton>
          </div>
          <ElCheckboxGroup v-model="visibleProps" class="el-pro-setting__list">
            <ElCheckbox
              v-for="col in settableColumns"
              :key="col.prop"
              :value="col.prop!"
              size="small"
              class="el-pro-setting__row"
            >
              {{ col.label ?? col.prop }}
            </ElCheckbox>
          </ElCheckboxGroup>
        </div>
      </ElPopover>

      <ElTooltip
        v-if="opts.fullscreen"
        :content="fullscreen ? '退出全屏' : '全屏'"
        placement="top"
        :show-after="300"
      >
        <button type="button" class="el-pro-toolbar__icon" @click="emit('update:fullscreen', !fullscreen)">
          <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4">
            <template v-if="!fullscreen">
              <path d="M6 2.5H2.5V6M10 2.5h3.5V6M6 13.5H2.5V10M10 13.5h3.5V10" stroke-linecap="round" stroke-linejoin="round" />
            </template>
            <template v-else>
              <path d="M2.5 6H6V2.5M13.5 6H10V2.5M2.5 10H6v3.5M13.5 10H10v3.5" stroke-linecap="round" stroke-linejoin="round" />
            </template>
          </svg>
        </button>
      </ElTooltip>

      <slot name="actions" />
    </div>
  </div>
</template>

<style>
.el-pro-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 32px;
  margin-bottom: 12px;
}
.el-pro-toolbar__left {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.el-pro-toolbar__title {
  font-size: 15px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}
.el-pro-toolbar__hint {
  display: inline-flex;
  color: var(--el-text-color-placeholder);
  cursor: help;
}
.el-pro-toolbar__right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
}
.el-pro-toolbar__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}
.el-pro-toolbar__icon:hover {
  background: var(--el-fill-color-light);
  color: var(--el-color-primary);
}
.el-pro-toolbar__icon.is-loading svg {
  animation: el-pro-spin 0.9s linear infinite;
}
@keyframes el-pro-spin {
  to {
    transform: rotate(360deg);
  }
}
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
  margin-right: 0 !important;
  height: 26px;
}
.el-pro-setting-popper .el-dropdown-menu__item.is-active,
.el-pro-density-popper .el-dropdown-menu__item.is-active {
  color: var(--el-color-primary);
  font-weight: 500;
}
</style>
