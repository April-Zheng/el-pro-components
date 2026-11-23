/**
 * 内置语言包。ProConfigProvider 的 `locale`（默认 zh-CN）决定取哪一套；
 * 手动 labels 覆盖优先于语言包，语言包键集与 ProLabels 一一对应（键集见 types.ts）。
 *
 * 设计边界：语言包固定内置 zh-CN / en-US 两套，扩语言 = 在这里加一套新包并在
 * ProLocale 联合里登记，不需要新增机制。runtime 热替换语言包字典不在支持范围。
 */
import type { ProLabels, ProLocale } from '../types'

/** 简体中文语言包（默认）。与「未引入全局配置层」时的硬编码文案逐字一致 */
export const zhCN: Required<ProLabels> = {
  /* 布局 */
  layoutExpand: '展开菜单',
  layoutCollapse: '收起菜单',
  /* 表格工具栏 */
  toolbarReload: '刷新',
  toolbarDensity: '密度',
  toolbarColumnSetting: '列设置',
  toolbarFullscreen: '全屏',
  toolbarExitFullscreen: '退出全屏',
  toolbarSearch: '搜索',
  toolbarSearchPlaceholder: '搜索关键字，回车确认',
  sizeLoose: '宽松',
  sizeDefault: '默认',
  sizeCompact: '紧凑',
  /* 查询与搜索栏 */
  search: '查询',
  reset: '重置',
  expand: '展开',
  collapse: '收起',
  /* 列设置 */
  columnShow: '列展示',
  fixedLeft: '固定在列首',
  cancelFixedLeft: '取消固定在列首',
  fixedRight: '固定在列尾',
  cancelFixedRight: '取消固定在列尾',
  /* 行内操作 / 空态 */
  edit: '编辑',
  cancel: '取消',
  save: '保存',
  delete: '删除',
  addRow: '新增一行',
  clear: '清空',
  batchSelectedPrefix: '已选',
  batchSelectedSuffix: '项',
  empty: '暂无数据',
  optionLabel: '操作',
  /* 列表 */
  loadMore: '加载更多',
  loadingMore: '加载中…',
  /* 表单 */
  submit: '提交',
  addItem: '添加一项',
  maxItemsPrefix: '最多',
  maxItemsSuffix: '项',
  minPlaceholder: '最小值',
  maxPlaceholder: '最大值',
  startDatePlaceholder: '开始日期',
  endDatePlaceholder: '结束日期',
  /* 验证码 */
  captchaGet: '获取验证码',
  captchaResend: 's 后重发',
  captchaPlaceholder: '请输入验证码',
  /* 富文本 */
  inputPlaceholder: '请输入',
  /* 描述 / 其他 */
  loadFailed: '加载失败',
  moreFilters: '更多筛选',
  confirm: '确认',
  copy: '复制',
  copied: '已复制',
  stepsPrev: '上一步',
  stepsNext: '下一步',
}

/** English language pack */
export const enUS: Required<ProLabels> = {
  layoutExpand: 'Expand menu',
  layoutCollapse: 'Collapse menu',
  toolbarReload: 'Reload',
  toolbarDensity: 'Density',
  toolbarColumnSetting: 'Columns',
  toolbarFullscreen: 'Fullscreen',
  toolbarExitFullscreen: 'Exit fullscreen',
  toolbarSearch: 'Search',
  toolbarSearchPlaceholder: 'Search, press Enter',
  sizeLoose: 'Loose',
  sizeDefault: 'Default',
  sizeCompact: 'Compact',
  search: 'Search',
  reset: 'Reset',
  expand: 'Expand',
  collapse: 'Collapse',
  columnShow: 'Show columns',
  fixedLeft: 'Pin left',
  cancelFixedLeft: 'Unpin left',
  fixedRight: 'Pin right',
  cancelFixedRight: 'Unpin right',
  edit: 'Edit',
  cancel: 'Cancel',
  save: 'Save',
  delete: 'Delete',
  addRow: 'Add row',
  clear: 'Clear',
  batchSelectedPrefix: 'Selected',
  batchSelectedSuffix: 'items',
  empty: 'No data',
  optionLabel: 'Actions',
  loadMore: 'Load more',
  loadingMore: 'Loading…',
  submit: 'Submit',
  addItem: 'Add item',
  maxItemsPrefix: 'Max',
  maxItemsSuffix: 'items',
  minPlaceholder: 'Min',
  maxPlaceholder: 'Max',
  startDatePlaceholder: 'Start date',
  endDatePlaceholder: 'End date',
  captchaGet: 'Get code',
  captchaResend: 's to resend',
  captchaPlaceholder: 'Enter verification code',
  inputPlaceholder: 'Type here',
  loadFailed: 'Failed to load',
  moreFilters: 'More filters',
  confirm: 'Confirm',
  copy: 'Copy',
  copied: 'Copied',
  stepsPrev: 'Previous',
  stepsNext: 'Next',
}

/** 取当前 locale 的语言包 */
export function localePack(locale: ProLocale): Required<ProLabels> {
  return locale === 'en-US' ? enUS : zhCN
}
