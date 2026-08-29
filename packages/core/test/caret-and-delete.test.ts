import { describe, expect, it, vi, afterEach } from 'vitest'
import { IMG_BOX_CLASS, NULL_CHAR_CLASS, SELECTION_STABLE_DELAY, TOPIC_CLASS, ZW_BR_CLASS } from '../src/constants'
import { preventDefaultDelete } from '../src/media'
import { handleSelectionChange, selectTopicSpan, caretInTopicSpan, setPointerDown, clearPointerState } from '../src/topic'
import { setSelection } from '../src/selection'
import type { EditorContext } from '../src/types'

/**
 * 构造编辑器上下文(真实缓存选区实现,refresh 用 spy)
 */
function buildCtx(root: HTMLElement, os: EditorContext['os'] = 'Web'): EditorContext {
  const ctx = {
    root,
    options: {},
    os,
    maxLength: 180,
    text: '',
    length: 0,
    isFocused: true,
    cacheSelection: null,
    setCacheSelection: () => {
      const selection = window.getSelection()
      if (selection && selection.rangeCount !== 0) {
        ctx.cacheSelection = { focusNode: selection.focusNode, range: selection.getRangeAt(0) }
      }
    },
    refresh: vi.fn(),
  } as EditorContext
  return ctx
}

function buildBackspace(): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true })
}

/**
 * 构造含话题的编辑器内容:[textNode][topicSpan][zeroWidthPlaceholderSpan]
 */
const buildTopicRoot = () => {
  const root = document.createElement('div')
  const text = document.createTextNode('ab')
  const topic = document.createElement('span')
  topic.className = `${TOPIC_CLASS} 1`
  topic.textContent = '#话题'
  const zw = document.createElement('span')
  zw.className = NULL_CHAR_CLASS
  zw.innerHTML = '&#8203;'
  root.append(text, topic, zw)
  document.body.append(root)
  return { root, text, topic, zw }
}

describe('Backspace 删除媒体原子块', () => {
  it('光标在媒体后占位开头:阻止默认并整体删除媒体容器', () => {
    const root = document.createElement('div')
    const imgBox = document.createElement('div')
    imgBox.className = IMG_BOX_CLASS
    imgBox.append(document.createElement('img'))
    const zwBr = document.createElement('div')
    zwBr.className = ZW_BR_CLASS
    zwBr.append(document.createElement('br'))
    root.append(imgBox, zwBr)
    document.body.append(root)

    const ctx = buildCtx(root)
    setSelection(zwBr, 0)
    ctx.setCacheSelection()

    const e = buildBackspace()
    preventDefaultDelete(ctx, e)

    expect(e.defaultPrevented).toBe(true)
    expect(root.querySelector(`.${IMG_BOX_CLASS}`)).toBeNull()
    // 全部媒体删除后,尾部占位一并清理
    expect(root.getElementsByClassName(ZW_BR_CLASS).length).toBe(0)
    expect(ctx.refresh).toHaveBeenCalled()
    root.remove()
  })

  it('媒体前有文本:删除媒体后光标复位到前文本末尾', () => {
    const root = document.createElement('div')
    const text = document.createTextNode('ab')
    const imgBox = document.createElement('div')
    imgBox.className = IMG_BOX_CLASS
    imgBox.append(document.createElement('img'))
    const zwBr = document.createElement('div')
    zwBr.className = ZW_BR_CLASS
    zwBr.append(document.createElement('br'))
    root.append(text, imgBox, zwBr)
    document.body.append(root)

    const ctx = buildCtx(root)
    setSelection(zwBr, 0)
    ctx.setCacheSelection()

    preventDefaultDelete(ctx, buildBackspace())

    expect(root.querySelector(`.${IMG_BOX_CLASS}`)).toBeNull()
    const selection = window.getSelection()!
    expect(selection.focusNode).toBe(text)
    expect(selection.focusOffset).toBe(2)
    root.remove()
  })

  it('光标前不是媒体时不拦截默认删除', () => {
    const root = document.createElement('div')
    const text = document.createTextNode('abc')
    root.append(text)
    document.body.append(root)

    const ctx = buildCtx(root)
    setSelection(text, 2)
    ctx.setCacheSelection()

    const e = buildBackspace()
    preventDefaultDelete(ctx, e)

    expect(e.defaultPrevented).toBe(false)
    expect(root.querySelector(`.${IMG_BOX_CLASS}`)).toBeNull()
    root.remove()
  })
})

