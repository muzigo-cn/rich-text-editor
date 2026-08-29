import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type {
  EditorOptions,
  MediaInsertInfo,
  MediaType,
  RichTextEditor as CoreRichTextEditor,
  TopicItem,
  UploadStatus,
} from '@fe-muzi/rte-core'
import { useRichTextEditor } from './useRichTextEditor'
import { UploadFailure, UploadLoading } from './UploadStatus'

export interface RichTextEditorProps extends Omit<EditorOptions, 'root'> {
  className?: string
  style?: CSSProperties
  /**
   * 自定义上传态渲染(loading/failure 两态会 portal 到媒体节点内)
   * 默认内置 UploadLoading/UploadFailure;success 由 core 注入原生 img/video
   */
  renderUploadStatus?: (info: { localId: string; type: MediaType; status: UploadStatus }) => ReactNode
}

export interface RichTextEditorHandle
  extends Pick<
    CoreRichTextEditor,
    'insertTopic' | 'insertMedia' | 'setMediaStatus' | 'removeMedia' | 'getHTML' | 'getPlain' | 'getLength' | 'focus' | 'blur'
  > {
  /** Web 便利方法:插入本地 File,并经 mediaUploader 上传回刷状态 */
  insertFiles(files: File[], type: MediaType): void
}

function genLocalId(): string {
  return `rte_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>((props, ref) => {
  const { className, style, renderUploadStatus, ...editorOptions } = props

  // 宿主回调经 ref 转发,避免包装回调频繁变化
  const hostOptionsRef = useRef(editorOptions)
  hostOptionsRef.current = editorOptions

  // 上传态覆盖层:loading/failure 时 portal 到媒体节点内渲染
  const [overlays, setOverlays] = useState<Map<string, { el: HTMLElement; type: MediaType; status: UploadStatus }>>(new Map())

  const handleMediaInsert = useCallback((items: MediaInsertInfo[]) => {
    setOverlays((prev) => {
      const next = new Map(prev)
      items.forEach((item) => {
        if (item.status === 'loading') {
          next.set(item.localId, { el: item.element, type: item.type, status: item.status })
        }
      })
      return next
    })
    hostOptionsRef.current.onMediaInsert?.(items)
  }, [])

  const handleMediaStatusChange = useCallback((localId: string, status: UploadStatus, url?: string) => {
    setOverlays((prev) => {
      const next = new Map(prev)
      if (status === 'success') {
        // core 已注入原生 img/video,移除覆盖层
        next.delete(localId)
      } else if (next.has(localId)) {
        next.set(localId, { ...next.get(localId)!, status })
      }
      return next
    })
    hostOptionsRef.current.onMediaStatusChange?.(localId, status, url)
  }, [])

  const { ref: rootRef, editorRef } = useRichTextEditor({
    ...editorOptions,
    onMediaInsert: handleMediaInsert,
    onMediaStatusChange: handleMediaStatusChange,
  })

  const insertFiles = useCallback((files: File[], type: MediaType) => {
    const editor = editorRef.current
    if (!editor) return
    const uploader = hostOptionsRef.current.mediaUploader
    if (!uploader) {
      console.warn('[rte/react] mediaUploader 未配置,无法上传文件')
      return
    }
    files.forEach((file) => {
      const localId = genLocalId()
      // 只传 id:core 以 localIdentifier+id 拼接生成节点标识,重复传会导致回刷时匹配不到节点
      editor.insertMedia([{ id: localId, type, status: 'loading' }], type)
      uploader.upload(file, (status, url) => editor.setMediaStatus(localId, status, url))
    })
  }, [editorRef])

  useImperativeHandle(
    ref,
    () => ({
      insertTopic: (item: TopicItem, from?: 'hash' | 'tab') => editorRef.current?.insertTopic(item, from),
      insertMedia: (files, type) => editorRef.current?.insertMedia(files, type),
      setMediaStatus: (localId, status, url) => editorRef.current?.setMediaStatus(localId, status, url),
      removeMedia: (localId) => editorRef.current?.removeMedia(localId),
      insertFiles,
      getHTML: () => editorRef.current?.getHTML() ?? '',
      getPlain: () => editorRef.current?.getPlain() ?? '',
      getLength: () => editorRef.current?.getLength() ?? 0,
      focus: () => editorRef.current?.focus(),
      blur: () => editorRef.current?.blur(),
    }),
    [editorRef, insertFiles],
  )

  return (
    <>
      <div ref={rootRef} className={['rte-root', className].filter(Boolean).join(' ')} style={style} />
      {[...overlays.entries()].map(([localId, { el, type, status }]) =>
        createPortal(
          renderUploadStatus ? (
            renderUploadStatus({ localId, type, status })
          ) : status === 'loading' ? (
            <UploadLoading type={type} />
          ) : (
            <UploadFailure onDelete={() => editorRef.current?.removeMedia(localId)} />
          ),
          el,
          localId,
        ),
      )}
    </>
  )
})

RichTextEditor.displayName = 'RichTextEditor'
