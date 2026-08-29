import type { EditorContext, TopicItem } from './types'
import { DELETE_TOPIC_RANGE_DELAY, IOS_FOCUS_DELAY, NULL_CHAR_CLASS, TOPIC_CLASS, TOPIC_COLOR, ZW_SPAN_CLASS } from './constants'
import { deposeRangeStartAndEnd, setSelection } from './selection'

/**
 * 删除到话题时,把选区重定向为完整话题节点(下一次 Backspace 整体删除)
 */
export function deleteTopicSetRange(): void {
  setTimeout(() => {
    const selection = window.getSelection()
    const focusNode = selection?.focusNode as Element | null
    selection?.removeAllRanges()
    const range = new Range()

    // 正常输入法
    let newFocusNode = focusNode?.previousElementSibling
    if (!newFocusNode && focusNode?.parentElement?.previousElementSibling) {
      newFocusNode = focusNode.parentElement.previousElementSibling
    }

    if (newFocusNode?.className.includes(TOPIC_CLASS) && newFocusNode.nextElementSibling) {
      // 话题 span node
      range.setStart(newFocusNode, 0)
      range.setEnd(newFocusNode.nextElementSibling, 1)
      selection?.addRange(range)
    } else if (newFocusNode?.parentElement?.className.includes(TOPIC_CLASS) && newFocusNode.parentElement.nextElementSibling) {
      // 话题 text node
      range.setStart(newFocusNode.parentElement, 0)
      range.setEnd(newFocusNode.parentElement.nextElementSibling, 1)
      selection?.addRange(range)
    }
  }, DELETE_TOPIC_RANGE_DELAY)
}

/**
 * 构建话题节点(高亮 span,携带话题 id)
 */
function buildTopicNode(topicItem: TopicItem): HTMLSpanElement {
  const nodeTopic = document.createElement('span')
  nodeTopic.className = `${TOPIC_CLASS} ${topicItem.id}`
  nodeTopic.style.color = TOPIC_COLOR
  nodeTopic.textContent = `#${topicItem.title}`
  return nodeTopic
}

/**
 * 构建话题后零宽占位 span(承接光标,不参与长度统计)
 */
function createNullCharSpan(): HTMLSpanElement {
  const span = document.createElement('span')
  span.innerHTML = '&#8203;'
  span.className = NULL_CHAR_CLASS
  span.contentEditable = 'true'
  return span
}

/**
 * 无焦点时定位到编辑器内的占位 span(保证插入有落点)
 */
function focusZwSpan(ctx: EditorContext): void {
  const span = ctx.root.getElementsByClassName(ZW_SPAN_CLASS)[0]
  if (!span) return
  setSelection(span, 0)
  ctx.setCacheSelection()
}

/**
 * 话题插入主流程
 * 结构:[beginSpan][前文本][话题span][零宽span][间隔span][nbsp span][后文本]
 */
