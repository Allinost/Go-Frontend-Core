import { reactive } from 'vue'

export interface ConfirmOptions {
  title?: string
  content: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

interface ConfirmState {
  visible: boolean
  options: ConfirmOptions
  resolver: ((value: boolean) => void) | null
}

export const confirmState = reactive<ConfirmState>({
  visible: false,
  options: { content: '' },
  resolver: null,
})

/** 统一确认弹窗：返回 Promise，确认为 true，取消或关闭为 false */
export function confirmDialog(input: string | ConfirmOptions): Promise<boolean> {
  confirmState.resolver?.(false)
  confirmState.options = typeof input === 'string' ? { content: input } : input
  confirmState.visible = true
  return new Promise<boolean>((resolve) => {
    confirmState.resolver = resolve
  })
}

export function settleConfirm(result: boolean) {
  const resolver = confirmState.resolver
  confirmState.resolver = null
  confirmState.visible = false
  resolver?.(result)
}
