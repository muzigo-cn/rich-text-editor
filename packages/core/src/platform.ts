import type { OS, PlatformAdapter } from './types'

/**
 * 基于 UA 的跨端检测(原 detectMobileOperatingSystem 的可移植实现)
 */
export function detectOS(ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): OS {
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS'
  // iPadOS 13+ 桌面 UA(平台为 Macintosh),通过 maxTouchPoints 识别
  if (/macintosh/i.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1) return 'iOS'
  if (/android/i.test(ua)) return 'Android'
  return 'Other'
}

/**
 * 默认纯 Web 平台实现
 */
export const webPlatform: PlatformAdapter = {
  getOS: () => detectOS(),
  onFocus: (root) => root.focus(),
  setScrollEnabled: () => {
    /* Web 下由页面自行处理滚动锁定 */
  },
  previewMedia: (src) => window.open(src, '_blank'),
}
