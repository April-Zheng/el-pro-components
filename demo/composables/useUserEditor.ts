import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { User } from '../data/mock'

/**
 * 用户列表页和列表示例页都要「点编辑弹出同一个表单」。
 * 开没开、编的是谁这类状态放这里，弹窗本体是 components/UserEditDialog.vue。
 *
 * @param afterSaved 保存成功后的回调（通常是刷新列表）
 */
export function useUserEditor(afterSaved?: () => void) {
  const visible = ref(false)
  const user = ref<User | null>(null)

  function openEdit(row: User) {
    user.value = row
    visible.value = true
  }

  function openCreate() {
    user.value = null
    visible.value = true
  }

  function handleSaved(model: Record<string, any>) {
    const isNew = !user.value
    // 演示项目不改真数据，只提示 + 刷新，让交互闭环
    ElMessage.success(`${isNew ? '已新增' : '已保存'}：${model.name || '(未命名)'}`)
    visible.value = false
    afterSaved?.()
  }

  return { visible, user, openEdit, openCreate, handleSaved }
}
