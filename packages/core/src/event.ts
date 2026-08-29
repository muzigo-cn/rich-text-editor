import type { EditorContext, OS } from './types'
import { FONT_TOPIC_COLOR, IMG_BOX_CLASS, NULL_CHAR_CLASS, TOPIC_CLASS, TOPIC_COLOR } from './constants'
import { resetRange, setSelection } from './selection'
import { deleteTopicSetRange } from './topic'
import { appendDivZwBr, lastInsertImgBoxHandle } from './media'
import { computedLength, pointLength, replaceBr } from './length'

/**
 * FONT 治理:浏览器粘贴产生的 color=#2762ec font 标签替换为纯文本节点,
 * 防止话题高亮色跟随后续输入(iOS 的 font 可能嵌套两层)
 */
export function normalizeFontNodes(os: OS): void {
  const focusNode = window.getSelection()?.focusNode
  if (!focusNode) return

  const parent = focusNode.parentElement
  if (parent instanceof HTMLFontElement && parent.color.toLowerCase() === FONT_TOPIC_COLOR) {
    const textNode = document.createTextNode(parent.innerHTML)
    parent.replaceWith(textNode)
    setSelection(textNode, textNode.length)
    return
  }

  if (os === 'iOS') {
    const grand = parent?.parentElement
    if (grand instanceof HTMLFontElement && grand.color.toLowerCase() === FONT_TOPIC_COLOR) {
      const textNode = document.createTextNode(grand.innerHTML)
      grand.replaceWith(textNode)
      setSelection(textNode, textNode.length)
    }
  }
}

/**
 * # 字符检测:内容只有 # 时规整为 span 结构,并触发话题面板回调
 */
function handleTopicTrigger(ctx: EditorContext): void {
  const selection = window.getSelection()
  const focusText = selection?.focusNode?.textContent
  if (!focusText) return

  const position = selection?.getRangeAt(0).endOffset
  // 光标前字符
  const focusChar = focusText.charAt(position === undefined ? -1 : position - 1)
  if (focusChar !== '#') return

  // 光标前字符为 # 且编辑器只有 # 时,把裸文本节点规整为 span 结构
  if (ctx.text.length === 1) {
    const focusNode = selection?.focusNode as Element
    const node1 = document.createElement('span')
    const node2 = document.createElement('span')
    node2.innerText = focusChar
    focusNode.replaceWith(node1, node2)
    setSelection(node2, 1)
  }
  // 触发话题面板(宿主弹出,选中后调用 insertTopic)
  ctx.options.onTopicTrigger?.()
}

/**
 * 内容变化统一分发(原 handleDivChange,去除 React 依赖后直接读 root):
 * 删除分支:话题选区重定向 / FONT 治理 / 选区恢复 / br 清理 / 媒体占位
 * 输入分支:组词态仅统计 / # 检测 / FONT 治理
 */
export function handleInput(ctx: EditorContext): void {
  const root = ctx.root
  const text = root.innerText
  const html = root.innerHTML

  // 删除时
  if (ctx.ime.isDeleting() || text.length < ctx.text.length) {
    const focusNode = window.getSelection()?.focusNode as Element | null

    // 删除到话题:选区选择整个话题
    if (focusNode && focusNode.parentElement?.className.includes(TOPIC_CLASS)) {
      deleteTopicSetRange()
    }

    normalizeFontNodes(ctx.os)

    // 防止删除话题之后,输入文本颜色跟随
    resetRange()

    replaceBr(root)

    // 最后是媒体容器时补换行占位,保证可继续输入
    if (lastInsertImgBoxHandle(root)) {
      appendDivZwBr(root, true)
    }

    ctx.refresh()
    return
  }

  // 是否输入
  if (text.length > ctx.text.length || !ctx.ime.composing) {
    // 中文组词态:仅统计与选区缓存,不做话题检测
    if (ctx.ime.composing) {
      ctx.setCacheSelection()
      ctx.refresh()
      return
    }
    handleTopicTrigger(ctx)
  }

  normalizeFontNodes(ctx.os)

  ctx.refresh()
}

/**
 * 内容治理 + 统计(原 setState):
 * 长度计算(emoji 按 1、br 抹平、零宽字符扣除)、样式治理、placeholder、回调
 */
export function refreshContent(ctx: EditorContext): void {
  const root = ctx.root

  ctx.setCacheSelection()

  const text = root.innerText || ''
  ctx.text = text

  let length = pointLength(text)
  length = computedLength(root.innerHTML, text, length, ctx.os)
  // 零宽占位字符不计入长度
  length -= root.getElementsByClassName(NULL_CHAR_CLASS).length
  length = Math.max(0, length)

  // 长度为 0 且无媒体时清空残留节点(组词态不清,避免打断输入法)
  if (length === 0 && !ctx.ime.composing && !root.querySelector(`.${IMG_BOX_CLASS}`)) {
    root.innerHTML = ''
  }

  ctx.length = length

  sanitizeStyles(root)

  ctx.options.onChange?.(root.innerHTML, root.innerText, length)
  ctx.options.onLengthLimit?.(length > ctx.maxLength)
}

/**
 * 样式治理:清除粘贴带入的 style;话题保留高亮色
 */
function sanitizeStyles(root: HTMLElement): void {
  Array.from(root.getElementsByTagName('div')).forEach((div) => {
    div.removeAttribute('style')
  })
  Array.from(root.getElementsByTagName('span')).forEach((span) => {
    span.removeAttribute('style')
    if (span.classList.contains(TOPIC_CLASS)) {
      span.style.color = TOPIC_COLOR
    }
  })
}
