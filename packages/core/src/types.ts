import type { ImeState } from './ime'
export type OS = 'iOS' | 'Android' | 'Other' | 'Web'

export type UploadStatus = 'loading' | 'success' | 'failure'

export type MediaType = 'image' | 'video'

export interface TopicItem {
  id: string | number
  title: string
}

export interface MediaFile {
  id: string
  type: MediaType
  /** 上传完成后的地址 */
  url?: string
  /** 上传状态,默认 loading */
  status?: UploadStatus
  /** 本地标识,用于上传完成后回刷对应 DOM 节点 */
  localIdentifier?: string
}

export interface CustomSelection {
  focusNode?: Node | null
  range?: Range
}

/**
 * 原生能力抽象:App 环境注入 JSBridge 实现,Web 环境使用默认实现
 */
export interface PlatformAdapter {
  getOS(): OS
  /** 聚焦时唤起键盘。默认: root.focus();App: autoFocusBridge */
  onFocus?(root: HTMLElement): void
  /** 聚焦时锁定滚动(iOS)。默认: no-op;App: scrollEnabledBridge */
  setScrollEnabled?(enabled: boolean): void
  /** 图片/视频预览。默认: 新窗口打开 */
  previewMedia?(src: string): void
}

/**
 * 上传器抽象:宿主注入上传实现(原生上传 / input[type=file] 模拟)
 */
export interface MediaUploader {
  upload(file: File | MediaFile, onStatus: (status: UploadStatus, url?: string) => void): void
}

/**
 * 媒体节点插入信息(适配层据此渲染上传态 UI)
 */
export interface MediaInsertInfo {
  localId: string
  type: MediaType
  status: UploadStatus
  /** 媒体原子块 DOM 节点(可作为 portal 宿主) */
  element: HTMLElement
}

export interface EditorOptions {
  root: HTMLElement
  /** 最大长度,默认 180 */
  maxLength?: number
  platform?: Partial<PlatformAdapter>
  mediaUploader?: MediaUploader
  placeholder?: { focus?: string; blur?: string }
  /** 内容变化(html 已做样式治理;plain 为纯文本;length 为 emoji 代理对按 1 计的真实长度) */
  onChange?: (html: string, plain: string, length: number) => void
  /** 输入 # 触发话题面板(由宿主弹出面板,选中后调用 insertTopic) */
  onTopicTrigger?: () => void
  /** 请求插入媒体(宿主弹相册/相机或文件选择) */
  onMediaRequest?: (type: MediaType) => void
  /** 媒体节点插入后回调(loading 态节点由适配层渲染占位 UI) */
  onMediaInsert?: (items: MediaInsertInfo[]) => void
  /** 某个媒体节点上传状态变化 */
  onMediaStatusChange?: (localId: string, status: UploadStatus, url?: string) => void
  /** 超长提示(仅回调,不阻断输入) */
  onLengthLimit?: (isOver: boolean) => void
}

export interface RichTextEditor {
  /** 插入话题(从话题面板选中后调用;from 为 'hash' 表示由 # 触发,插入时移除触发符) */
  insertTopic(item: TopicItem, from?: 'hash' | 'tab'): void
  /** 插入图片/视频(图文混排) */
  insertMedia(files: MediaFile[], type: MediaType): void
  /** 上传完成后回刷媒体节点状态 */
  setMediaStatus(localId: string, status: UploadStatus, url?: string): void
  /** 移除媒体节点 */
  removeMedia(localId: string): void
  getHTML(): string
  getPlain(): string
  getLength(): number
  focus(): void
  blur(): void
  destroy(): void
}

/**
 * @internal 编辑器内部上下文,贯通各子模块
 */
export interface EditorContext {
  root: HTMLElement
  options: EditorOptions
  platform: PlatformAdapter
  os: OS
  maxLength: number
  /** 上一次内容快照(innerText),用于增删方向判定 */
  text: string
  /** 当前真实长度 */
  length: number
  isFocused: boolean
  ime: ImeState
  cacheSelection: CustomSelection | null
  setCacheSelection(): void
  refresh(): void
}
