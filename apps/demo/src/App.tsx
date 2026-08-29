import { useRef, useState } from 'react'
import { detectOS } from '@fe-muzi/rte-core'
import { RichTextEditor } from '@fe-muzi/rte-react'
import type { MediaType, RichTextEditorHandle } from '@fe-muzi/rte-react'
import { TopicPicker } from './TopicPicker'
import { createWebMediaUploader } from './WebMediaUploader'
import './demo.css'

const uploader = createWebMediaUploader()
const MAX_LENGTH = 180

export default function App() {
  const handleRef = useRef<RichTextEditorHandle>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaTypeRef = useRef<MediaType>('image')

  const [os] = useState(() => detectOS())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [html, setHtml] = useState('')
  const [length, setLength] = useState(0)
  const [isOver, setIsOver] = useState(false)

  const openFilePicker = (type: MediaType) => {
    mediaTypeRef.current = type
    fileInputRef.current?.click()
  }

  return (
    <div className="demo-page">
      <h1>RichTextEditor Demo</h1>
      <p className="demo-os">当前平台:{os}(PlatformAdapter 默认 Web 实现)</p>

      <div className="demo-editor">
        <RichTextEditor
          ref={handleRef}
          maxLength={MAX_LENGTH}
          mediaUploader={uploader}
          placeholder={{ focus: '  输入 # 参与话题…', blur: '输入 # 参与话题…' }}
          onChange={(html, _plain, len) => {
            setHtml(html)
            setLength(len)
          }}
          onLengthLimit={setIsOver}
          onTopicTrigger={() => setPickerOpen(true)}
        />
        <input
          ref={fileInputRef}
          type="file"
          hidden
          multiple
          accept="image/*,video/*"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            if (files.length) handleRef.current?.insertFiles(files, mediaTypeRef.current)
            e.target.value = ''
          }}
        />
      </div>

      <div className="demo-toolbar">
        <button type="button" onClick={() => openFilePicker('image')}>插入图片</button>
        <button type="button" onClick={() => openFilePicker('video')}>插入视频</button>
        <button type="button" onClick={() => handleRef.current?.insertTopic({ id: 9, title: '随机话题' }, 'tab')}>
          插入话题
        </button>
        <button type="button" onClick={() => handleRef.current?.focus()}>聚焦</button>
      </div>

      <div className={isOver ? 'demo-count demo-count-over' : 'demo-count'}>
        {length}/{MAX_LENGTH}{isOver ? ' · 已超出上限(仅提示,不阻断输入)' : ''}
      </div>

      <TopicPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(topic) => {
          handleRef.current?.insertTopic(topic)
          setPickerOpen(false)
        }}
      />

      <details className="demo-html">
        <summary>HTML 输出</summary>
        <pre>{html}</pre>
      </details>
    </div>
  )
}
