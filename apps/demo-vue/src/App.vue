<script setup lang="ts">
import { ref } from 'vue'
import { detectOS } from '@fe-muzi/rte-core'
import { RichTextEditor } from '@fe-muzi/rte-vue'
import type { MediaType, RichTextEditorHandle, TopicItem } from '@fe-muzi/rte-vue'
import TopicPicker from './TopicPicker.vue'
import { createWebMediaUploader } from './WebMediaUploader'

const uploader = createWebMediaUploader()
const MAX_LENGTH = 180

const handle = ref<RichTextEditorHandle | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const mediaType = ref<MediaType>('image')

const os = detectOS()
const pickerOpen = ref(false)
const html = ref('')
const length = ref(0)
const isOver = ref(false)

const openFilePicker = (type: MediaType) => {
  mediaType.value = type
  fileInputRef.value?.click()
}

const onFilesChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  if (files.length) handle.value?.insertFiles(files, mediaType.value)
  input.value = ''
}
</script>

<template>
  <div class="demo-page">
    <h1>RichTextEditor Vue Demo</h1>
    <p class="demo-os">当前平台:{{ os }}(PlatformAdapter 默认 Web 实现)</p>

    <div class="demo-editor">
      <RichTextEditor
        ref="handle"
        :max-length="MAX_LENGTH"
        :media-uploader="uploader"
        :placeholder="{ focus: '  输入 # 参与话题…', blur: '输入 # 参与话题…' }"
        :on-change="(h, _plain, len) => { html = h; length = len }"
        :on-length-limit="over => (isOver = over)"
        :on-topic-trigger="() => (pickerOpen = true)"
      />
      <input
        ref="fileInputRef"
        type="file"
        hidden
        multiple
        accept="image/*,video/*"
        @change="onFilesChange"
      />
    </div>

    <div class="demo-toolbar">
      <button type="button" @click="openFilePicker('image')">插入图片</button>
      <button type="button" @click="openFilePicker('video')">插入视频</button>
      <button type="button" @click="handle?.insertTopic({ id: 9, title: '随机话题' }, 'tab')">
        插入话题
      </button>
      <button type="button" @click="handle?.focus()">聚焦</button>
    </div>

    <div :class="['demo-count', isOver ? 'demo-count-over' : '']">
      {{ length }}/{{ MAX_LENGTH }}{{ isOver ? ' · 已超出上限(仅提示,不阻断输入)' : '' }}
    </div>

    <TopicPicker
      :open="pickerOpen"
      @close="pickerOpen = false"
      @select="(topic) => { handle?.insertTopic(topic); pickerOpen = false }"
    />

    <details class="demo-html">
      <summary>HTML 输出</summary>
      <pre>{{ html }}</pre>
    </details>
  </div>
</template>
