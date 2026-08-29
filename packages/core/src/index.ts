export { createRichTextEditor } from './editor'
export { detectOS, webPlatform } from './platform'
export { ImeState } from './ime'

// 纯函数与 DOM 工具(框架无关,可独立复用)
export { pointLength, pointAt, pointSlice, countBr, computedLength, replaceBr } from './length'
export {
  setSelection,
  getCacheSelection,
  isInTopic,
  resetRange,
  deposeRangeStartAndEnd,
} from './selection'
export {
  createInsertFileNode,
  insertAfter,
  ensureTrailingZwBr,
  setMediaStatus,
  removeMedia,
  lastNodeIsFile,
  lastInsertImgBoxHandle,
  preInsertImgBoxHandle,
  focusDivZwBrHandle,
  preventDefaultDelete,
  appendDivZwBr,
  deleteDivZwBr,
} from './media'
export { deleteTopicSetRange, insertTopic, handleSelectionChange } from './topic'
export { normalizeFontNodes, handleInput, refreshContent } from './event'

// 类型
export type {
  OS,
  UploadStatus,
  MediaType,
  TopicItem,
  MediaFile,
  MediaInsertInfo,
  CustomSelection,
  PlatformAdapter,
  MediaUploader,
  EditorOptions,
  RichTextEditor,
} from './types'
