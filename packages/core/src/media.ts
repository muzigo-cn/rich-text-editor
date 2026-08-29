import type { EditorContext, MediaFile, MediaInsertInfo, MediaType, UploadStatus } from './types'
import { IMG_BOX_CLASS, IMG_CLASS, MEDIA_MARGIN, NULL_CHAR_CLASS, REFRESH_DELAY, VIDEO_CLASS, ZW_BR_CLASS } from './constants'
import { setSelection } from './selection'

/**
 * 创建媒体原子块容器(contentEditable=false,携带上传状态与本地标识)
 */
export function createInsertFileNode(status: UploadStatus, localIdentifierId: string, type: MediaType): HTMLDivElement {
  const div = document.createElement('div')
  div.className = type === 'image' ? IMG_CLASS : VIDEO_CLASS
  div.style.display = 'flex'
  div.contentEditable = 'false'
  div.setAttribute('data-localIdentifier', localIdentifierId)
  div.setAttribute('data-status', status)
  div.style.width = '100%'
  div.style.position = 'relative'
  return div
}

/**
 * 渲染媒体内容:有 url 时注入原生 img/video,否则留空占位(由适配层接管自定义 UI)
 */
function renderMediaContent(div: HTMLElement, type: MediaType, url?: string): void {
  if (!url) return
  if (type === 'video') {
    const video = document.createElement('video')
    video.src = url
    video.controls = true
    div.append(video)
  } else {
    const img = document.createElement('img')
    img.src = url
    div.append(img)
  }
}

/**
 * 按上传状态填充媒体内容
 */
function fillMediaContent(div: HTMLDivElement, file: MediaFile): void {
  if (file.status === 'success') {
    renderMediaContent(div, file.type, file.url)
  }
}

function buildMediaInfos(files: MediaFile[], type: MediaType): MediaInsertInfo[] {
  return files.map((file) => {
    const localId = (file.localIdentifier || '') + file.id
    const div = createInsertFileNode(file.status ?? 'loading', localId, file.type ?? type)
    div.style.marginBottom = MEDIA_MARGIN
    fillMediaContent(div, file)
    return { localId, type: file.type ?? type, status: file.status ?? 'loading', element: div }
  })
}

/**
 * 在 targetElement 之后插入节点
 */
export function insertAfter(newElement: Element, targetElement: Element): void {
  const parent = targetElement?.parentNode
  if (parent?.lastChild === targetElement) {
    parent.appendChild(newElement)
  } else {
    parent?.insertBefore(newElement, targetElement.nextSibling)
  }
}

/**
 * 焦点是否在 root 内(含 root 自身)
 */
function focusInRoot(root: HTMLElement, focusNode: Node | null | undefined): boolean {
  return !!focusNode && (focusNode === root || root.contains(focusNode))
}

/**
 * 保证插入媒体之后,内容区最后永远可以继续聚焦输入
 */
export function ensureTrailingZwBr(root: HTMLElement): void {
  const lastNode = root.lastElementChild as HTMLElement | null
  let flag = false
  const all = Array.from(root.querySelectorAll('*'))
  if (all.length) {
    const last = all[all.length - 1]
    if (last.parentElement?.className.includes('deleteImg')) flag = true
  }
  if (lastNodeIsFile(lastNode, IMG_CLASS) || lastNodeIsFile(lastNode, VIDEO_CLASS) || flag) {
    root.append(createZwBr())
  }
}

/**
 * 构建媒体后换行占位容器(保证媒体后可继续输入)
 */
function createZwBr(): HTMLDivElement {
  const divZwBr = document.createElement('div')
  divZwBr.className = ZW_BR_CLASS
  divZwBr.append(document.createElement('br'))
  return divZwBr
}

/**
 * 媒体插入主流程(图文混排):按光标场景分派插入位置
 */
