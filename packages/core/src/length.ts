import type { OS } from './types'

/**
 * 长度计数:emoji 等代理对字符按 1 计(codePointAt 步进)
 */
export function pointLength(text: string): number {
  let length = 0
  for (let index = 0; index < text.length;) {
    length++
    const point = text.codePointAt(index)
    index += (point === undefined ? 0 : point) > 0xffff ? 2 : 1
  }
  return length
}

/**
 * 取按 codePoint 计数的第 index 个字符;越界返回 ''
 * (修复原实现在 index 超出字符数时的死循环)
 */
export function pointAt(value: string, index: number): string {
  let curIndex = 0
  let i = 0
  while (i < value.length) {
    if (curIndex === index) {
      const point = value.codePointAt(i)
      return String.fromCodePoint(point === undefined ? 0 : point)
    }
    curIndex++
    const point = value.codePointAt(i)
    i += (point === undefined ? 0 : point) > 0xffff ? 2 : 1
  }
  return ''
}

/**
 * 按 codePoint 计数截取(包含 emoji 时使用)
 */
export function pointSlice(value: string, start = 0, end: number = pointLength(value)): string {
  let result = ''
  for (let i = start; i < end; i++) {
    result += pointAt(value, i)
  }
  return result
}

/**
 * br 计数:iOS 的 innerText 把 <br> 序列化为 \n;Android/Other 保留 <br> 标签
 */
export function countBr(html: string, text: string, os: OS = 'Other'): number {
  if (os === 'iOS') {
    const br = String.fromCodePoint(10)
    return (text.match(new RegExp(br, 'g')) || []).length
  }
  return (html.match(/<br>/g) || []).length
}

/**
 * 真实长度:扣除换行占用(iOS 只扣 1,Android 按实际 br 数扣除)
 */
export function computedLength(html: string, text: string, length: number, os: OS = 'Other'): number {
  const brCount = countBr(html, text, os)
  if (brCount > 0) {
    return os === 'iOS' ? length - 1 : length - brCount
  }
  return length
}

/**
 * 清理 dom 下独立的 br 节点(空行占位)
 */
export function replaceBr(dom: HTMLElement): void {
  const br = document.createElement('br')
  Array.from(dom.childNodes).forEach((node) => {
    if (node.isEqualNode(br)) {
      node.replaceWith()
    }
  })
}