describe('光标在话题上的方向移动', () => {
  it('从话题末尾向左移入话题:光标停在话题开头', () => {
    const { root, topic, zw } = buildTopicRoot()
    const ctx = buildCtx(root)

    // 缓存:光标在话题后的零宽占位
    setSelection(zw, 1)
    ctx.setCacheSelection()
    // 模拟浏览器左移把光标放进话题文本节点
    setSelection(topic.firstChild!, 1)
    handleSelectionChange(ctx)

    const selection = window.getSelection()!
    expect(selection.focusNode).toBe(topic)
    expect(selection.focusOffset).toBe(0)
    root.remove()
  })

  it('从话题前文本向右移入话题:光标停在话题末尾的零宽占位', () => {
    const { root, text, topic, zw } = buildTopicRoot()
    const ctx = buildCtx(root)

    // 缓存:光标在话题前文本末尾
    setSelection(text, 2)
    ctx.setCacheSelection()
    // 模拟浏览器右移把光标放进话题文本节点
    setSelection(topic.firstChild!, 0)
    handleSelectionChange(ctx)

    const selection = window.getSelection()!
    expect(selection.focusNode).toBe(zw)
    expect(selection.focusOffset).toBe(1)
    root.remove()
  })

  it('无缓存选区(首次进入):保持默认行为,移到话题末尾零宽占位', () => {
    const { root, topic, zw } = buildTopicRoot()
    const ctx = buildCtx(root)
    ctx.cacheSelection = null

    setSelection(topic.firstChild!, 0)
    handleSelectionChange(ctx)

    const selection = window.getSelection()!
    expect(selection.focusNode).toBe(zw)
    expect(selection.focusOffset).toBe(1)
    root.remove()
  })

  it('话题后无零宽占位时补建:向右移入后自动补建占位', () => {
    const { root, text, topic, zw } = buildTopicRoot()
    zw.remove()
    const ctx = buildCtx(root)

    setSelection(text, 2)
    ctx.setCacheSelection()
    setSelection(topic.firstChild!, 0)
    handleSelectionChange(ctx)

    const selection = window.getSelection()!
    const rebuilt = topic.nextElementSibling
    expect(rebuilt?.className).toBe(NULL_CHAR_CLASS)
    expect(selection.focusNode).toBe(rebuilt)
    expect(ctx.refresh).toHaveBeenCalled()
    root.remove()
  })
})

describe('Backspace 在话题上整体选中', () => {
  it('caretInTopicSpan:话题 span 上与其内部文本节点均命中', () => {
    const { root, topic } = buildTopicRoot()

    setSelection(topic, 0)
    expect(caretInTopicSpan()).toBe(true)
    setSelection(topic.firstChild!, 0)
    expect(caretInTopicSpan()).toBe(true)

    // 话题前的文本节点不命中
    const text = root.firstChild!
    setSelection(text, 1)
    expect(caretInTopicSpan()).toBe(false)
    root.remove()
  })

  it('selectTopicSpan:选区重定向为话题 + 后置零宽占位', () => {
    const { root, topic, zw } = buildTopicRoot()

    // 光标在话题开头(向左移入后的状态)
    setSelection(topic, 0)
    selectTopicSpan()

    const range = window.getSelection()!.getRangeAt(0)
    expect(range.startContainer).toBe(topic)
    expect(range.startOffset).toBe(0)
    expect(range.endContainer).toBe(zw)
    expect(range.endOffset).toBe(1)
    expect(range.toString()).toBe('#话题\u200B')
    root.remove()
  })
})

