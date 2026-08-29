# @fe-muzi/rte-react

> `@fe-muzi/rte-core` 的 React 适配层:组件封装 + 命令式 API + 上传状态 Portal 渲染。

[在线演示](https://rich-text-editor.739371512.workers.dev/) · [GitHub](https://github.com/muzigo-cn/rich-text-editor)

## 安装

```bash
pnpm add @fe-muzi/rte-core @fe-muzi/rte-react
```

要求 React >= 18。

## 快速上手

```tsx
import { useRef, useState } from 'react'
import { RichTextEditor } from '@fe-muzi/rte-react'
import type { RichTextEditorHandle, TopicItem } from '@fe-muzi/rte-react'
import '@fe-muzi/rte-core/styles/editor.css'

const topics: TopicItem[] = [
  { id: '1', title: '今日份下班搭子' },
]

function App() {
  const editorRef = useRef<RichTextEditorHandle>(null)
  const [html, setHtml] = useState('')
  const [length, setLength] = useState(0)

  return (
    <>
      <RichTextEditor
        ref={editorRef}
        maxLength={180}
        placeholder={{ focus: '说点什么…', blur: '说点什么…' }}
        onChange={(html, plain, length) => { setHtml(html); setLength(length) }}
        onTopicTrigger={() => {/* 输入 # 触发,弹出话题面板 */}}
        onMediaRequest={(type) => {/* 点击媒体占位触发 */}}
        onLengthLimit={(isOver) => {/* 超长提示 */}}
        mediaUploader={{
          upload: (file, onStatus) => {
            onStatus('loading')
            // 调宿主上传接口,完成后回写:
            // onStatus('success', url) 或 onStatus('failure')
          },
        }}
      />
      <button onClick={() => editorRef.current?.insertTopic(topics[0], 'tab')}>插入话题</button>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => editorRef.current?.insertFiles(Array.from(e.target.files ?? []), 'image')}
      />
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </>
  )
}
```

## Props

继承 core 的全部 `EditorOptions`(除 `root`,组件内部处理),另加:

| 属性 | 类型 | 说明 |
|---|---|---|
| `className` / `style` | 同原生 | 挂到编辑器根节点 |
| `renderUploadStatus` | `(info) => ReactNode` | 自定义上传态渲染(loading/failure 会 Portal 到媒体节点内) |

## 命令式 API(`ref.current`)

| 方法 | 说明 |
|---|---|
| `insertTopic(item, from?)` | 插入话题 |
| `insertMedia(files, type)` | 插入媒体节点 |
| `insertFiles(files, type)` | Web 便利方法:插入本地 File 并经 `mediaUploader` 上传回刷状态 |
| `setMediaStatus(localId, status, url?)` | 回写上传状态(success 时注入原生 img/video) |
| `removeMedia(localId)` | 删除媒体节点 |
| `getHTML()` / `getPlain()` / `getLength()` | 获取内容 |
| `focus()` / `blur()` | 焦点控制 |

## 自定义上传态

默认内置 `UploadLoading` / `UploadFailure` 占位组件,可通过 `renderUploadStatus` 完全自定义:

```tsx
<RichTextEditor
  renderUploadStatus={({ localId, type, status }) =>
    status === 'loading'
      ? <MyLoading type={type} />
      : <MyFailure onRetry={retry} onDelete={() => editorRef.current?.removeMedia(localId)} />}
/>
```

## License

MIT
