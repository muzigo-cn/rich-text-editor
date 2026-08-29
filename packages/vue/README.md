# @fe-muzi/rte-vue

> `@fe-muzi/rte-core` 的 Vue 3 适配层:组件封装 + 命令式 API + 上传状态 Teleport 渲染。与 `@fe-muzi/rte-react` 的 API 完全对齐。

[在线演示](https://rich-text-editor.739371512.workers.dev/vue/) · [GitHub](https://github.com/muzigo-cn/rich-text-editor)

## 安装

```bash
pnpm add @fe-muzi/rte-core @fe-muzi/rte-vue
```

要求 Vue >= 3.3。

## 快速上手

```vue
<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { RichTextEditor } from '@fe-muzi/rte-vue'
import type { RichTextEditorHandle, TopicItem } from '@fe-muzi/rte-vue'
import '@fe-muzi/rte-core/styles/editor.css'

const editorRef = useTemplateRef<RichTextEditorHandle>('editorRef')
const html = ref('')
const length = ref(0)

const topics: TopicItem[] = [{ id: '1', title: '今日份下班搭子' }]
</script>

<template>
  <RichTextEditor
    ref="editorRef"
    :max-length="180"
    :placeholder="{ focus: '说点什么…', blur: '说点什么…' }"
    :media-uploader="{
      upload: (file, onStatus) => {
        onStatus('loading')
        // 调宿主上传接口,完成后回写:
        // onStatus('success', url) 或 onStatus('failure')
      },
    }"
    @change="(h, plain, len) => { html = h; length = len }"
    @topic-trigger="() => {/* 输入 # 触发,弹出话题面板 */}"
    @media-request="(type) => {/* 点击媒体占位触发 */}"
    @length-limit="(isOver) => {/* 超长提示 */}"
  />
  <button @click="editorRef?.insertTopic(topics[0], 'tab')">插入话题</button>
  <div v-html="html" />
</template>
```

## Props

继承 core 的全部 `EditorOptions`(除 `root`,组件内部处理),回调以事件形式透出:`@change` / `@topic-trigger` / `@media-request` / `@media-insert` / `@media-status-change` / `@length-limit`。另加:

| 属性 | 类型 | 说明 |
|---|---|---|
| `className` / `style` | 同原生 | 挂到编辑器根节点 |
| `renderUploadStatus` | `(info) => VNode \| string \| null` | 自定义上传态渲染(loading/failure 会 Teleport 到媒体节点内) |

## 命令式 API(`expose`)

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

```vue
<RichTextEditor
  :render-upload-status="({ localId, type, status }) =>
    status === 'loading'
      ? h(MyLoading, { type })
      : h(MyFailure, { onDelete: () => editorRef?.removeMedia(localId) })"
/>
```

## License

MIT
