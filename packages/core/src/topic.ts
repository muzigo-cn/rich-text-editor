import type { EditorContext, TopicItem } from './types'
import { DELETE_TOPIC_RANGE_DELAY, IOS_FOCUS_DELAY, NULL_CHAR_CLASS, POINTER_UP_NORMALIZE_DELAY, SELECTION_STABLE_DELAY, TOPIC_CLASS, TOPIC_COLOR, ZW_SPAN_CLASS } from './constants'
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
 * 1. 长按/拖选进行中(非收敛选区) → 完全走浏览器默认,选区稳定后统一规整话题边界
 * 2. 光标在话题内(collapsed) → 按移动方向定位:向左移入停在话题开头,向右移入停在话题末尾(零宽占位)
 * 3. Android:话题→零宽 的选区规整为整节点
 * 4. 缓存选区
 */
export function handleSelectionChange(ctx: EditorContext): void {
  const selection = window.getSelection()

  // 长按/拖选手势进行中:任何改写都会打断手势,交由浏览器默认处理;
  // 选区停止变化后,把落在话题中间的选区边界扩展为包裹整个话题
  if (selection && selection.rangeCount !== 0 && !selection.isCollapsed) {
    ctx.setCacheSelection()
    scheduleTopicSelectionNormalize()
    return
  }

  // 指针按下期间(单击定位/长按锚定):collapsed 光标不做定位改写,
  // 否则方向定位会挪动手势锚点,导致从话题上开始的长按/拖选起始位置错误
  if (!pointerDownActive) {
    normalizeCollapsedCaret(ctx)
  }

  if (selection && selection.rangeCount !== 0) {
    ctx.setCacheSelection()
  }
}

/**
 * collapsed 光标规整:话题内方向定位 + Android 选区节点化
 */
function normalizeCollapsedCaret(ctx: EditorContext): void {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return

  if (isInTopicSpan(selection)) {
    const topicSpan = selection?.focusNode?.parentElement as Element
    const nextNode = topicSpan?.nextElementSibling
    if (shouldCaretAtTopicStart(ctx, topicSpan)) {
      // 向左移入话题:光标停在话题开头,再次 Backspace 由 keydown 整体选中话题
      setSelection(topicSpan, 0)
    } else if (nextNode?.className.includes(NULL_CHAR_CLASS)) {
      // 向右移入话题(或默认):光标移入话题后的零宽占位
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
}

/** 指针按下状态(长按/拖选/单击手势期间为 true) */
let pointerDownActive = false
/** 指针抬起后的延迟规整定时器 */
let pointerUpTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 标记指针按下/抬起:
 * 按下期间禁用 collapsed 光标定位,保护长按手势锚点;
 * 抬起后延迟规整一次,覆盖"单击把光标放进话题内"的场景
 */
export function setPointerDown(ctx: EditorContext, active: boolean): void {
  pointerDownActive = active
  if (pointerUpTimer) {
    clearTimeout(pointerUpTimer)
    pointerUpTimer = null
  }
  if (!active) {
    pointerUpTimer = setTimeout(() => {
      pointerUpTimer = null
      normalizeCollapsedCaret(ctx)
    }, POINTER_UP_NORMALIZE_DELAY)
  }
}

/** 编辑器销毁时清理指针状态 */
export function clearPointerState(): void {
  pointerDownActive = false
  if (pointerUpTimer) {
    clearTimeout(pointerUpTimer)
    pointerUpTimer = null
  }
}

/** 长按选区稳定检测定时器(手势期间每次 selectionchange 重置) */
let topicNormalizeTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 长按/拖选选区稳定后规整:把落在话题中间的选区边界扩展为包裹整个话题
 * (deposeRangeStartAndEnd 仅在边界位于话题内部时改写,边界恰在话题开头/末尾时保持不动)
 */
function scheduleTopicSelectionNormalize(): void {
  if (topicNormalizeTimer) clearTimeout(topicNormalizeTimer)
  topicNormalizeTimer = setTimeout(() => {
    topicNormalizeTimer = null
    deposeRangeStartAndEnd()
  }, SELECTION_STABLE_DELAY)
}

/** 编辑器销毁时清理稳定检测定时器 */
export function clearTopicSelectionNormalize(): void {
  if (topicNormalizeTimer) {
    clearTimeout(topicNormalizeTimer)
    topicNormalizeTimer = null
  }
}

/**
 * 光标是否落在话题 span 内(基于传入 selection,供 selectionchange 使用)
 */
function isInTopicSpan(selection: Selection | null): boolean {
  const node = selection?.focusNode?.parentElement
  return node?.tagName === 'SPAN' && node.className.includes(TOPIC_CLASS)
}

/**
 * 光标位于话题上时,Backspace 选中整个话题(含后置零宽占位),下一次删除整体移除
 */
export function selectTopicSpan(): void {
  const selection = window.getSelection()
  const focusNode = selection?.focusNode
  if (!focusNode) return
  // 光标所在话题 span:自身是话题 span,或其父节点是话题 span
  const topicSpan = focusNode.nodeType === 1
    ? ((focusNode as Element).className?.includes?.(TOPIC_CLASS) ? (focusNode as Element) : null)
    : (focusNode.parentElement?.className.includes(TOPIC_CLASS) ? focusNode.parentElement : null)
  if (!topicSpan) return

  const endNode = topicSpan.nextElementSibling ?? topicSpan
  const range = new Range()
  range.setStart(topicSpan, 0)
  range.setEnd(endNode, endNode === topicSpan ? topicSpan.childNodes.length : 1)
  selection?.removeAllRanges()
  selection?.addRange(range)
}

/**
 * 光标是否位于话题上(话题 span 自身或其内部文本节点),供 Backspace 整体选中话题使用
 */
export function caretInTopicSpan(): boolean {
  const focusNode = window.getSelection()?.focusNode
  if (!focusNode) return false
  if (focusNode.nodeType === 1) {
    return !!(focusNode as Element).className?.includes?.(TOPIC_CLASS)
  }
  return !!focusNode.parentElement?.className.includes(TOPIC_CLASS)
}

/**
 * 是否应把光标停在话题开头:
 * 对比上一次缓存光标位置,话题位于旧光标之前说明用户自右向左移入话题
 */
function shouldCaretAtTopicStart(ctx: EditorContext, topicSpan: Element): boolean {
  const prevFocus = ctx.cacheSelection?.focusNode
  if (!prevFocus || prevFocus === topicSpan || topicSpan.contains(prevFocus)) return false
  const position = prevFocus.compareDocumentPosition(topicSpan)
  return !!(position & Node.DOCUMENT_POSITION_PRECEDING)
}
