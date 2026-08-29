// DOM 类名常量(与提取源码保持一致,保证行为/样式对齐)
export const TOPIC_CLASS = 'topicHightColor' // 话题高亮 span(沿用源码拼写)
export const NULL_CHAR_CLASS = 'nullCharacter1' // 话题后零宽占位 span
export const IMG_BOX_CLASS = 'insertImgBox' // 媒体容器
export const IMG_CLASS = 'insertImg'
export const VIDEO_CLASS = 'insertVideo'
export const ZW_BR_CLASS = 'insertDivZwBr' // 媒体后换行占位
export const ZW_SPAN_CLASS = 'inputRefzw' // 无焦点时的可聚焦占位 span
export const ROOT_CLASS = 'rte-root'
export const PLACEHOLDER_CLASS = 'rte-show-placeholder'

// 颜色配置
export const TOPIC_COLOR = '#2762EC'
/** 粘贴产生的 font 标签色(浏览器序列化为小写) */
export const FONT_TOPIC_COLOR = '#2762ec'

// 默认配置
export const DEFAULT_MAX_LENGTH = 180
/** 媒体节点垂直间距 */
export const MEDIA_MARGIN = '12px'

// 时序补丁(经验值,真机回归点)
export const DELETE_TOPIC_RANGE_DELAY = 20 // 删除到话题后选区重定向延迟
export const REFRESH_DELAY = 200 // 媒体插入/占位后的异步刷新延迟
export const IOS_FOCUS_DELAY = 700 // iOS 键盘从右侧出现的光标时序延迟