describe('长按选中:稳定后规整话题边界', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('end 边界在话题中间:手势中不改写,稳定后扩展为包裹整个话题', () => {
    vi.useFakeTimers()
    const { root, text, topic } = buildTopicRoot()
    const ctx = buildCtx(root)

    // 长按选区:从话题前文本中间拖到话题文本中间
    const range = new Range()
    range.setStart(text, 1)
    range.setEnd(topic.firstChild!, 1)
    const sel = window.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)

    // 手势进行中:连续多次 selectionchange,选区保持浏览器默认
    handleSelectionChange(ctx)
    handleSelectionChange(ctx)
    const during = sel.getRangeAt(0)
    expect(during.startContainer).toBe(text)
    expect(during.endContainer).toBe(topic.firstChild!)
    expect(during.endOffset).toBe(1)

    // 选区停止变化:稳定后扩展 end 边界包裹整个话题
    vi.advanceTimersByTime(SELECTION_STABLE_DELAY + 50)
    const after = sel.getRangeAt(0)
    expect(after.toString()).toContain('#话题')
    // start 边界不在话题内,保持不动
    expect(after.startContainer).toBe(text)
    // end 已越过话题 span
    expect(after.endContainer).not.toBe(topic.firstChild!)
    root.remove()
  })

  it('start 边界在话题中间:稳定后扩展 start 包裹整个话题', () => {
    vi.useFakeTimers()
    const { root, topic, zw } = buildTopicRoot()
    const ctx = buildCtx(root)

    // 长按选区:从话题文本中间选到话题后
    const range = new Range()
    range.setStart(topic.firstChild!, 1)
    range.setEnd(zw.firstChild!, 0)
    const sel = window.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)
    handleSelectionChange(ctx)

    vi.advanceTimersByTime(SELECTION_STABLE_DELAY + 50)
    const after = sel.getRangeAt(0)
    // start 已扩展到话题之前
    expect(after.startContainer).not.toBe(topic.firstChild!)
    expect(after.toString()).toContain('#话题')
    root.remove()
  })

  it('边界恰在话题开头/末尾:稳定后不改写选区', () => {
    vi.useFakeTimers()
    const { root, text, topic } = buildTopicRoot()
    const ctx = buildCtx(root)

    // 选区:话题前文本中间 → 话题末尾(边界点,非中间)
    const range = new Range()
    range.setStart(text, 1)
    range.setEnd(topic.firstChild!, topic.firstChild!.textContent!.length)
    const sel = window.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)
    handleSelectionChange(ctx)

    vi.advanceTimersByTime(SELECTION_STABLE_DELAY + 50)
    const after = sel.getRangeAt(0)
    expect(after.endContainer).toBe(topic.firstChild!)
    expect(after.endOffset).toBe(topic.firstChild!.textContent!.length)
    root.remove()
  })

  it('collapsed 选区(单光标)不触发稳定规整', () => {
    vi.useFakeTimers()
    const { root, text, topic } = buildTopicRoot()
    const ctx = buildCtx(root)

    setSelection(topic.firstChild!, 1)
    handleSelectionChange(ctx)

    vi.advanceTimersByTime(SELECTION_STABLE_DELAY + 50)
    // collapsed 走方向定位逻辑,不经稳定规整改写为扩展选区
    const sel = window.getSelection()!
    expect(sel.isCollapsed).toBe(true)
    root.remove()
  })
})

describe('指针手势期间的光标保护', () => {
  afterEach(() => {
    clearPointerState()
    vi.useRealTimers()
  })

  it('指针按下期间:collapsed 光标进入话题不被方向定位改写(手势锚点保持)', () => {
    vi.useFakeTimers()
    const { root, topic } = buildTopicRoot()
    const ctx = buildCtx(root)

    // 模拟长按/拖选起始:pointerdown 后浏览器把光标放进话题中间
    setPointerDown(ctx, true)
    setSelection(topic.firstChild!, 1)
    handleSelectionChange(ctx)

    const sel = window.getSelection()!
    // 锚点未被挪动,仍停留在按下位置
    expect(sel.focusNode).toBe(topic.firstChild)
    expect(sel.focusOffset).toBe(1)
    root.remove()
  })

  it('指针抬起后:延迟规整执行,话题内光标被重定位到零宽占位', () => {
    vi.useFakeTimers()
    const { root, topic, zw } = buildTopicRoot()
    const ctx = buildCtx(root)

    setPointerDown(ctx, true)
    setSelection(topic.firstChild!, 1)
    handleSelectionChange(ctx)

    // 抬起 → 延迟规整
    setPointerDown(ctx, false)
    vi.advanceTimersByTime(100)

    const sel = window.getSelection()!
    expect(sel.focusNode === zw || sel.focusNode.parentElement === zw).toBe(true)
    root.remove()
  })

  it('指针按下期间:非收敛选区仍走稳定检测路径', () => {
    vi.useFakeTimers()
    const { root, topic, zw } = buildTopicRoot()
    const ctx = buildCtx(root)

    setPointerDown(ctx, true)
    // 长按选词:从话题中间选到话题后(end 需在 start 文档序之后)
    const range = new Range()
    range.setStart(topic.firstChild!, 1)
    range.setEnd(zw.firstChild!, 0)
    const sel = window.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)
    handleSelectionChange(ctx)

    // 手势中不改写
    expect(sel.getRangeAt(0).startContainer).toBe(topic.firstChild)
    // 稳定后规整包裹话题
    vi.advanceTimersByTime(SELECTION_STABLE_DELAY + 50)
    expect(sel.getRangeAt(0).toString()).toContain('#话题')
    root.remove()
  })

  it('键盘导航(无指针事件)不受影响:方向定位正常执行', () => {
    vi.useFakeTimers()
    const { root, topic, zw } = buildTopicRoot()
    const ctx = buildCtx(root)

    // 模拟从右侧 ArrowLeft 进入话题(先缓存话题后位置)
    setSelection(topic.nextElementSibling!, 1)
    ctx.setCacheSelection()
    setSelection(topic.firstChild!, 1)
    handleSelectionChange(ctx)

    const sel = window.getSelection()!
    expect(sel.focusNode).toBe(topic)
    expect(sel.focusOffset).toBe(0)
    root.remove()
  })
})
