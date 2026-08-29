import { describe, expect, it } from 'vitest'
import {
  appendDivZwBr,
  createInsertFileNode,
  deleteDivZwBr,
  ensureTrailingZwBr,
  focusDivZwBrHandle,
  lastInsertImgBoxHandle,
  preInsertImgBoxHandle,
} from '../src/media'

describe('createInsertFileNode', () => {
  it('图片节点:类名/原子化/data 属性齐全', () => {
    const div = createInsertFileNode('loading', 'local1', 'image')
    expect(div.className).toBe('insertImg')
    expect(div.contentEditable).toBe('false')
    expect(div.getAttribute('data-localIdentifier')).toBe('local1')
    expect(div.getAttribute('data-status')).toBe('loading')
  })

  it('视频节点类名为 insertVideo', () => {
    expect(createInsertFileNode('success', 'x', 'video').className).toBe('insertVideo')
  })
})

describe('媒体占位判定', () => {
  const box = () => {
    const el = document.createElement('div')
    el.className = 'insertImgBox'
    return el
  }

  it('lastInsertImgBoxHandle:最后子节点是媒体容器', () => {
    const root = document.createElement('div')
    root.append(document.createTextNode('text'), box())
    expect(lastInsertImgBoxHandle(root)).toBe(true)
  })

  it('lastInsertImgBoxHandle:跳过末尾空文本节点', () => {
    const root = document.createElement('div')
    root.append(box(), document.createTextNode(''))
    expect(lastInsertImgBoxHandle(root)).toBe(true)
  })

  it('preInsertImgBoxHandle:上一节点是媒体容器', () => {
    const root = document.createElement('div')
    const target = document.createElement('span')
    root.append(box(), target)
    expect(preInsertImgBoxHandle(target)).toBe(true)
  })

  it('focusDivZwBrHandle:insertDivZwBr 包含 br + 媒体容器', () => {
    const zw = document.createElement('div')
    zw.className = 'insertDivZwBr'
    zw.append(box(), document.createElement('br'))
    expect(focusDivZwBrHandle(zw)).toBe(true)
  })
})

describe('尾部换行占位', () => {
  it('appendDivZwBr 追加占位,deleteDivZwBr 移除', () => {
    const root = document.createElement('div')
    appendDivZwBr(root)
    expect(root.getElementsByClassName('insertDivZwBr').length).toBe(1)
    deleteDivZwBr(root)
    expect(root.getElementsByClassName('insertDivZwBr').length).toBe(0)
  })

  it('ensureTrailingZwBr:末尾是媒体时追加占位', () => {
    const root = document.createElement('div')
    const img = createInsertFileNode('loading', 'x', 'image')
    const box = document.createElement('div')
    box.className = 'insertImgBox'
    box.append(img)
    root.append(box)
    ensureTrailingZwBr(root)
    expect(root.lastElementChild?.className).toBe('insertDivZwBr')
  })

  it('ensureTrailingZwBr:末尾是文本时不追加', () => {
    const root = document.createElement('div')
    root.append(document.createTextNode('hello'))
    ensureTrailingZwBr(root)
    expect(root.getElementsByClassName('insertDivZwBr').length).toBe(0)
  })
})
