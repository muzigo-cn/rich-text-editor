# @fe-muzi/rte-core

> 移动端富文本编辑器内核:话题(#)插入 + 图片/视频图文混排。框架无关,基于原生 `contentEditable` + Selection/Range API,不依赖任何框架。

从社区 App 的富文本场景中提取,抹平 iOS/Android 差异,适合作为自研编辑器的底座。

[在线演示](https://rich-text-editor.739371512.workers.dev/) · [GitHub](https://github.com/muzigo-cn/rich-text-editor)

## 特性

- **话题(#)插入**:`#` 触发话题面板,选中话题以高亮 span 插入光标处,携带话题 ID
- **图文混排**:图片/视频作为原子块内联插入,带上传状态跟踪(loading → success/failure)、删除保护、媒体后可继续输入
- **选区保护**:话题/媒体节点禁止部分选中,删除重定向,选区缓存恢复
- **中文输入法兼容**:composition 状态机区分组词态与上屏态,避免误触发与误统计
- **跨端抹平**:iOS/Android 的 BR 计数差异、光标时序、键盘滚动行为
- **字符长度计算**:`codePointAt` 步进算法,emoji 代理对按 1 计数
- **原生能力解耦**:JSBridge 抽象为 `PlatformAdapter` / `MediaUploader` 可注入接口,默认纯 Web 实现

## 安装

```bash
pnpm add @fe-muzi/rte-core
```

## 快速上手

```ts
import { createRichTextEditor } from '@fe-muzi/rte-core'
import '@fe-muzi/rte-core/styles/editor.css'

const editor = createRichTextEditor({
  root: document.getElementById('editor')!,
  maxLength: 180,
  placeholder: { focus: '说点什么…', blur: '说点什么…' },
  onChange: (html, plain, length) => console.log(html, plain, length),
  onTopicTrigger: () => {
    // 用户输入 # 时触发:弹出话题面板,选中后调用 editor.insertTopic(...)
  },
  mediaUploader: {
    upload: (file, onStatus) => {
      onStatus('loading')
      // 调宿主上传接口,完成后回写:
      // onStatus('success', url) 或 onStatus('failure')
    },
  },
})

// 命令式操作
editor.insertTopic({ id: '1', title: '话题名' }, 'tab')
editor.insertMedia([{ id: 'f1', type: 'image', status: 'loading' }], 'image')
editor.setMediaStatus('f1', 'success', 'https://cdn.example.com/a.jpg')
console.log(editor.getHTML(), editor.getPlain(), editor.getLength())
```

## API

### `createRichTextEditor(options: EditorOptions): RichTextEditor`

#### EditorOptions

| 属性 | 类型 | 说明 |
|---|---|---|
| `root` | `HTMLElement` | 挂载的 contentEditable 容器(必填) |
| `maxLength` | `number` | 最大长度,默认 180 |
| `placeholder` | `{ focus?: string; blur?: string }` | 聚焦/失焦占位文案 |
| `platform` | `Partial<PlatformAdapter>` | 注入原生能力(见下) |
| `mediaUploader` | `MediaUploader` | 上传实现(见下) |
| `onChange` | `(html, plain, length) => void` | 内容变化回调(html 已做样式治理,length 为真实长度) |
| `onTopicTrigger` | `() => void` | 输入 `#` 触发,宿主弹出话题面板 |
| `onMediaRequest` | `(type: 'image' \| 'video') => void` | 媒体占位点击触发 |
| `onMediaInsert` | `(items: MediaInsertInfo[]) => void` | 媒体节点插入通知 |
| `onMediaStatusChange` | `(localId, status, url?) => void` | 上传状态变化通知 |
| `onLengthLimit` | `(isOver: boolean) => void` | 超长提示 |

#### RichTextEditor 实例方法

`insertTopic` / `insertMedia` / `setMediaStatus` / `removeMedia` / `getHTML` / `getPlain` / `getLength` / `focus` / `blur` / `destroy`

### PlatformAdapter(原生能力注入)

```ts
export interface PlatformAdapter {
  getOS(): 'iOS' | 'Android' | 'Other'
  onFocus?(root: HTMLElement): void          // 默认: root.focus();App 可接 JSBridge 拉起键盘
  setScrollEnabled?(enabled: boolean): void  // App: 键盘弹出时锁滚动;Web: no-op
  previewMedia?(src: string): void           // 图片预览;App 可接原生预览
}
```

### MediaUploader(上传接口)

```ts
export interface MediaUploader {
  upload(file: File | MediaFile, onStatus: (status: UploadStatus, url?: string) => void): void
}
```

## 样式与主题

样式需手动引入一次,主题 CSS 变量可在宿主覆盖:

```css
:root {
  --rte-text-primary: #000;      /* 正文 */
  --rte-text-disabled: #949598;  /* 占位文案 */
  --rte-text-link: #2762EC;      /* 话题高亮 */
}
```

## License

MIT
