import { defineComponent, h, shallowRef, Teleport } from 'vue'
import type { PropType, StyleValue, VNode } from 'vue'
import { createRichTextEditor } from '@rte/core'
import type {
  EditorOptions,
  MediaFile,
  MediaInsertInfo,
  MediaType,
  MediaUploader,
  PlatformAdapter,
  RichTextEditor as CoreRichTextEditor,
  TopicItem,
  UploadStatus,
} from '@rte/core'
import { useRichTextEditor } from './useRichTextEditor'
import { UploadFailure, UploadLoading } from './UploadStatus'

export interface RichTextEditorProps extends Omit<EditorOptions, 'root'> {
  className?: string
  style?: StyleValue
  /**
   * 自定义上传态渲染(loading/failure 两态会 Teleport 到媒体节点内)
   * 默认内置 UploadLoading/UploadFailure;success 由 core 注入原生 img/video
   */
  renderUploadStatus?: (info: { localId: string; type: MediaType; status: UploadStatus }) => VNode | string | null
}

export interface RichTextEditorHandle
  extends Pick<
    CoreRichTextEditor,
    'insertTopic' | 'insertMedia' | 'setMediaStatus' | 'removeMedia' | 'getHTML' | 'getPlain' | 'getLength' | 'focus' | 'blur'
  > {
  /** Web 便利方法:插入本地 File,并经 mediaUploader 上传回刷状态 */
  insertFiles(files: File[], type: MediaType): void
}

interface OverlayInfo {
  el: HTMLElement
  type: MediaType
  status: UploadStatus
}

function genLocalId(): string {
  return `rte_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export const RichTextEditor = defineComponent({
  name: 'RichTextEditor',

  props: {
    className: { type: String, default: undefined },
    style: { type: [Object, String, Array] as PropType<StyleValue>, default: undefined },
    maxLength: { type: Number, default: undefined },
    platform: { type: Object as PropType<Partial<PlatformAdapter>>, default: undefined },
    mediaUploader: { type: Object as PropType<MediaUploader>, default: undefined },
    placeholder: { type: Object as PropType<EditorOptions['placeholder']>, default: undefined },
    onChange: { type: Function as PropType<EditorOptions['onChange']>, default: undefined },
    onTopicTrigger: { type: Function as PropType<EditorOptions['onTopicTrigger']>, default: undefined },
    onMediaRequest: { type: Function as PropType<EditorOptions['onMediaRequest']>, default: undefined },
    onMediaInsert: { type: Function as PropType<EditorOptions['onMediaInsert']>, default: undefined },
    onMediaStatusChange: { type: Function as PropType<EditorOptions['onMediaStatusChange']>, default: undefined },
    onLengthLimit: { type: Function as PropType<EditorOptions['onLengthLimit']>, default: undefined },
    renderUploadStatus: {
      type: Function as PropType<RichTextEditorProps['renderUploadStatus']>,
      default: undefined,
    },
  },

  setup(props, { expose }) {
    // 上传态覆盖层:loading/failure 时 Teleport 到媒体节点内渲染(shallowRef 保持 DOM 元素原样)
    const overlays = shallowRef(new Map<string, OverlayInfo>())

    const setOverlay = (update: (next: Map<string, OverlayInfo>) => void) => {
      const next = new Map(overlays.value)
      update(next)
      overlays.value = next
    }

    const handleMediaInsert = (items: MediaInsertInfo[]) => {
      setOverlay((next) => {
        items.forEach((item) => {
          if (item.status === 'loading') {
            next.set(item.localId, { el: item.element, type: item.type, status: item.status })
          }
        })
      })
      props.onMediaInsert?.(items)
    }

    const handleMediaStatusChange = (localId: string, status: UploadStatus, url?: string) => {
      setOverlay((next) => {
        if (status === 'success') {
          // core 已注入原生 img/video,移除覆盖层
          next.delete(localId)
        } else if (next.has(localId)) {
          next.set(localId, { ...next.get(localId)!, status })
        }
      })
      props.onMediaStatusChange?.(localId, status, url)
    }

    const removeMediaWithOverlay = (localId: string) => {
      editorRef.value?.removeMedia(localId)
      // DOM 节点已移除,同步清理覆盖层,避免 Teleport 挂在失效节点上
      setOverlay((next) => next.delete(localId))
    }

    const { ref: rootRef, editorRef } = useRichTextEditor(() => ({
      maxLength: props.maxLength,
      platform: props.platform,
      mediaUploader: props.mediaUploader,
      placeholder: props.placeholder,
      // 宿主回调经 props 转发(props 为响应式代理,总是最新值)
      onChange: (html, plain, length) => props.onChange?.(html, plain, length),
      onTopicTrigger: () => props.onTopicTrigger?.(),
      onMediaRequest: (type) => props.onMediaRequest?.(type),
      onMediaInsert: handleMediaInsert,
      onMediaStatusChange: handleMediaStatusChange,
      onLengthLimit: (isOver) => props.onLengthLimit?.(isOver),
    }))

    const insertFiles = (files: File[], type: MediaType) => {
      const editor = editorRef.value
      if (!editor) return
      const uploader = props.mediaUploader
      if (!uploader) {
        console.warn('[rte/vue] mediaUploader 未配置,无法上传文件')
        return
      }
      files.forEach((file) => {
        const localId = genLocalId()
        // 只传 id:core 以 localIdentifier+id 拼接生成节点标识,重复传会导致回刷时匹配不到节点
        editor.insertMedia([{ id: localId, type, status: 'loading' }], type)
        uploader.upload(file, (status, url) => editor.setMediaStatus(localId, status, url))
      })
    }

    expose({
      insertTopic: (item: TopicItem, from?: 'hash' | 'tab') => editorRef.value?.insertTopic(item, from),
      insertMedia: (files: MediaFile[], type: MediaType) => editorRef.value?.insertMedia(files, type),
      setMediaStatus: (localId: string, status: UploadStatus, url?: string) =>
        editorRef.value?.setMediaStatus(localId, status, url),
      removeMedia: (localId: string) => removeMediaWithOverlay(localId),
      insertFiles,
      getHTML: () => editorRef.value?.getHTML() ?? '',
      getPlain: () => editorRef.value?.getPlain() ?? '',
      getLength: () => editorRef.value?.getLength() ?? 0,
      focus: () => editorRef.value?.focus(),
      blur: () => editorRef.value?.blur(),
    } satisfies RichTextEditorHandle)

    return () => {
      const nodes: VNode[] = [
        h('div', {
          ref: rootRef,
          class: ['rte-root', props.className].filter(Boolean),
          style: props.style,
        }),
      ]

      for (const [localId, info] of overlays.value) {
        nodes.push(
          h(Teleport, { to: info.el, key: localId }, {
            // slot 必须返回数组:Vue 对 Teleport 的 children 按数组迭代挂载,
            // 返回单个 VNode 会导致内容永不挂载
            default: () => [
              props.renderUploadStatus
                ? props.renderUploadStatus({ localId, type: info.type, status: info.status })
                : info.status === 'loading'
                  ? h(UploadLoading, { type: info.type })
                  : h(UploadFailure, { onDelete: () => removeMediaWithOverlay(localId) }),
            ],
          }),
        )
      }

      return nodes
    }
  },
})
