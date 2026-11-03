<script setup lang="ts">
/**
 * 表格工具栏：标题 + 右侧操作区（刷新 / 密度 / 列设置 / 全屏）。
 * 所有开关都能单独关掉，关掉后对应图标不渲染，不留空白。
 *
 * 这里只负责「一排图标 + 把面板塞进弹层」，列的显隐/顺序/固定状态和面板 UI
 * 都在 ColumnSetting.vue 里 —— 两者变化的原因不同，不该混在一个文件。
 */
import { computed, ref } from 'vue'
import {
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElPopover,
  ElTooltip,
} from 'element-plus'
import type { ProColumn, TableSize } from '../../types'
import { isSettableColumn } from '../../core/column'
import type { ColumnFixed, ColumnFixedState } from '../../core/column'
import ColumnSetting from './ColumnSetting.vue'

const props = withDefaults(
  defineProps<{
    title?: string
    tooltip?: string
    columns: ProColumn[]
    columnState: Record<string, boolean>
    /** 用户设置的固定列（prop -> left/right） */
    columnFixed?: ColumnFixedState
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
    columnFixed: () => ({} as ColumnFixedState),
    // 同 ElProTable 里的说明：类型含 Boolean，不给 default 会被 cast 成 false
    options: () => ({ reload: true, density: true, setting: true, fullscreen: true }),
  },
)

const emit = defineEmits<{
  refresh: []
  'update:columnState': [Record<string, boolean>]
  'update:columnOrder': [string[]]
  'update:columnFixed': [ColumnFixedState]
  /** 请求把某列固定到 left / right（再点一次同位置 = 取消）。状态由 ElProTable 算 */
  pin: [string, ColumnFixed]
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

/** 一个可设置的列都没有时，齿轮点开是空面板，不如不渲染 */
const hasSettableColumns = computed(() => props.columns.some(isSettableColumn))

const densityItems: { key: TableSize; label: string }[] = [
  { key: 'large', label: '宽松' },
  { key: 'default', label: '默认' },
  { key: 'small', label: '紧凑' },
]
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

      <!--
        这里必须多套一层 span：ElDropdown 会把默认插槽交给 ElOnlyChild 克隆，
        直接把 ElTooltip 当子节点时，ElOnlyChild 加的 role="button" 会穿透到
        ElTooltip 的 role prop 上，控制台刷一堆 prop 校验警告。
      -->
      <ElDropdown
        v-if="opts.density"
        trigger="click"
        popper-class="el-pro-density-popper"
        @command="(v: TableSize) => emit('update:size', v)"
      >
        <span class="el-pro-toolbar__trigger">
          <ElTooltip content="密度" placement="top" :show-after="300">
            <button type="button" class="el-pro-toolbar__icon">
              <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4">
                <path d="M2.5 4h11M2.5 8h11M2.5 12h11" stroke-linecap="round" />
              </svg>
            </button>
          </ElTooltip>
        </span>
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
        v-if="opts.setting && hasSettableColumns"
        v-model:visible="settingOpen"
        trigger="click"
        placement="bottom-end"
        :width="220"
        popper-class="el-pro-setting-popper"
      >
        <template #reference>
          <!-- 同上：ElPopover 的 reference 也会被 ElOnlyChild 克隆，别让属性落到组件上 -->
          <span class="el-pro-toolbar__trigger">
            <ElTooltip content="列设置" placement="top" :show-after="300">
              <button type="button" class="el-pro-toolbar__icon">
                <!--
                  齿轮 = 设置。别改成「圆心 + 放射线」，那读起来是太阳/亮度，
                  和旁边的密度、刷新、全屏放一起会被误认成主题切换。
                -->
                <svg
                  viewBox="0 0 24 24"
                  width="15"
                  height="15"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
                  />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </ElTooltip>
          </span>
        </template>

        <ColumnSetting
          :columns="columns"
          :column-state="columnState"
          :column-fixed="columnFixed"
          @update:column-state="emit('update:columnState', $event)"
          @update:column-order="emit('update:columnOrder', $event)"
          @update:column-fixed="emit('update:columnFixed', $event)"
          @pin="(prop, target) => emit('pin', prop, target)"
        />
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
/* ElDropdown / ElPopover 的触发器外壳，只负责承接克隆下来的属性 */
.el-pro-toolbar__trigger {
  display: inline-flex;
  align-items: center;
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
/* 弹层挂在 body 上，样式必须全局，不能用 scoped */
.el-pro-setting-popper .el-dropdown-menu__item.is-active,
.el-pro-density-popper .el-dropdown-menu__item.is-active {
  color: var(--el-color-primary);
  font-weight: 500;
}
</style>