export function insertFile(ctx: EditorContext, files: MediaFile[], type: MediaType): void {
  if (!files.length) return
  const root = ctx.root

  const selection = ctx.cacheSelection
  const focusNode = selection?.focusNode as Element | null | undefined
  const range = selection?.range

  const divBox = document.createElement('div')
  divBox.className = IMG_BOX_CLASS
  const infos = buildMediaInfos(files, type)
  const nodes = infos.map((info) => info.element)

  if (!focusNode || !focusInRoot(root, focusNode)) {
    // 无焦点或焦点在编辑器外:追加到尾部
    const lastChild = root.lastChild as Element | null
    divBox.append(...nodes)
    if (lastChild?.innerHTML !== '<br>') {
      divBox.style.marginTop = MEDIA_MARGIN
      root.append(divBox)
    } else {
      lastChild.replaceWith(divBox)
    }
  } else if (focusNode === root) {
    // 焦点在根节点:追加到根
    const lastChild = root.lastChild as Element | null
    if (lastChild?.previousSibling?.nodeType === 3) {
      divBox.style.marginTop = MEDIA_MARGIN
    }
    divBox.append(...nodes)
    if (lastChild?.innerHTML !== '<br>') {
      root.append(divBox)
    } else {
      lastChild.replaceWith(divBox)
    }
  } else if (focusNode.nodeType === 3 && focusNode.textContent && range) {
    // 文本节点中间插入:拆分文本,媒体落中间
    divBox.style.marginTop = MEDIA_MARGIN
    divBox.append(...nodes)
    const textNode = focusNode as unknown as Text
    const after = textNode.splitText(range.startOffset)
    textNode.parentNode?.insertBefore(divBox, after)
  } else if (focusNode.tagName === 'DIV' && focusNode.innerHTML === '<br>') {
    // 换行后插入:替换换行
    divBox.style.marginTop = MEDIA_MARGIN
    divBox.append(...nodes)
    focusNode.replaceWith(divBox)
  } else if (
    focusNode.tagName === 'DIV'
    && focusNode.childNodes.length > 1
    && focusNode.firstElementChild?.tagName === 'BR'
    && (focusNode.childNodes[1] as HTMLElement)?.className === IMG_BOX_CLASS
  ) {
    // 媒体后换行再插入媒体:替换换行节点
    divBox.style.marginTop = MEDIA_MARGIN
    divBox.append(...nodes)
    focusNode.firstElementChild.replaceWith(divBox)
  } else {
    // 兜底:插入当前节点之后
    let targetNode: Element = focusNode
    if (focusNode.parentElement?.className.includes(NULL_CHAR_CLASS)) {
      targetNode = focusNode.parentElement
      divBox.style.marginTop = MEDIA_MARGIN
    } else if (focusNode.nodeType === 3 && focusNode.previousSibling?.textContent) {
      // 输入话题后插入媒体的场景
      divBox.style.marginTop = MEDIA_MARGIN
    }
    divBox.append(...nodes)
    insertAfter(divBox, targetNode)
  }

  window.getSelection()?.removeAllRanges()
  root.blur()

  // 保证尾部可继续聚焦输入
  ensureTrailingZwBr(root)

  // 通知适配层渲染上传态 UI(portal 宿主为 infos 里的 element)
  ctx.options.onMediaInsert?.(infos)

  // 异步刷新(等浏览器完成布局)
  setTimeout(() => ctx.refresh(), REFRESH_DELAY)
}

/**
 * 上传完成后回刷媒体节点状态(替代原 ReactDOM.render 原地更新:
 * 仅更新 data 属性与默认 img/video 渲染,自定义 UI 由适配层监听 onMediaStatusChange)
 */
export function setMediaStatus(
  root: HTMLElement,
  localId: string,
  status: UploadStatus,
  url?: string,
): void {
  const nodes = root.querySelectorAll(`[data-localIdentifier="${localId}"]`)
  nodes.forEach((node) => {
    if (node.getAttribute('data-status') !== 'loading') return
    node.setAttribute('data-status', status)
    if (status === 'success' && url) {
      const el = node as HTMLElement
      el.innerHTML = ''
      renderMediaContent(el, el.className.includes(VIDEO_CLASS) ? 'video' : 'image', url)
    }
  })
}

/**
 * 移除媒体节点(连同其媒体容器);全部媒体删除后清理尾部占位
 */
export function removeMedia(root: HTMLElement, localId: string): void {
  const nodes = root.querySelectorAll(`[data-localIdentifier="${localId}"]`)
  nodes.forEach((node) => {
    const box = node.closest(`.${IMG_BOX_CLASS}`)
    ;(box ?? node).remove()
  })
  if (!root.querySelector(`.${IMG_BOX_CLASS}`)) {
    Array.from(root.getElementsByClassName(ZW_BR_CLASS)).forEach((el) => el.remove())
  }
}

export const lastNodeIsFile = (lastNode: HTMLElement | null, className: string): boolean =>
  lastNode?.className.includes(className) || !!lastNode?.lastElementChild?.className.includes(className)

/**
 * 判断最后一个元素是否是媒体容器(跳过末尾空文本节点,向前查找)
 */
export const lastInsertImgBoxHandle = (node: Element): boolean => {
  let lastChild = node?.lastChild as Element | null
  while (lastChild?.nodeType === 3 && lastChild.textContent === '') {
    lastChild = (lastChild.previousSibling as Element) ?? null
  }
  return lastChild?.className === IMG_BOX_CLASS
}

/**
 * 判断上一个元素节点是否是媒体容器(跳过空文本节点)
 */
export const preInsertImgBoxHandle = (node: Element): boolean => {
  const previousSibling = node?.previousSibling as Element | null
  if (previousSibling?.nodeType === 3 && previousSibling.textContent === '') {
    return preInsertImgBoxHandle(previousSibling as unknown as Element)
  } else {
    return previousSibling?.className === IMG_BOX_CLASS
  }
}

/**
 * 特殊场景:媒体后换行占位(insertDivZwBr 包含 insertImgBox + br)
 */
export const focusDivZwBrHandle = (node: Element): boolean => {
  const nodeLastChild = node?.lastChild as Element | null
  const nodeLastChildPre = nodeLastChild?.previousSibling as Element | null
  return node?.className === ZW_BR_CLASS && nodeLastChild?.tagName === 'BR' && nodeLastChildPre?.className === IMG_BOX_CLASS
}

