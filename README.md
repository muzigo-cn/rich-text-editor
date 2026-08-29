# rich-text-editor

> 移动端富文本编辑器:话题(#)插入 + 图片/视频图文混排。基于 `contentEditable` + Selection/Range API 自研,框架无关 core + React / Vue 适配层。

从社区 App(`superapp-omp-web`)的 `RichTextarea` / `ArticleRichTextarea` 中提取核心能力,解耦 App 原生耦合,重构为可独立运行、可复用、可发布的 Monorepo。

## 核心能力

- **话题(#)插入**:`#` 触发话题面板,选中话题以高亮 span 插入到光标处,携带话题 ID
- **图片/视频图文混排**:媒体作为 `contentEditable='false'` 原子块内联插入,带上传状态跟踪(loading→success)、删除保护、媒体后可继续输入
- **选区/光标管理**:话题/媒体节点原子化选区保护(禁止部分选中)、删除重定向、样式继承阻断、选区缓存恢复
- **中文输入法兼容**:composition 状态机区分组词态与上屏态,避免误触发话题与误统计
- **跨端兼容(iOS/Android)**:BR 计数差异、光标时序、键盘滚动行为抹平
- **字符长度计算**:`codePointAt` 步进算法正确处理 emoji 代理对
- **原生能力解耦**:JSBridge/原生上传抽象为 `PlatformAdapter` / `MediaUploader` 可注入接口,默认纯 Web 实现

## 技术栈

- **核心**:`packages/core` —— 框架无关 vanilla TypeScript,基于 Selection/Range API
- **适配层**:`packages/react` / `packages/vue` —— React 组件与 Vue 3 组件绑定 core
- **演示站**:`apps/demo` —— Vite + React;`apps/demo-vue` —— Vite + Vue 3
- **构建**:tsup(core/react/vue)、Vite(demo)
- **包管理**:pnpm workspace

## 目录结构

```
rich-text-editor/
├── packages/
│   ├── core/              # @rte/core —— 框架无关内核
│   │   ├── src/
│   │   │   ├── editor.ts      # createRichTextEditor:事件绑定与模块协调
│   │   │   ├── event.ts       # handleDivChange 分发(删除/输入/IME/# 检测/样式治理)
│   │   │   ├── selection.ts   # setSelection/isInTopic/resetRange/选区扩展
│   │   │   ├── topic.ts       # insertTopic/deleteTopicSetRange/selectionchange 处理
│   │   │   ├── media.ts       # insertFile/占位与删除保护/媒体状态回刷/removeMedia
│   │   │   ├── length.ts      # pointLength/pointAt/pointSlice/computedLength/countBr
│   │   │   ├── ime.ts         # composition 状态机
│   │   │   ├── platform.ts    # PlatformAdapter + WebPlatform 默认实现
│   │   │   ├── types.ts       # TopicItem / EditorOptions / PlatformAdapter 等类型
│   │   │   ├── constants.ts   # DOM 类名/颜色/时序公共配置
│   │   │   └── index.ts       # 公共 API
│   │   ├── test/          # vitest 单元测试(纯函数 + DOM 判定)
│   │   ├── styles/editor.css
│   │   └── tsup.config.ts
│   ├── react/             # @rte/react —— React 适配层
│       ├── src/
│       │   ├── RichTextEditor.tsx    # 组件:forwardRef 暴露命令式 API + 上传态 portal 渲染
│       │   ├── useRichTextEditor.ts  # hook:实例创建/销毁,回调经 ref 转发
│       │   ├── UploadStatus.tsx      # UploadLoading/UploadFailure 内置占位组件
│       │   └── index.ts
│       └── tsup.config.ts
│   └── vue/               # @rte/vue —— Vue 3 适配层
│       ├── src/
│       │   ├── RichTextEditor.ts     # 组件:expose 命令式 API + 上传态 Teleport 渲染
│       │   ├── useRichTextEditor.ts  # composable:实例创建/销毁,回调经 getter 转发
│       │   ├── UploadStatus.ts       # UploadLoading/UploadFailure 内置占位组件
│       │   └── index.ts
│       └── tsup.config.ts
├── apps/
    ├── demo/              # React 演示站(Vite)
    │   └── src/
    │       ├── App.tsx
    │       ├── TopicPicker.tsx
    │       ├── WebMediaUploader.ts
    │       └── demo.css
    └── demo-vue/          # Vue 3 演示站(Vite + vue-tsc)
        └── src/
            ├── App.vue            # 话题面板 + Web 上传 + 字数/超长/HTML 输出演示
            ├── TopicPicker.vue    # 模拟话题面板(# 触发)
            ├── WebMediaUploader.ts# 模拟上传器(loading→success/failure)
            └── demo.css
├── docs/
│   └── 提取计划.md         # 完整提取计划与依赖耦合度分析
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

## 安装

```bash
pnpm add @rte/core          # 必装:框架无关内核(含编辑器样式)
pnpm add @rte/react         # React 项目
pnpm add @rte/vue           # Vue 3 项目(二选一)
```

样式需手动引入一次,主题 CSS 变量(`--rte-text-primary` / `--rte-text-disabled` / `--rte-text-link` 等)可在宿主覆盖:

```ts
import '@rte/core/styles/editor.css'
```

## 快速开始

```bash
pnpm install
pnpm dev          # 启动 demo(Vite,默认 http://localhost:5173)
pnpm -C apps/demo-vue dev   # 启动 Vue 演示站(http://localhost:5174)
```

构建:

```bash
pnpm build:core   # 构建 @rte/core(tsup 输出 ESM/CJS/d.ts)
pnpm build:react  # 构建 @rte/react
pnpm -C apps/demo build
```

> demo 的 `vite.config.ts` 用精确别名把 `@rte/core` / `@rte/react` 指向各自源码入口,因此 `pnpm dev` 无需先构建子包;`@rte/core/styles/*` 走包 `exports` 字段解析到真实 CSS 文件。

## 核心抽象

```ts
// PlatformAdapter:把 App 原生能力(JSBridge)抽象为可注入接口
export interface PlatformAdapter {
  getOS(): 'iOS' | 'Android' | 'Other'
  onFocus?(root: HTMLElement): void            // 默认: root.focus(); App: autoFocusBridge()
  setScrollEnabled?(enabled: boolean): void   // App: scrollEnabledBridge; Web: no-op
  previewMedia?(src: string): void
}

export interface EditorOptions {
  root: HTMLElement
  maxLength?: number                          // 默认 180
  platform?: Partial<PlatformAdapter>
  onChange?: (html: string, plain: string, length: number) => void
  onTopicTrigger?: () => void                  // 输入 # 时回调(宿主弹出话题面板)
  onLengthLimit?: (isOver: boolean) => void
}
```

core 暴露 `createRichTextEditor(options)`,返回 `{ insertTopic, insertMedia, setMediaStatus, removeMedia, getHTML, getPlain, getLength, focus, blur, destroy }`。

## 使用示例

### React

```tsx
import { useRef, useState } from 'react'
import { RichTextEditor } from '@rte/react'
import type { RichTextEditorHandle, TopicItem } from '@rte/react'
import '@rte/core/styles/editor.css'

const topics: TopicItem[] = [
  { id: '1', title: '今日份下班搭子' },
  { id: '2', title: '我的运动日常' },
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
        onMediaRequest={(type) => {/* 点击占位触发,弹出图片/视频选择 */}}
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

