// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'

/**
 * Quill 2 的 mock：只模拟封装层用到的交互面——
 * 构造参数、on('text-change'/'editor-change')、root、enable、
 * clipboard.dangerouslyPasteHTML、insertEmbed、getSelection、insertText。
 */
const quillInstances: any[] = []

vi.mock('quill', () => {
  return {
    default: class QuillMock {
      root = { innerHTML: '', addEventListener: vi.fn(), removeEventListener: vi.fn() }
      handlers = new Map<string, Array<() => void>>()
      __options: any
      __selection: any = null
      __length = 0
      __enabled = true
      __inserts: Array<{ index: number; type: string; value: unknown }> = []
      constructor(el: unknown, options: any) {
        this.__options = options
        quillInstances.push(this)
      }
      on(name: string, cb: () => void) {
        const list = this.handlers.get(name) ?? []
        list.push(cb)
        this.handlers.set(name, list)
        return this
      }
      emit(name: string) {
        ;(this.handlers.get(name) ?? []).forEach((cb) => cb(name))
      }
      /** 模拟 Quill 的 editor-change：回调第一个参数是子事件名（selection-change/text-change） */
      emitEditorChange(sub: string) {
        ;(this.handlers.get('editor-change') ?? []).forEach((cb) => cb(sub))
      }
      enable(enabled: boolean) {
        this.__enabled = enabled
      }
      getHTML() {
        return this.root.innerHTML
      }
      hasFocus() {
        return this.__focused
      }
      __focused = false
      getSelection() {
        return this.__selection ?? { index: 0, length: 0 }
      }
      getLength() {
        return this.__length
      }
      insertEmbed(index: number, type: string, value: unknown) {
        this.__inserts.push({ index, type, value })
      }
      insertText(index: number, text: string) {
        this.__inserts.push({ index, type: 'text', value: text })
      }
      setSelection(index: number) {
        this.__selection = { index }
      }
      clipboard = {
        dangerouslyPasteHTML: vi.fn((html: string) => {
          this.root.innerHTML = html
        }),
      }
    },
  }
})

import ElProRichText from '../src/components/ElProRichText/ElProRichText.vue'

beforeEach(() => {
  quillInstances.length = 0
})
afterEach(() => {
  vi.restoreAllMocks()
})

function mountEditor(props: Record<string, any> = {}) {
  return mount(ElProRichText, { props })
}

/** 拦 document.createElement('input')：捕获文件选择器并自动喂入文件触发 onchange */
function interceptFileInput(file: File) {
  const inputs: any[] = []
  const originalCreate = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    const el = originalCreate(tag)
    if (tag === 'input') {
      inputs.push(el)
      Object.defineProperty(el, 'files', { value: [file] })
      setTimeout(() => el.onchange?.({ target: el } as any), 0)
    }
    return el
  })
  return inputs
}

