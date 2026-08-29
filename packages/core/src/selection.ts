import type { CustomSelection } from './types'
import { TOPIC_CLASS } from './constants'

/**
 * 光标定位
 */
export function setSelection(node: Node, start: number, end?: number): void {
  const range = new Range()
  const selection = window.getSelection()
  range.setStart(node, start)
  range.setEnd(node, end ?? start)
  selection?.removeAllRanges()
  selection?.addRange(range)
}

/**
 * 缓存当前选区(失焦/话题面板打开期间保留光标,供插入时恢复)
 */
export function getCacheSelection(): CustomSelection | null {
  const selection = window.getSelection()
  if (selection && selection.rangeCount !== 0) {
    return {
      focusNode: selection.focusNode,
      range: selection.getRangeAt(0),
    }
  }
  return null
}

/**
 * 判断即将删除的是不是话题(话题 span 内的文本节点)
 */
export function isInTopic(): boolean {
  const node = window.getSelection()?.focusNode?.parentElement
  return node?.tagName === 'SPAN' && node.className.includes(TOPIC_CLASS)
}

/**
 * 防止删除话题之后,输入文本颜色跟随:把已收敛的选区重新收敛一遍
 */
export function resetRange(): void {
  const selection = window.getSelection()
  if (selection?.rangeCount === 0) return
  const range = selection?.getRangeAt(0)
  if (range && range.startContainer === range.endContainer && range.startOffset === range.endOffset) {
    range.setStart(range.startContainer, range.startOffset)
    range.collapse(true)
    selection?.removeAllRanges()
    selection?.addRange(range)
  }
}

/**
 * 禁止选区部分选中话题 span:边界落在话题中间(非开头/末尾)时,扩展选区包裹整个话题
 * 注意:getRangeAt 返回 live range,必须先判定再修改,否则边界在话题边界点时选区会被意外改写
 */
export function deposeRangeStartAndEnd(): void {
  const selection = window.getSelection()
  if (selection?.rangeCount === 0 || selection?.isCollapsed) return
  const range = selection?.getRangeAt(0)
  if (!range) return

  const startNode = range.startContainer.parentElement
  const endNode = range.endContainer.parentElement
  const startOffset = range.startOffset
  const endOffset = range.endOffset

  const startContains = startNode && startNode.className.includes(TOPIC_CLASS) && startNode.contains(range.startContainer)
  const endContains = endNode && endNode.className.includes(TOPIC_CLASS) && endNode.contains(range.endContainer)

  if (!startContains && !endContains) return

  // 仅边界位于话题中间时扩展;边界恰在话题开头/末尾视为边界点,保持不动
  const expandStart = startContains && startOffset !== 0
  const expandEnd = endContains && endOffset !== endNode.textContent?.length
  if (!expandStart && !expandEnd) return

  if (expandStart) range.setStartBefore(startNode!)
  if (expandEnd) range.setEndAfter(endNode!)
  if (selection && selection.rangeCount) {
    selection.removeAllRanges()
    selection.addRange(range)
  }
}