命令式 API(`ref.current`):`insertTopic` / `insertMedia` / `insertFiles` / `setMediaStatus` / `removeMedia` / `getHTML` / `getPlain` / `getLength` / `focus` / `blur`。

上传态 UI 可通过 `renderUploadStatus` 自定义,默认内置 `UploadLoading` / `UploadFailure` 组件(portal 到媒体节点内渲染)。

### Vue 3

```vue
<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { RichTextEditor } from '@rte/vue'
import type { RichTextEditorHandle, TopicItem } from '@rte/vue'
import '@rte/core/styles/editor.css'

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
    :media-uploader="{ upload: (file, onStatus) => onStatus('loading') }"
    @change="(h, plain, len) => { html = h; length = len }"
    @topic-trigger="() => {}"
  />
  <button @click="editorRef?.insertTopic(topics[0], 'tab')">插入话题</button>
  <div v-html="html" />
</template>
```

`@rte/vue` 组件 props 与命令式 API 和 React 版完全对齐,上传态经 `Teleport` 渲染。

### 框架无关 core(直接使用)

```ts
import { createRichTextEditor } from '@rte/core'
import '@rte/core/styles/editor.css'

const editor = createRichTextEditor({
  root: document.getElementById('editor')!,
  maxLength: 180,
  onChange: (html, plain, length) => console.log(html, plain, length),
  onTopicTrigger: () => {/* 弹话题面板 */},
  platform: {
    getOS: () => 'iOS',
    previewMedia: (src) => {/* 打开预览 */},
  },
  mediaUploader: {
    upload: (file, onStatus) => onStatus('loading'),
  },
})

editor.insertTopic({ id: '1', title: '话题名' }, 'tab')
editor.insertMedia([{ id: 'f1', type: 'image', status: 'loading' }], 'image')
editor.setMediaStatus('f1', 'success', 'https://cdn.example.com/a.jpg')
console.log(editor.getHTML(), editor.getLength())
editor.destroy()
```

## 在线演示

Cloudflare Workers 静态资产托管(GitHub Actions 构建,push main 自动部署):

- React demo:`https://rich-text-editor.<account>.workers.dev/`
- Vue demo:`https://rich-text-editor.<account>.workers.dev/vue/`

### 部署(Cloudflare Workers 静态资产)

构建产物由 GitHub Actions([.github/workflows/ci.yml](.github/workflows/ci.yml))生成到 `out/`,经 [wrangler.jsonc](wrangler.jsonc) 以 Workers 静态资产模式上传。需在 GitHub 仓库 Settings → Secrets and variables → Actions 配置:

| Secret | 说明 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | API Token,模板 "Edit Cloudflare Workers" |
| `CLOUDFLARE_ACCOUNT_ID` | 账号 ID,dashboard 右侧栏可复制 |

本地手动部署:`pnpm exec wrangler deploy`(需 `CLOUDFLARE_API_TOKEN` 环境变量)。

## 项目状态

提取自 `superapp-omp-web`,按 4 阶段推进:

- [x] **阶段 0**:Monorepo 脚手架(core/react/demo 三包,构建跑通)
- [x] **阶段 1**:core 核心迁移(selection/length/topic/media 纯函数 + 事件流)
- [x] **阶段 2**:React 适配层(useRichTextEditor hook + RichTextEditor 组件 + 上传态渲染)
- [x] **阶段 2.5**:Vue 适配层(@rte/vue:useRichTextEditor composable + RichTextEditor 组件 + 上传态 Teleport 渲染)
- [x] **阶段 3**:Demo 演示站(话题面板 + Web 上传,端到端演示)
- [x] **阶段 4**:打磨发布(包发布配置 exports/sideEffects/peerDeps + 安装/API 文档)

完整方案见 [docs/提取计划.md](./docs/提取计划.md)。

## License

MIT
