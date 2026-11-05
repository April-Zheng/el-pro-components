<script setup lang="ts">
/**
 * 表单能力补齐示例：批次 4 的十项能力逐块演示。
 */
import { reactive, ref } from 'vue'
import { ElAlert, ElMessage } from 'element-plus'
import {
  ElProFieldSet,
  ElProForm,
  ElProFormCaptcha,
  ElProFormDependency,
  ElProModalForm,
  ElProStepsForm,
} from '@/index'
import type { ProColumn } from '@/index'

/* ------------------------- 1. FormList 行操作 API ------------------------- */

const listModel = reactive({ contacts: [{ name: '张三', phone: '13800000000' }] })
const listColumns: ProColumn[] = [
  { prop: 'name', label: '姓名', rules: [{ required: true, message: '姓名必填' }] },
  { prop: 'phone', label: '电话' },
]
const listActionRef = { current: null as any }
const listConfig = {
  arrowSort: true,
  min: 1,
  max: 4,
  actionRef: listActionRef,
  actionGuard: {
    beforeRemoveRow: (index: number) => {
      if (listModel.contacts.length <= 1) {
        ElMessage.warning('至少保留一位联系人')
        return false
      }
      return true
    },
  },
  onAfterAdd: () => ElMessage.success('已添加'),
}
function listAdd() {
  listActionRef.current?.add()
}
function listFirst() {
  const row = listActionRef.current?.get(0)
  ElMessage.info(`第一项：${row?.name ?? '（空）'}`)
}
function listMove() {
  listActionRef.current?.move(0, listModel.contacts.length - 1)
}

/* ------------------------- 2. ProFormDependency ------------------------- */

const depModel = reactive({ channel: 'app', inviteCode: '' })
const depColumns: ProColumn[] = [
  { prop: 'channel', label: '渠道', valueType: 'radio', fieldProps: {}, valueEnum: { app: 'App', ground: '地推' } },
  { prop: 'inviteCode', label: '邀请码', dependency: { dependsOn: ['channel'], visible: (v) => v.channel === 'ground' } },
]

/* ------------------------- 3. 表单级只读 ------------------------- */

const readonlyModel = reactive({ name: '张三', role: 'admin', amount: 1234.5 })
const readonlyColumns: ProColumn[] = [
  { prop: 'name', label: '姓名' },
  { prop: 'role', label: '角色', valueType: 'tag', valueEnum: { admin: '管理员', user: '用户' } },
  { prop: 'amount', label: '金额', valueType: 'money' },
]

/* ------------------------- 4. request 异步初值 ------------------------- */

const asyncModel = reactive<Record<string, any>>({})
const asyncColumns: ProColumn[] = [
  { prop: 'nickname', label: '昵称' },
  { prop: 'city', label: '城市' },
]
async function fetchInitial() {
  await new Promise((r) => setTimeout(r, 600))
  return { nickname: '林间的风', city: '杭州' }
}

/* ------------------------- 5. order 排序 ------------------------- */

const orderModel = reactive({ a: '', b: '', c: '' })
const orderColumns: ProColumn[] = [
  { prop: 'a', label: 'A（order=2）', order: 2 },
  { prop: 'b', label: 'B（order=1）', order: 1 },
  { prop: 'c', label: 'C（无 order）' },
]

/* ------------------------- 6. onValuesChange ------------------------- */

const valuesChangeCount = ref(0)
function onValuesChange() {
  valuesChangeCount.value += 1
}

/* ------------------------- 7. isKeyPressSubmit ------------------------- */

const keyPressModel = reactive({ keyword: '' })
const keyPressColumns: ProColumn[] = [{ prop: 'keyword', label: '关键词' }]
const keyPressSubmit = ref(false)

/* ------------------------- 8. submitTimeout ------------------------- */

const timeoutOpen = ref(false)
const timeoutColumns: ProColumn[] = [{ prop: 'name', label: '名称' }]
const timeoutModel = reactive({ name: '' })
async function hangingFinish() {
  // 故意挂死 10 秒：submitTimeout=2000 会在 2 秒后恢复按钮、允许取消
  await new Promise((r) => setTimeout(r, 10_000))
  return true
}

/* ------------------------- 9. StepsForm 插槽 ------------------------- */

const stepDefs = [
  { title: '基本信息', columns: [{ prop: 'name', label: '姓名' }] },
  { title: '联系方式', columns: [{ prop: 'phone', label: '电话' }] },
]

/* ------------------------- 10. 字段组件 ------------------------- */

const fieldModel = reactive({ captcha: '', tags: [] })
const fieldColumns: ProColumn[] = [
  {
    prop: 'captcha',
    label: '验证码',
    fieldComponent: ElProFormCaptcha,
    fieldProps: {
      onGetCaptcha: async () => {
        await new Promise((r) => setTimeout(r, 400))
        ElMessage.success('验证码已发送（演示）')
      },
    },
  },
  {
    prop: 'tags',
    label: '标签',
    fieldComponent: ElProFieldSet,
    fieldProps: { options: ['前端', '后端', '测试'], multiple: true },
  },
]
</script>

