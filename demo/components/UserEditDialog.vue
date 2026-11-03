<script setup lang="ts">
/**
 * 新建 / 编辑用户的弹窗。
 * 打开时把传进来的行拷进本地草稿，取消不会污染列表数据。
 */
import { computed, reactive, watch } from 'vue'
import { ElButton, ElDialog } from 'element-plus'
import { ElProForm } from '@/index'
import type { ProColumn } from '@/index'
import { ROLE_ENUM, STATUS_ENUM } from '../data/enums'
import type { User } from '../data/mock'

const props = defineProps<{
  modelValue: boolean
  /** 传了就是编辑，不传就是新建 */
  user?: User | null
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  saved: [Record<string, any>]
}>()

const editColumns: ProColumn[] = [
  {
    prop: 'name',
    label: '姓名',
    valueType: 'text',
    rules: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  },
  {
    prop: 'email',
    label: '邮箱',
    valueType: 'text',
    rules: [{ required: true, message: '请输入邮箱', trigger: 'blur' }],
  },
  { prop: 'role', label: '角色', valueType: 'select', valueEnum: ROLE_ENUM },
  { prop: 'status', label: '状态', valueType: 'radioButton', valueEnum: STATUS_ENUM },
  { prop: 'amount', label: '金额', valueType: 'money' },
  { prop: 'enabled', label: '启用', valueType: 'switch' },
]

const BLANK = { name: '', email: '', role: 'viewer', status: 'pending', amount: 0, enabled: true }

/** ElProForm 要求 model 是响应式对象，且要就地读写，所以用 reactive + 清空重建 */
const editing = reactive<Record<string, any>>({})

const title = computed(() => (props.user ? `编辑：${props.user.name}` : '新建用户'))

function resetDraft() {
  for (const key of Object.keys(editing)) delete editing[key]
  Object.assign(editing, props.user ? { ...props.user } : { ...BLANK })
}

// 每次打开都重建草稿：上一次取消掉的输入不能残留
watch(
  () => props.modelValue,
  (open) => {
    if (open) resetDraft()
  },
  { immediate: true },
)

function close() {
  emit('update:modelValue', false)
}

function submit() {
  emit('saved', { ...editing })
}
</script>

<template>
  <ElDialog
    :model-value="modelValue"
    :title="title"
    width="560px"
    destroy-on-close
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <ElProForm :columns="editColumns" :model="editing" :span="12" label-width="70px" :show-actions="false" />
    <template #footer>
      <ElButton @click="close">取消</ElButton>
      <ElButton type="primary" @click="submit">保存</ElButton>
    </template>
  </ElDialog>
</template>
