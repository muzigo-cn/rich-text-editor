import type { MediaUploader } from '@fe-muzi/rte-vue'

/**
 * Web 模拟上传器(对应原生 JSBridge 上传):
 * 占位 1.5~2.5s 后回传本地预览地址,20% 概率失败以演示 failure 态
 */
export function createWebMediaUploader(): MediaUploader {
  return {
    upload(file, onStatus) {
      // Web 场景仅处理本地 File(原生场景由 JSBridge 上传 MediaFile);
      // 用 duck typing 代替 instanceof:跨 realm(自动化注入/iframe)的 File 不是当前 realm 的实例
      if (!file || typeof (file as File).name !== 'string' || typeof (file as File).size !== 'number') return
      const fail = Math.random() < 0.2
      const delay = 1500 + Math.random() * 1000
      setTimeout(() => {
        if (fail) {
          onStatus('failure')
        } else {
          onStatus('success', URL.createObjectURL(file as File))
        }
      }, delay)
    },
  }
}