describe('ElProRichText（Quill 2 封装）', () => {
  it('挂载创建 Quill 实例：snow 主题、默认工具栏、placeholder', () => {
    mountEditor({ placeholder: '写点什么' })
    expect(quillInstances).toHaveLength(1)
    const opts = quillInstances[0].__options
    expect(opts.theme).toBe('snow')
    expect(opts.placeholder).toBe('写点什么')
    expect(opts.modules.toolbar.container[0]).toContain('bold')
    expect(opts.modules.toolbar.handlers.image).toBeTypeOf('function')
  })

  it('v-model：编辑器 text-change → emit update:modelValue；外部值不同 → dangerouslyPasteHTML', async () => {
    const emitted: string[] = []
    const wrapper = mount(ElProRichText, {
      props: { modelValue: '', 'onUpdate:modelValue': (v: string) => emitted.push(v) },
    })
    const q = quillInstances[0]
    q.root.innerHTML = '<p>你好</p>'
    q.emit('text-change')
    await nextTick()
    expect(emitted).toEqual(['<p>你好</p>'])

    await wrapper.setProps({ modelValue: '<p>外部</p>' })
    await nextTick()
    expect(q.clipboard.dangerouslyPasteHTML).toHaveBeenCalledWith('<p>外部</p>')
    // 值相同时不再触发（防循环）
    ;(q.clipboard.dangerouslyPasteHTML as any).mockClear()
    await wrapper.setProps({ modelValue: '<p>外部</p>' })
    await nextTick()
    expect(q.clipboard.dangerouslyPasteHTML).not.toHaveBeenCalled()
  })

  it('初始内容：挂载时写入编辑器（走 clipboard 归一化）', () => {
    mountEditor({ modelValue: '<p>初始内容</p>' })
    const q = quillInstances[0]
    expect(q.clipboard.dangerouslyPasteHTML).toHaveBeenCalledWith('<p>初始内容</p>')
    // 空值不写（placeholder 由 Quill 自己出）
    ;(q.clipboard.dangerouslyPasteHTML as any).mockClear()
    mountEditor({ modelValue: '' })
    expect(quillInstances[1].clipboard.dangerouslyPasteHTML).not.toHaveBeenCalled()
  })

  it('disabled 切换 → quill.enable', async () => {
    const wrapper = mountEditor({ disabled: false })
    const q = quillInstances[0]
    await wrapper.setProps({ disabled: true })
    await nextTick()
    expect(q.__enabled).toBe(false)
    await wrapper.setProps({ disabled: false })
    await nextTick()
    expect(q.__enabled).toBe(true)
  })

  it('工具栏图片按钮：无 imageUpload 时回落 base64 插入', async () => {
    mountEditor()
    const q = quillInstances[0]
    const handler = q.__options.modules.toolbar.handlers.image as () => void

    const fakeFile = new File(['x'], 'a.png', { type: 'image/png' })
    const inputs = interceptFileInput(fakeFile)
    const readerResult = 'data:image/png;base64,xxx'
    vi.spyOn(window as any, 'FileReader').mockImplementation(function () {
      return {
        readAsDataURL: function () {
          this.onload?.()
        },
        result: readerResult,
        onload: null,
        onerror: null,
      }
    })

    handler()
    await vi.waitFor(() => expect(q.__inserts.length).toBe(1))
    expect(q.__inserts[0]).toMatchObject({ type: 'image', value: readerResult })
    expect(inputs[0].getAttribute('accept')).toBe('image/*')
  })

  it('imageUpload 注入：resolve 的 URL 作为图片插入，上传期间显示遮罩', async () => {
    let resolveUpload: (url: string) => void = () => {}
    const upload = vi.fn(() => new Promise<string>((r) => (resolveUpload = r)))
    const wrapper = mountEditor({ imageUpload: upload })
    const q = quillInstances[0]

    interceptFileInput(new File(['x'], 'a.png', { type: 'image/png' }))
    ;(q.__options.modules.toolbar.handlers.image as () => void)()
    await vi.waitFor(() => expect(upload).toHaveBeenCalledTimes(1))
    expect(wrapper.find('.el-pro-rich-text__uploading').exists()).toBe(true)
    resolveUpload('https://cdn.example.com/a.png')
    await vi.waitFor(() => expect(q.__inserts.length).toBe(1))
    expect(q.__inserts[0]).toMatchObject({ type: 'image', value: 'https://cdn.example.com/a.png' })
    await nextTick()
    expect(wrapper.find('.el-pro-rich-text__uploading').exists()).toBe(false)
  })

  it('粘贴/拖拽图片走上传管道，非图片内容放行原生粘贴', async () => {
    const upload = vi.fn(async () => 'https://cdn.example.com/p.png')
    mountEditor({ imageUpload: upload })
    const q = quillInstances[0]
    const root = q.root as any
    const pasteListener = root.addEventListener.mock.calls.find(
      ([name]: any) => name === 'paste',
    )![1]

    // 图片粘贴：拦截并上传
    const imageFile = new File(['x'], 'a.png', { type: 'image/png' })
    const pasteImage: any = new Event('paste')
    pasteImage.clipboardData = { files: [imageFile] }
    pasteImage.preventDefault = vi.fn()
    pasteImage.stopPropagation = vi.fn()
    pasteListener(pasteImage)
    await vi.waitFor(() => expect(upload).toHaveBeenCalledWith(imageFile))
    expect(pasteImage.preventDefault).toHaveBeenCalled()

    // 文字粘贴：放行（不 preventDefault、不上传）
    const pasteText: any = new Event('paste')
    pasteText.clipboardData = { files: [] }
    pasteText.preventDefault = vi.fn()
    pasteListener(pasteText)
    expect(pasteText.preventDefault).not.toHaveBeenCalled()
    expect(upload).toHaveBeenCalledTimes(1)
  })

  it('disabled：粘贴/拖拽图片被拦截，不上传不改内容', async () => {
    const upload = vi.fn(async () => 'https://cdn.example.com/d.png')
    const wrapper = mountEditor({ disabled: true })
    const q = quillInstances[0]
    const root = q.root as any
    const pasteListener = root.addEventListener.mock.calls.find(
      ([name]: any) => name === 'paste',
    )![1]
    const imageFile = new File(['x'], 'a.png', { type: 'image/png' })
    const pasteImage: any = new Event('paste')
    pasteImage.clipboardData = { files: [imageFile] }
    pasteImage.preventDefault = vi.fn()
    pasteListener(pasteImage)
    // 禁用态：不拦截（放行原生行为）、不上传、内容不变
    expect(pasteImage.preventDefault).not.toHaveBeenCalled()
    expect(upload).not.toHaveBeenCalled()
    // 工具栏图片 handler 同样被挡
    ;(q.__options.modules.toolbar.handlers.image as () => void)()
    await nextTick()
    expect(upload).not.toHaveBeenCalled()
    expect(q.__inserts).toHaveLength(0)
  })

  it('多图粘贴：全部图片顺序上传（不只第一张）', async () => {
    const upload = vi.fn(async () => 'https://cdn.example.com/x.png')
    mountEditor({ imageUpload: upload })
    const q = quillInstances[0]
    const root = q.root as any
    const pasteListener = root.addEventListener.mock.calls.find(
      ([name]: any) => name === 'paste',
    )![1]
    const images = [
      new File(['a'], 'a.png', { type: 'image/png' }),
      new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
      new File(['c'], 'c.png', { type: 'image/png' }),
    ]
    const paste: any = new Event('paste')
    paste.clipboardData = { files: images }
    paste.preventDefault = vi.fn()
    pasteListener(paste)
    await vi.waitFor(() => expect(q.__inserts.length).toBe(3))
    expect(upload).toHaveBeenCalledTimes(3)
  })

  it('上传失败：发 uploadError 事件，静默不插图', async () => {
    const upload = vi.fn(() => Promise.reject(new Error('boom')))
    const onUploadError = vi.fn()
    const wrapper = mount(ElProRichText, {
      props: { modelValue: '', imageUpload: upload, onUploadError },
    })
    const q = quillInstances[0]
    interceptFileInput(new File(['x'], 'a.png', { type: 'image/png' }))
    ;(q.__options.modules.toolbar.handlers.image as () => void)()
    await vi.waitFor(() => expect(onUploadError).toHaveBeenCalledTimes(1))
    expect(onUploadError.mock.calls[0][0].message).toBe('boom')
    expect(q.__inserts).toHaveLength(0)
    // 遮罩消失
    await nextTick()
    expect(wrapper.find('.el-pro-rich-text__uploading').exists()).toBe(false)
  })

  it('focus/blur：只在焦点翻转时发，不随 selection-change 重复', async () => {
    const on = { focus: vi.fn(), blur: vi.fn() }
    mount(ElProRichText, { props: { modelValue: '', onFocus: on.focus, onBlur: on.blur } })
    const q = quillInstances[0]
    q.emitEditorChange('selection-change') // 未聚焦
    q.__focused = true
    q.emitEditorChange('selection-change') // 翻转 → focus
    q.emitEditorChange('selection-change') // 再次 selection-change，仍聚焦 → 不重复
    expect(on.focus).toHaveBeenCalledTimes(1)
    expect(on.blur).toHaveBeenCalledTimes(0)
    q.__focused = false
    q.emitEditorChange('selection-change') // 翻转 → blur
    expect(on.blur).toHaveBeenCalledTimes(1)
  })

  it('insertText 实例方法：在光标处插入文本并移动选区', () => {
    const wrapper = mountEditor()
    const q = quillInstances[0]
    ;(wrapper.vm as any).insertText('标记')
    expect(q.__inserts[0]).toMatchObject({ type: 'text', value: '标记' })
    expect(q.__selection).toEqual({ index: 2 })
  })
})