/**
 * 阻止 Backspace 删除媒体原子块(按缓存选区判断光标前是否为媒体),
 * 并执行整体删除:删除光标前紧邻的媒体容器后复位光标
 */
export function preventDefaultDelete(ctx: EditorContext, e: KeyboardEvent): void {
  const cacheSelection = ctx.cacheSelection
  const cacheFocus = cacheSelection?.focusNode as Element | null
  if (!cacheFocus) return

  const cacheFocusPreviousElementSibling = cacheFocus.previousElementSibling as Element | null
  const cacheFocusPreviousSibling = cacheFocus.previousSibling as Element | null
  let cacheFocusPreviousLast = cacheFocusPreviousElementSibling?.lastChild as Element | null
  if (cacheFocusPreviousLast && cacheFocusPreviousLast.nodeType === 3 && cacheFocusPreviousLast.textContent === '') {
    cacheFocusPreviousLast = (cacheFocusPreviousElementSibling?.lastChild?.previousSibling as Element) ?? null
  }

  const isDelete = e.key === 'Backspace'
  const isImgBoxPre
    = cacheFocus.className === ZW_BR_CLASS
    || cacheFocus.nodeType !== 3
    || (cacheFocus.nodeType === 3 && (cacheFocus.textContent === '' || window.getSelection()?.focusOffset === 0))

  const isImgBoxPre1 = cacheFocusPreviousSibling?.className !== IMG_BOX_CLASS && cacheFocusPreviousLast?.className === IMG_BOX_CLASS
  const isImgBoxPre2 = !isImgBoxPre1 && preInsertImgBoxHandle(cacheFocus)
  const isImgBoxPre3 = !isImgBoxPre1 && !isImgBoxPre2 && focusDivZwBrHandle(cacheFocus)

  if (isDelete && isImgBoxPre && (isImgBoxPre1 || isImgBoxPre2 || isImgBoxPre3)) {
    e.preventDefault()
    deleteMediaBoxBeforeCaret(ctx, cacheFocus)
  }
}

/**
 * Backspace 删除媒体的实际执行:移除光标前紧邻的媒体容器,
 * 全部媒体删除后清理尾部占位,并把光标复位到媒体原位置
 */
function deleteMediaBoxBeforeCaret(ctx: EditorContext, cacheFocus: Element): void {
  const root = ctx.root

  // 场景 1:光标所在占位容器内部包含媒体(insertDivZwBr 内部 [imgBox, br])
  if (focusDivZwBrHandle(cacheFocus)) {
    const imgBox = (cacheFocus.lastChild as Element | null)?.previousElementSibling as Element | null
    if (imgBox) imgBox.remove()
    if (!root.querySelector(`.${IMG_BOX_CLASS}`)) {
      // 清理其它尾部占位;光标所在容器保留作为输入落点
      Array.from(root.getElementsByClassName(ZW_BR_CLASS)).forEach((el) => {
        if (el !== cacheFocus) el.remove()
      })
    }
    setSelection(cacheFocus, 0)
    ctx.refresh()
    return
  }

  // 场景 2:前一个兄弟节点(跳过空文本)是媒体容器
  let prev = cacheFocus.previousSibling as Element | null
  while (prev?.nodeType === 3 && prev.textContent === '') {
    prev = prev.previousSibling as Element | null
  }
  let imgBox: Element | null = prev?.className === IMG_BOX_CLASS ? prev : null

  // 场景 3:前一个元素内部末尾是媒体容器
  if (!imgBox) {
    const last = cacheFocus.previousElementSibling?.lastElementChild as Element | null
    if (last?.className === IMG_BOX_CLASS) imgBox = last
  }
  if (!imgBox) return

  const prevNode = imgBox.previousSibling
  imgBox.remove()
  if (!root.querySelector(`.${IMG_BOX_CLASS}`)) {
    Array.from(root.getElementsByClassName(ZW_BR_CLASS)).forEach((el) => el.remove())
  }

  // 光标复位:回到媒体原位置(优先前文本末尾,否则编辑器开头)
  if (prevNode?.nodeType === 3 && (prevNode.textContent?.length ?? 0) > 0) {
    setSelection(prevNode as Text, (prevNode as Text).length)
  } else {
    setSelection(root, 0)
  }
  ctx.refresh()
}

/**
 * 追加媒体后换行占位(保证媒体后可继续输入)
 */
export function appendDivZwBr(root: HTMLElement, isFocus?: boolean): void {
  const divZwBr = createZwBr()
  root.append(divZwBr)

  if (isFocus) {
    setTimeout(() => setSelection(divZwBr, 0), REFRESH_DELAY)
  }
}

/**
 * 所有媒体删除后,移除最后一个换行占位
 */
export function deleteDivZwBr(root: HTMLElement): void {
  const list = root.getElementsByClassName(ZW_BR_CLASS)
  if (list.length > 0) {
    const current = list[list.length - 1]
    if (current.childNodes.length === 1 && current.firstElementChild?.tagName === 'BR') {
      current.remove()
    }
  }
}