<template>
  <div class="form-advanced-page">
    <ElAlert
      title="本页演示批次 4 的表单能力补齐，每块对应一项能力"
      type="info"
      :closable="false"
      show-icon
    />

    <!-- 1. FormList 行操作 API -->
    <section>
      <h4>1. FormList 行操作 API（ref.add/remove/move/get/getList + arrowSort + actionGuard）</h4>
      <p class="hint">
        外部调用：
        <button class="demo-link" @click="listAdd">add()</button>
        <button class="demo-link" @click="listFirst">get(0)</button>
        <button class="demo-link" @click="listMove">move(0, 末尾)</button>
        —— 行内也有「上移/下移」按钮；只剩一项时删除会被 actionGuard 拦下
      </p>
      <ElProForm :columns="[{ prop: 'contacts', label: '联系人', valueType: 'formList', formListProps: { ...listConfig, span: 24 }, children: listColumns }]" :model="listModel" />
    </section>

    <!-- 2. ProFormDependency -->
    <section>
      <h4>2. ProFormDependency 依赖渲染任意子树 + 列级 dependency（行内相对依赖见 FormList 子列）</h4>
      <ElProForm :columns="depColumns" :model="depModel" :show-actions="false" />
      <ElProFormDependency :model="depModel" name="channel">
        <template #default="{ value }">
          <div v-if="value === 'ground'" class="demo-dep-tip">当前渠道是「地推」：邀请码必填，记得发放物料</div>
          <div v-else class="demo-dep-tip">当前渠道是「App」：邀请码由系统自动生成</div>
        </template>
      </ElProFormDependency>
    </section>

    <!-- 3. 表单级只读 -->
    <section>
      <h4>3. 表单级 readonly（只读展示形态，与表格同一套 valueType 渲染）</h4>
      <ElProForm :columns="readonlyColumns" :model="readonlyModel" :show-actions="false" readonly />
    </section>

    <!-- 4. request 异步初值 -->
    <section>
      <h4>4. request 异步初值（挂载拉取，提交按钮带 loading）</h4>
      <ElProForm :columns="asyncColumns" :model="asyncModel" :request="fetchInitial" :show-actions="false" />
    </section>

    <!-- 5. order 排序 -->
    <section>
      <h4>5. schema 列 order 排序（B → A → C，未传 order 的垫底）</h4>
      <ElProForm :columns="orderColumns" :model="orderModel" :show-actions="false" />
    </section>

    <!-- 6. onValuesChange -->
    <section>
      <h4>6. onValuesChange 生命周期（值变化计数）</h4>
      <p class="hint">已触发 {{ valuesChangeCount }} 次</p>
      <ElProForm :columns="asyncColumns" :model="asyncModel" :show-actions="false" :on-values-change="onValuesChange" @values-change="onValuesChange" />
    </section>

    <!-- 7. isKeyPressSubmit -->
    <section>
      <h4>7. isKeyPressSubmit（默认阻止回车提交，开关打开后回车触发）</h4>
      <p class="hint">
        回车提交：
        <button class="demo-link" @click="keyPressSubmit = !keyPressSubmit">{{ keyPressSubmit ? '已开启' : '已关闭' }}</button>
        —— 在输入框里按回车试试
      </p>
      <ElProForm :columns="keyPressColumns" :model="keyPressModel" :show-actions="false" :is-key-press-submit="keyPressSubmit" @submit="() => ElMessage.success('回车提交成功')" />
    </section>

    <!-- 8. submitTimeout -->
    <section>
      <h4>8. submitTimeout 提交超时保护（onFinish 挂死 10s，2s 后按钮恢复、可取消）</h4>
      <ElProModalForm
        v-model:open="timeoutOpen"
        :columns="timeoutColumns"
        :model="timeoutModel"
        :on-finish="hangingFinish"
        :submit-timeout="2000"
        title="超时保护演示"
      >
        <template #trigger>
          <button class="demo-link">打开弹窗（提交试试）</button>
        </template>
      </ElProModalForm>
    </section>

    <!-- 9. StepsForm 插槽 -->
    <section>
      <h4>9. StepsForm 渲染钩子（#steps 接管步骤条、#stepForm 包裹每步表单；getStepFormInstance 已有）</h4>
      <ElProStepsForm :steps="stepDefs" :model="{}">
        <template #steps="{ step }">
          <div class="demo-steps-tip">自定义步骤条：当前在第 {{ step + 1 }} 步（原生 ElSteps 换成了这个提示条）</div>
        </template>
      </ElProStepsForm>
    </section>

    <!-- 10. 字段组件 -->
    <section>
      <h4>10. 字段组件：Captcha / FieldSet（fieldComponent 接入）</h4>
      <ElProForm :columns="fieldColumns" :model="fieldModel" :show-actions="false" />
    </section>
  </div>
</template>

<style>
.form-advanced-page section {
  margin-top: 24px;
}
.form-advanced-page h4 {
  margin: 0 0 4px;
  font-size: 14px;
}
.form-advanced-page .hint {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.form-advanced-page .demo-link {
  margin: 0 4px;
  padding: 2px 8px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background: var(--el-bg-color);
  font-size: 12px;
  cursor: pointer;
}
.form-advanced-page .demo-dep-tip {
  padding: 8px 12px;
  margin-bottom: 8px;
  background: var(--el-color-primary-light-9);
  border-radius: 4px;
  font-size: 13px;
  color: var(--el-color-primary);
}
.form-advanced-page .demo-steps-tip {
  padding: 8px 12px;
  background: var(--el-color-warning-light-9);
  border-radius: 4px;
  font-size: 13px;
  color: var(--el-color-warning);
}
</style>
