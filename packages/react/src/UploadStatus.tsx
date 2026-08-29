import type { MediaType } from '@fe-muzi/rte-core'

/**
 * 上传中占位(对应原 UploadLoading,样式见 core styles/editor.css)
 */
export function UploadLoading({ type = 'image' }: { type?: MediaType }) {
  return (
    <div className={type === 'video' ? 'rte-upload-loading rte-upload-video' : 'rte-upload-loading'}>
      <span className="rte-upload-spinner" />
    </div>
  )
}

/**
 * 上传失败占位(对应原 UploadFailure)
 */
export function UploadFailure({ onDelete }: { onDelete?: () => void }) {
  return (
    <div className="rte-upload-failure">
      <span className="rte-upload-failure-text">上传失败</span>
      {onDelete && (
        <button type="button" className="rte-upload-failure-btn" onClick={onDelete}>
          删除
        </button>
      )}
    </div>
  )
}
