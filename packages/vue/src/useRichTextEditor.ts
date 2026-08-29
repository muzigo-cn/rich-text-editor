import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import type { Ref } from 'vue'
import { createRichTextEditor } from '@fe-muzi/rte-core'
import type { EditorOptions, RichTextEditor } from '@fe-muzi/rte-core'

export type UseRichTextEditorOptions = Omit<EditorOptions, 'root'>

/**
 * options 来源:直接传对象(初值快照),或传 getter(每次回调读取最新值)。
 * 组件内部使用 getter 形式保证 props 动态转发。
 */
export type UseRichTextEditorSource = UseRichTextEditorOptions | (() => UseRichTextEditorOptions)

export interface UseRichTextEditorReturn {
  /** 挂载编辑器根节点 */
  ref: Ref<HTMLDivElement | null>
  /** core 实例(shallowRef 避免深度代理),命令式调用 insertTopic/insertMedia 等 */
  editorRef: Ref<RichTextEditor | null>
}

/**
 * 创建/销毁 core 实例:
 * - 实例只在 mounted 创建一次,回调用 getter 转发,避免闭包过期
 */
export function useRichTextEditor(source: UseRichTextEditorSource = {}): UseRichTextEditorReturn {
  const getOptions = (): UseRichTextEditorOptions => (typeof source === 'function' ? source() : source)

  const rootRef = ref<HTMLDivElement | null>(null)
  const editorRef = shallowRef<RichTextEditor | null>(null)

  onMounted(() => {
    const el = rootRef.value
    if (!el) return

    editorRef.value = createRichTextEditor({
      ...getOptions(),
      root: el,
      // 转发链:每次回调重新读取最新 options
      onChange: (html, plain, length) => getOptions().onChange?.(html, plain, length),
      onTopicTrigger: () => getOptions().onTopicTrigger?.(),
      onMediaRequest: (type) => getOptions().onMediaRequest?.(type),
      onMediaInsert: (items) => getOptions().onMediaInsert?.(items),
      onMediaStatusChange: (localId, status, url) => getOptions().onMediaStatusChange?.(localId, status, url),
      onLengthLimit: (isOver) => getOptions().onLengthLimit?.(isOver),
    })
  })

  onBeforeUnmount(() => {
    editorRef.value?.destroy()
    editorRef.value = null
  })

  return { ref: rootRef, editorRef }
}
