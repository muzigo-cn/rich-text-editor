<script setup lang="ts">
import type { TopicItem } from '@rte/vue'

defineProps<{ open: boolean }>()

const emit = defineEmits<{
  select: [item: TopicItem]
  close: []
}>()

const MOCK_TOPICS: TopicItem[] = [
  { id: 1, title: '今日份快乐' },
  { id: 2, title: '前端开发' },
  { id: 3, title: '下班打卡' },
  { id: 4, title: 'RichTextEditor' },
]
</script>

<template>
  <!-- 模拟话题面板:输入 # 触发弹出,选中后调用 editor.insertTopic -->
  <div v-if="open" class="topic-picker-mask" @click="emit('close')">
    <div class="topic-picker" @click.stop>
      <div class="topic-picker-title">选择话题</div>
      <button
        v-for="topic in MOCK_TOPICS"
        :key="topic.id"
        type="button"
        class="topic-picker-item"
        @click="emit('select', topic)"
      >
        #{{ topic.title }}
      </button>
    </div>
  </div>
</template>
