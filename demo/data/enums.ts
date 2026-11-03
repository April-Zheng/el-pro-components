import type { ValueEnum } from '@/index'

/** 角色字典。表格 tag、表单下拉、搜索项共用同一份 */
export const ROLE_ENUM: ValueEnum = {
  admin: { text: '管理员', status: 'danger' },
  editor: { text: '编辑', status: 'primary' },
  viewer: { text: '访客', status: 'info' },
}

/** 状态字典 */
export const STATUS_ENUM: ValueEnum = {
  active: { text: '正常', status: 'success' },
  pending: { text: '待审核', status: 'warning' },
  disabled: { text: '已停用', status: 'info' },
}
