<script setup lang="ts">
/**
 * 字段组示例：一个可增删的联系人列表。
 *
 * 这里刻意把「最少 1 项 / 最多 3 项 / 可复制」都打开，
 * 因为这几条是边界——只测加法测不出删除按钮的禁用、也测不出下标漂移。
 */
import { reactive, ref } from 'vue'
import { ElProForm } from '@/index'
import type { ProColumn } from '@/index'

const columns: ProColumn[] = [
  {
    prop: 'projectName',
    label: '项目名称',
    valueType: 'text',
    rules: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  },
  {
    prop: 'contacts',
    label: '联系人',
    valueType: 'formList',
    formSpan: 24,
    // 组本身也要校验：给数组加 type: 'array'，async-validator 才会按键长判空
    rules: [{ required: true, type: 'array', message: '至少需要一位联系人', trigger: 'change' }],
    children: [
      {
        prop: 'name',
        label: '姓名',
        valueType: 'text',
        formSpan: 8,
        rules: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
      },
      {
        prop: 'phone',
        label: '电话',
        valueType: 'text',
        formSpan: 8,
        rules: [
          { required: true, message: '请输入电话', trigger: 'blur' },
          { pattern: /^1\d{10}$/, message: '手机号格式不对', trigger: 'blur' },
        ],
      },
      { prop: 'email', label: '邮箱', valueType: 'text', formSpan: 8 },
    ],
    formListProps: {
      min: 1,
      max: 3,
      copyable: true,
      addText: '添加联系人',
      itemTitle: (item: Record<string, any>, index: number) =>
        item.name ? String(item.name) : `联系人 ${index + 1}`,
    },
  },
]

// 注意 contacts 一开始是空数组：组件会按 min 自动补一项，不用在页面里手工塞
const model = reactive<Record<string, any>>({
  projectName: '',
  contacts: [],
})

const submitted = ref('')

function onSubmit(values: Record<string, any>) {
  submitted.value = JSON.stringify(values, null, 2)
}
</script>

<template>
  <div class="demo-card">
    <h3 class="demo-section-title">ElProForm · 字段组 formList</h3>
    <p class="demo-section-desc">
      值为对象数组，每项按 children 渲染。最少 1 项、最多 3 项、可复制；
      子字段的必填规则会跟着 ElProForm 的校验一起跑，不需要另外聚合。
    </p>

    <ElProForm :columns="columns" :model="model" :span="12" label-width="90px" @submit="onSubmit" />
  </div>

  <div class="demo-card">
    <h3 class="demo-section-title">提交结果</h3>
    <p class="demo-section-desc">
      校验通过后 model 长这样。行标识用的是 Symbol，不会出现在提交数据里。
    </p>
    <pre class="demo-formlist-json">{{ submitted || '（还没提交）' }}</pre>
  </div>
</template>

<style scoped>
.demo-formlist-json {
  margin: 0;
  padding: 12px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.6;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}
</style>
