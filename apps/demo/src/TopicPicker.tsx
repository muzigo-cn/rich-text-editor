import type { TopicItem } from '@fe-muzi/rte-react'

const MOCK_TOPICS: TopicItem[] = [
  { id: 1, title: '今日份快乐' },
  { id: 2, title: '前端开发' },
  { id: 3, title: '下班打卡' },
  { id: 4, title: 'RichTextEditor' },
]

interface TopicPickerProps {
  open: boolean
  onSelect: (item: TopicItem) => void
  onClose: () => void
}

/**
 * 模拟话题面板:输入 # 触发弹出,选中后调用 editor.insertTopic
 */
export function TopicPicker({ open, onSelect, onClose }: TopicPickerProps) {
  if (!open) return null
  return (
    <div className="topic-picker-mask" onClick={onClose}>
      <div className="topic-picker" onClick={(e) => e.stopPropagation()}>
        <div className="topic-picker-title">选择话题</div>
        {MOCK_TOPICS.map((topic) => (
          <button
            key={topic.id}
            type="button"
            className="topic-picker-item"
            onClick={() => onSelect(topic)}
          >
            #{topic.title}
          </button>
        ))}
      </div>
    </div>
  )
}
