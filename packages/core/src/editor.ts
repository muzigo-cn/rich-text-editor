import type { EditorContext, EditorOptions, PlatformAdapter, RichTextEditor } from './types'
import { DEFAULT_MAX_LENGTH, IMG_BOX_CLASS, NULL_CHAR_CLASS, PLACEHOLDER_CLASS, ROOT_CLASS, TOPIC_CLASS } from './constants'
import { webPlatform } from './platform'
import { ImeState } from './ime'
import { getCacheSelection, setSelection } from './selection'
import { handleSelectionChange, insertTopic, selectTopicSpan, caretInTopicSpan, clearTopicSelectionNormalize, setPointerDown, clearPointerState } from './topic'
import {
  appendDivZwBr,
  deleteDivZwBr,
  insertFile,
  lastInsertImgBoxHandle,
  preventDefaultDelete,
  removeMedia as removeMediaNode,
  setMediaStatus,
} from './media'
import { handleInput, refreshContent } from './event'

/**
 * placeholder 展示控制:内容为空(且无媒体)时按聚焦态展示对应文案
 */
function updatePlaceholder(ctx: EditorContext): void {
  const root = ctx.root
  const placeholder = ctx.options.placeholder
  const hasMedia = !!root.querySelector(`.${IMG_BOX_CLASS}`)
  const empty = (root.innerText || '').length === 0 && !hasMedia
  const content = empty
    ? ctx.isFocused
      ? placeholder?.focus ?? placeholder?.blur ?? ''
      : placeholder?.blur ?? placeholder?.focus ?? ''
    : ''

  if (content) {
    root.setAttribute('data-placeholder', content)
    root.classList.add(PLACEHOLDER_CLASS)
  } else {
    root.classList.remove(PLACEHOLDER_CLASS)
    root.removeAttribute('data-placeholder')
  }
}

/**
 * 创建富文本编辑器实例:挂载 contentEditable、绑定事件、协调各子模块
 */
export function createRichTextEditor(options: EditorOptions): RichTextEditor {
  const root = options.root
  const platform: PlatformAdapter = { ...webPlatform, ...options.platform }
  const ime = new ImeState()

  const ctx: EditorContext = {
    root,
    options,
    platform,
    os: platform.getOS(),
    maxLength: options.maxLength ?? DEFAULT_MAX_LENGTH,
    text: '',
    length: 0,
    isFocused: false,
    ime,
    cacheSelection: null,
    setCacheSelection: () => {
      ctx.cacheSelection = getCacheSelection()
    },
    refresh: () => {
      refreshContent(ctx)
      updatePlaceholder(ctx)
    },
  }

  root.setAttribute('contenteditable', 'true')
  root.setAttribute('spellcheck', 'false')
  root.classList.add(ROOT_CLASS)

  const onInput = () => handleInput(ctx)

  const onKeyDown = (e: KeyboardEvent) => {
    // 搜狗英文态(keyCode 229):光标从话题跨到零宽节点时,恢复光标到前文本并清理残留节点
    if (e.key === 'Unidentified' && e.keyCode === 229) {
      const range = window.getSelection()?.getRangeAt(0)
      const startContainer = range?.startContainer as Element | undefined
      const endContainer = range?.endContainer as Element | undefined
      if (
        startContainer
        && endContainer
        && startContainer.className?.includes(TOPIC_CLASS)
        && endContainer.className?.includes(NULL_CHAR_CLASS)
      ) {
        const prev = startContainer.previousSibling
        if (prev && prev.nodeType === 3) {
          setSelection(prev, (prev as Text).length)
          startContainer.replaceWith('')
          endContainer.replaceWith('')
        }
      }
    }

    ime.setKey(e.key)
    ctx.setCacheSelection()

    // 光标位于话题内:Backspace 不逐字删除,改为选中整个话题(下一次删除整体移除)
    if (e.key === 'Backspace' && caretInTopicSpan()) {
      e.preventDefault()
      selectTopicSpan()
      return
    }

    // 媒体原子块删除保护 + 整体删除
    preventDefaultDelete(ctx, e)
  }

  const onFocus = () => {
    ctx.isFocused = true
    platform.onFocus?.(root)
    if (ctx.os === 'iOS') platform.setScrollEnabled?.(false)
    ctx.setCacheSelection()
    updatePlaceholder(ctx)
  }

  const onBlur = () => {
    ctx.isFocused = false
    if (ctx.os === 'iOS') platform.setScrollEnabled?.(true)
    ctx.setCacheSelection()
    // 失焦时清理多余占位 / 为尾部媒体补占位
    deleteDivZwBr(root)
    if (lastInsertImgBoxHandle(root)) appendDivZwBr(root)
    updatePlaceholder(ctx)
  }

  const onCompositionStart = () => ime.startComposition()

  const onCompositionEnd = () => {
    ime.endComposition()
    ctx.setCacheSelection()
    handleInput(ctx)
  }

  const onSelectionChange = () => handleSelectionChange(ctx)

  // 指针手势状态:按下期间禁用 collapsed 光标定位,保护长按/拖选的手势锚点
  const onPointerDown = () => setPointerDown(ctx, true)
  const onPointerUp = () => setPointerDown(ctx, false)

  root.addEventListener('input', onInput)
  root.addEventListener('keydown', onKeyDown)
  root.addEventListener('focus', onFocus)
  root.addEventListener('blur', onBlur)
  root.addEventListener('compositionstart', onCompositionStart)
  root.addEventListener('compositionend', onCompositionEnd)
  root.addEventListener('pointerdown', onPointerDown)
  root.addEventListener('pointerup', onPointerUp)
  document.addEventListener('selectionchange', onSelectionChange)

  return {
    insertTopic: (item, from = 'hash') => insertTopic(ctx, item, from),
    insertMedia: (files, type) => insertFile(ctx, files, type),
    setMediaStatus: (localId, status, url) => {
      setMediaStatus(root, localId, status, url)
      options.onMediaStatusChange?.(localId, status, url)
      ctx.refresh()
    },
    removeMedia: (localId) => {
      removeMediaNode(root, localId)
      ctx.refresh()
    },
    getHTML: () => root.innerHTML,
    getPlain: () => root.innerText,
    getLength: () => ctx.length,
    focus: () => root.focus(),
    blur: () => root.blur(),
    destroy: () => {
      root.removeEventListener('input', onInput)
      root.removeEventListener('keydown', onKeyDown)
      root.removeEventListener('focus', onFocus)
      root.removeEventListener('blur', onBlur)
      root.removeEventListener('compositionstart', onCompositionStart)
      root.removeEventListener('compositionend', onCompositionEnd)
      document.removeEventListener('selectionchange', onSelectionChange)
      root.removeEventListener('pointerdown', onPointerDown)
      root.removeEventListener('pointerup', onPointerUp)
      clearTopicSelectionNormalize()
      clearPointerState()
      root.classList.remove(ROOT_CLASS, PLACEHOLDER_CLASS)
      root.removeAttribute('contenteditable')
      root.removeAttribute('spellcheck')
      root.removeAttribute('data-placeholder')
    },
  }
}
