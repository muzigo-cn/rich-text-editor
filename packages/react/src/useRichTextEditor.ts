import { useEffect, useRef } from 'react'
import type { RefObject, MutableRefObject } from 'react'
import { createRichTextEditor } from '@fe-muzi/rte-core'
import type { EditorOptions, RichTextEditor } from '@fe-muzi/rte-core'

export type UseRichTextEditorOptions = Omit<EditorOptions, 'root'>

export interface UseRichTextEditorReturn {
  /** 挂载编辑器根节点 */
  ref: RefObject<HTMLDivElement>
  /** core 实例(命令式调用 insertTopic/insertMedia 等) */
  editorRef: MutableRefObject<RichTextEditor | null>
}

/**
 * 创建/销毁 core 实例:
 * - 实例只创建一次(props 变化不重建),回调用 optionsRef 转发,避免闭包过期
 */
export function useRichTextEditor(options: UseRichTextEditorOptions = {}): UseRichTextEditorReturn {
  const ref = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<RichTextEditor | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const editor = createRichTextEditor({
      ...optionsRef.current,
      root: el,
      // 转发链:动态取最新回调
      onChange: (html, plain, length) => optionsRef.current.onChange?.(html, plain, length),
      onTopicTrigger: () => optionsRef.current.onTopicTrigger?.(),
      onMediaRequest: (type) => optionsRef.current.onMediaRequest?.(type),
      onMediaInsert: (items) => optionsRef.current.onMediaInsert?.(items),
      onMediaStatusChange: (localId, status, url) => optionsRef.current.onMediaStatusChange?.(localId, status, url),
      onLengthLimit: (isOver) => optionsRef.current.onLengthLimit?.(isOver),
    })
    editorRef.current = editor

    return () => {
      editor.destroy()
      editorRef.current = null
    }
  }, [])

  return { ref, editorRef }
}
