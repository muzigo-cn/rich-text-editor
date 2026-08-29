import { describe, expect, it } from 'vitest'
import { computedLength, countBr, pointAt, pointLength, pointSlice, replaceBr } from '../src/length'

describe('pointLength', () => {
  it('空串为 0', () => {
    expect(pointLength('')).toBe(0)
  })

  it('ASCII 与中文每字符计 1', () => {
    expect(pointLength('abc')).toBe(3)
    expect(pointLength('你好')).toBe(2)
  })

  it('emoji 代理对按 1 计', () => {
    expect(pointLength('😀')).toBe(1) // U+1F600,UTF-16 长度 2
    expect(pointLength('a😀b')).toBe(3)
    expect(pointLength('👍🏽')).toBe(2) // emoji + 肤色修饰符各计 1
  })
})

describe('pointAt', () => {
  it('按 codePoint 索引取字符', () => {
    expect(pointAt('abc', 0)).toBe('a')
    expect(pointAt('abc', 2)).toBe('c')
  })

  it('emoji 占一个索引位', () => {
    expect(pointAt('a😀b', 1)).toBe('😀')
    expect(pointAt('a😀b', 2)).toBe('b')
  })

  it('越界返回空串(不死循环)', () => {
    expect(pointAt('abc', 3)).toBe('')
    expect(pointAt('abc', 10)).toBe('')
    expect(pointAt('', 0)).toBe('')
  })
})

describe('pointSlice', () => {
  it('按 codePoint 计数截取', () => {
    expect(pointSlice('a😀b', 0, 2)).toBe('a😀')
    expect(pointSlice('a😀b', 2)).toBe('b')
    expect(pointSlice('a😀b')).toBe('a😀b')
  })
})

describe('countBr', () => {
  it('Android/Other 按 html 的 <br> 计数', () => {
    expect(countBr('a<br>b<br><br>', '', 'Android')).toBe(3)
    expect(countBr('abc', '', 'Other')).toBe(0)
  })

  it('iOS 按 innerText 的 \\n 计数', () => {
    expect(countBr('', 'a\nb\n', 'iOS')).toBe(2)
  })
})

describe('computedLength', () => {
  it('Android:扣除每个 br', () => {
    expect(computedLength('a<br>b', 'a\nb', 3, 'Android')).toBe(2)
  })

  it('iOS:多 br 也只扣 1', () => {
    expect(computedLength('a<br>b<br>', 'a\nb\n', 4, 'iOS')).toBe(3)
  })

  it('无 br 不扣减', () => {
    expect(computedLength('abc', 'abc', 3, 'iOS')).toBe(3)
  })
})

describe('replaceBr', () => {
  it('移除根层级的独立 br 节点', () => {
    const dom = document.createElement('div')
    dom.innerHTML = 'a<br>b'
    replaceBr(dom)
    expect(dom.innerHTML).toBe('ab')
  })

  it('不影响嵌套子树内的 br', () => {
    const dom = document.createElement('div')
    dom.innerHTML = '<div>x<br>y</div>'
    replaceBr(dom)
    expect(dom.innerHTML).toBe('<div>x<br>y</div>')
  })
})
