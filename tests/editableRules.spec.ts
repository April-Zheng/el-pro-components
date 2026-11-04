import { describe, expect, it } from 'vitest'
import Schema from 'async-validator'

/**
 * 可编辑行保存校验（P1 #5）走的就是这套 async-validator 规则求值，
 * ElProTable.validateDraft 里的调用方式与这里一致，规则语义即 el-form 的 rules。
 */
describe('列 rules 校验（P1 #5 回归）', () => {
  const rules = [{ required: true, message: '名称必填' }]

  async function validate(prop: string, value: unknown, ruleSet = rules) {
    const validator = new Schema({ [prop]: ruleSet })
    await validator.validate({ [prop]: value })
  }

  it('空值触发 required，抛出 message', async () => {
    await expect(validate('name', '')).rejects.toMatchObject({
      errors: [{ message: '名称必填' }],
    })
  })

  it('合法值通过', async () => {
    await expect(validate('name', 'abc')).resolves.toBeUndefined()
  })

  it('自定义 validator 与 el-form 同语义', async () => {
    const ruleSet = [
      {
        validator: (_rule: unknown, value: number, callback: (error?: Error) => void) => {
          if (value < 0) callback(new Error('不能为负'))
          else callback()
        },
      },
    ]
    await expect(validate('count', -1, ruleSet)).rejects.toMatchObject({
      errors: [{ message: '不能为负' }],
    })
    await expect(validate('count', 1, ruleSet)).resolves.toBeUndefined()
  })
})
