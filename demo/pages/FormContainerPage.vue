<script setup lang="ts">
/**
 * 弹窗 / 抽屉表单示例。
 *
 * 两段刻意做成对照：
 * - 弹窗用 `#trigger`：点按钮开窗，最省事的写法
 * - 抽屉用 `v-model:open` + `initialValues`：从列表行进入，字段带出
 *
 * 提交都走异步，并且留了一个会失败的分支（名称和已有项目重名），
 * 用来演示核心行为：**reject 时窗不关，用户改完就地重提**。
 */
import { reactive, ref } from 'vue'
import { ElAlert, ElButton, ElMessage } from 'element-plus'
import { ElProDrawerForm, ElProModalForm } from '@/index'
import type { ProColumn } from '@/index'
import { ROLE_ENUM } from '../data/enums'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const createColumns: ProColumn[] = [
  {
    prop: 'name',
    label: '项目名称',
    valueType: 'text',
    rules: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  },
  { prop: 'owner', label: '负责人', valueType: 'select', valueEnum: ROLE_ENUM },
  {
    prop: 'level',
    label: '优先级',
    valueType: 'radioButton',
    valueEnum: { high: '高', mid: '中', low: '低' },
  },
  { prop: 'budget', label: '预算', valueType: 'money', fieldProps: { min: 0, step: 1000 } },
  { prop: 'desc', label: '描述', valueType: 'textarea', formSpan: 24 },
]

interface Project {
  id: number
  name: string
  owner: string
}

const projects = reactive<Project[]>([
  { id: 1, name: '数据看板改造', owner: 'editor' },
  { id: 2, name: '权限中心重构', owner: 'admin' },
])

/** 服务端拒绝时把原因留在弹窗里，比只弹个 toast 好——用户看得见、改得着 */
const submitError = ref('')

async function onCreate(values: Record<string, any>) {
  submitError.value = ''
  await wait(600)
  const name = String(values.name).trim()
  // 用「重名」当失败条件：比编一个假错误真实，也顺带把服务端校验的样子演出来
  if (projects.some((item) => item.name === name)) {
    throw new Error(`「${name}」已存在，服务端拒绝了这次提交`)
  }
  projects.unshift({ id: Date.now(), name, owner: String(values.owner ?? '') })
  ElMessage.success('已创建')
}

/** 开窗／关窗都要把上一次的错误清掉，否则下次进来还挂着上次的红条 */
function onCreateOpenChange(open: boolean) {
  if (open) submitError.value = ''
}

/* ------------------------------- 抽屉表单 -------------------------------- */

const drawerOpen = ref(false)
const editing = ref<Record<string, any>>({})

const editColumns: ProColumn[] = [
  { prop: 'id', label: 'ID', hideInForm: true },
  {
    prop: 'name',
    label: '项目名称',
    valueType: 'text',
    rules: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  },
  { prop: 'owner', label: '负责人', valueType: 'select', valueEnum: ROLE_ENUM },
]

function onEdit(row: Project) {
  // 交一份副本进去：抽屉里改的只是这份副本
  editing.value = { ...row }
  drawerOpen.value = true
}

async function onEditFinish(values: Record<string, any>) {
  await wait(400)
  const target = projects.find((item) => item.id === values.id)
  if (target) target.name = String(values.name)
  ElMessage.success('已保存')
}
</script>

<template>
  <div class="demo-card">
    <h3 class="demo-section-title">ElProModalForm</h3>
    <p class="demo-section-desc">
      trigger 插槽开窗，提交走 <code>@finish</code>：先校验，再等它 resolve，成功了才关窗。
      名称填一个已有的项目，可以看服务端拒绝后弹窗留在原地。
    </p>

    <ElProModalForm
      title="新建项目"
      :columns="createColumns"
      :span="12"
      label-width="90px"
      submit-text="创建"
      @finish="onCreate"
      @finish-error="(err: unknown) => (submitError = (err as Error).message)"
      @open-change="onCreateOpenChange"
    >
      <template #trigger>
        <ElButton type="primary" class="demo-modal-trigger">新建项目</ElButton>
      </template>

      <template #extra>
        <ElAlert
          v-if="submitError"
          class="demo-modal-error"
          type="error"
          :title="submitError"
          :closable="false"
          show-icon
        />
      </template>
    </ElProModalForm>

    <ul class="demo-project-list">
      <li v-for="row in projects" :key="row.id" class="demo-project-row">
        <span class="demo-project-name">{{ row.name }}</span>
        <span class="demo-project-owner">{{ row.owner }}</span>
      </li>
    </ul>
  </div>

  <div class="demo-card">
    <h3 class="demo-section-title">ElProDrawerForm</h3>
    <p class="demo-section-desc">
      从列表行进入，v-model:open 控制开关，initialValues 每次打开重新播种：
      改了再取消，重新进来还是原值。
    </p>

    <ul class="demo-edit-list">
      <li v-for="row in projects" :key="row.id" class="demo-edit-row">
        <span class="demo-edit-name">{{ row.name }}</span>
        <ElButton link type="primary" class="demo-edit-btn" @click="onEdit(row)">编辑</ElButton>
      </li>
    </ul>

    <ElProDrawerForm
      v-model:open="drawerOpen"
      title="编辑项目"
      :columns="editColumns"
      :initial-values="editing"
      :span="24"
      label-width="90px"
      submit-text="保存"
      @finish="onEditFinish"
    />
  </div>
</template>

<style scoped>
.demo-project-list,
.demo-edit-list {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.demo-project-row,
.demo-edit-row {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px 12px;
  font-size: 13px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.demo-project-name,
.demo-edit-name {
  font-weight: 500;
}
.demo-project-owner {
  color: var(--el-text-color-secondary);
}
.demo-modal-error {
  margin-top: 4px;
}
</style>
