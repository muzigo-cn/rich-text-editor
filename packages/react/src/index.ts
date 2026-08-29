export { RichTextEditor } from './RichTextEditor'
export type { RichTextEditorProps, RichTextEditorHandle } from './RichTextEditor'
export { useRichTextEditor } from './useRichTextEditor'
export type { UseRichTextEditorOptions, UseRichTextEditorReturn } from './useRichTextEditor'
export { UploadLoading, UploadFailure } from './UploadStatus'

// 核心类型透出,宿主无需直接依赖 @fe-muzi/rte-core 也可声明类型
export type {
  TopicItem,
  MediaFile,
  MediaInsertInfo,
  MediaType,
  UploadStatus,
  PlatformAdapter,
  MediaUploader,
  EditorOptions,
} from '@fe-muzi/rte-core'
