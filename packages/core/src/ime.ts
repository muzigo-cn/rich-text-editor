/**
 * 中文输入法 composition 状态机:
 * 区分组词态(composing)与上屏态,避免组词期间误触发话题检测与误统计长度
 */
export class ImeState {
  /** 是否组词中 */
  composing = false
  /** 最近一次按键(用于删除方向判定) */
  lastKey = ''

  startComposition(): void {
    this.composing = true
  }

  endComposition(): void {
    this.composing = false
  }

  setKey(key: string): void {
    this.lastKey = key
  }

  /** 非组词态下按下了删除键 */
  isDeleting(): boolean {
    return !this.composing && this.lastKey === 'Backspace'
  }
}
