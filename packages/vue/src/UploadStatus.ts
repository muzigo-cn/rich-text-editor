import { defineComponent, h } from 'vue'
import type { MediaType } from '@fe-muzi/rte-core'

/**
 * 上传中占位(对应 React 版 UploadLoading,样式见 core styles/editor.css)
 */
export const UploadLoading = defineComponent({
  name: 'UploadLoading',
  props: {
    type: { type: String as import('vue').PropType<MediaType>, default: 'image' },
  },
  setup(props) {
    return () =>
      h('div', {
        class: props.type === 'video' ? 'rte-upload-loading rte-upload-video' : 'rte-upload-loading',
      }, [h('span', { class: 'rte-upload-spinner' })])
  },
})

/**
 * 上传失败占位(对应 React 版 UploadFailure)
 */
export const UploadFailure = defineComponent({
  name: 'UploadFailure',
  props: {
    onDelete: { type: Function as import('vue').PropType<() => void>, default: undefined },
  },
  setup(props) {
    return () =>
      h('div', { class: 'rte-upload-failure' }, [
        h('span', { class: 'rte-upload-failure-text' }, '上传失败'),
        props.onDelete
          ? h('button', { type: 'button', class: 'rte-upload-failure-btn', onClick: props.onDelete }, '删除')
          : null,
      ])
  },
})