export function insertTopic(ctx: EditorContext, topicItem: TopicItem, topicFrom: 'hash' | 'tab' = 'hash'): void {
  const root = ctx.root

  // 无焦点场景:末尾创建占位 span 并定位光标
  if (!window.getSelection()?.focusNode && !ctx.cacheSelection?.focusNode) {
    if (!root.getElementsByClassName(ZW_SPAN_CLASS).length) {
      root.innerHTML += `<span class="${ZW_SPAN_CLASS}" contenteditable="true"></span>`
    }
    if (root.innerHTML.slice(-55) === `<span class="${ZW_SPAN_CLASS}" contenteditable="true"></span>`) {
      focusZwSpan(ctx)
    }
  }

  let selection = ctx.cacheSelection

  // 空内容场景:重建占位 span 并定位
  if (!root.getElementsByClassName(ZW_SPAN_CLASS).length && root.innerText === '') {
    root.innerHTML = `<span class="${ZW_SPAN_CLASS}" contenteditable="true"></span>`
  }
  if (root.innerHTML === `<span class="${ZW_SPAN_CLASS}" contenteditable="true"></span>`) {
    focusZwSpan(ctx)
    selection = ctx.cacheSelection
  }

  const focusNode = selection?.focusNode as Node | null
  const textContent = focusNode?.textContent as string
  // 获取光标前字符
  const position: number = selection?.range?.endOffset || 0
  const char = selection?.focusNode?.textContent?.charAt(position === undefined ? -1 : position - 1)
  const from = topicFrom === 'tab' ? 0 : 1
  let charBefore = textContent?.substring(0, position - from) ?? ''
  if (char === '#') {
    // 移除触发用的 #(修复原实现 substring 结果未赋值的问题)
    charBefore = charBefore.slice(0, -1)
  }
  const charAfter = textContent?.substring(position, textContent.length) ?? ''

  let focusElement = focusNode as Element | null
  if (!focusElement) return
  if (focusElement.nodeType === 3 && focusElement.parentElement?.nodeName === 'SPAN') {
    focusElement = focusElement.parentElement
  } else if (focusElement.childElementCount === 1 && focusElement.tagName === 'DIV' && focusElement.firstElementChild?.tagName === 'BR') {
    focusElement = (focusElement.firstElementChild as Element) ?? focusElement
  } else if (focusElement === root) {
    focusElement = (root.childNodes[0] as Element) ?? null
    if (!focusElement) return
  }

  // 焦点必须落在编辑器内,防止跨编辑器重复插入
  if (!root.contains(focusElement)) return

  const nodeBefore = document.createTextNode(charBefore)
  const nodeAfter = document.createTextNode(charAfter)
  const nodeTopic = buildTopicNode(topicItem)
  const nodeBegin = document.createElement('span')
  nodeBegin.contentEditable = 'true'
  const nodeBlank = document.createElement('span')
  nodeBlank.innerHTML = '&nbsp;'
  const nodeSpace = document.createElement('span')
  nodeSpace.style.minWidth = '1px'
  const spanDelete = createNullCharSpan()

  focusElement.replaceWith(nodeBegin, nodeBefore, nodeTopic, spanDelete, nodeSpace, nodeBlank, nodeAfter)
  ctx.refresh()
  setSelection(nodeAfter, 0)

  // 兼容 iOS 键盘从右侧出现的时序问题(经验值,需真机回归)
  if (ctx.os === 'iOS') {
    setTimeout(() => root.focus(), IOS_FOCUS_DELAY)
  } else {
    ctx.platform.onFocus?.(root)
    root.focus()
  }
}

/**
 * selectionchange 统一处理:
 * 1. 光标在话题内 → 定位/补建零宽占位 span
 * 2. Android:话题→零宽 的选区规整为整节点
 * 3. 缓存选区
 * 4. iOS:禁止部分选中话题
 */
export function handleSelectionChange(ctx: EditorContext): void {
  const selection = window.getSelection()

  if (isInTopicSpan(selection)) {
    const topicSpan = selection?.focusNode?.parentElement as Element
    const nextNode = topicSpan?.nextElementSibling
    if (nextNode?.className.includes(NULL_CHAR_CLASS)) {
      // 已存在零宽节点:光标移入其中
      setSelection(nextNode, 1)
    } else {
      // 不存在:补建零宽占位 span
      const span = createNullCharSpan()
      topicSpan.parentElement?.insertBefore(span, topicSpan.nextSibling)
      setSelection(span, 1)
      ctx.refresh()
    }
  }

  // 如果选区是文本节点,设为节点级选区 --- 针对安卓
  if (ctx.os === 'Android') {
    if (selection && selection.rangeCount !== 0) {
      const range = selection.getRangeAt(0)
      const startEl = range.startContainer.parentElement
      const endEl = range.endContainer.parentElement
      if (startEl?.className.includes(TOPIC_CLASS) && endEl?.className.includes(NULL_CHAR_CLASS)) {
        range.setStart(startEl, 0)
        range.setEnd(endEl, 1)
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }
  }

  if (selection && selection.rangeCount !== 0) {
    ctx.setCacheSelection()
  }

  if (ctx.os === 'iOS') {
    // 选区发生变化时的边界处理
    deposeRangeStartAndEnd()
  }
}

/**
 * 光标是否落在话题 span 内(基于传入 selection,供 selectionchange 使用)
 */
function isInTopicSpan(selection: Selection | null): boolean {
  const node = selection?.focusNode?.parentElement
  return node?.tagName === 'SPAN' && node.className.includes(TOPIC_CLASS)
}
