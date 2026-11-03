export function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function orderStatusType(status: string) {
  if (status === 'confirmed') return 'success'
  if (status === 'partially_returned') return 'warning'
  if (status === 'returned' || status === 'cancelled') return 'danger'
  if (status === 'converted') return 'info'
  return 'info'
}

export function orderStatusLabel(status: string) {
  const map: Record<string, string> = {
    pending: '待确认',
    converted: '已转出库',
    confirmed: '已确认',
    partially_returned: '部分退货',
    returned: '已退货',
    cancelled: '已取消',
    reserved: '预留中',
  }
  return map[status] || status
}

export function returnStatusType(status: string) {
  if (status === 'confirmed') return 'success'
  if (status === 'cancelled') return 'danger'
  return 'warning'
}

export function returnStatusLabel(status: string) {
  if (status === 'confirmed') return '已确认'
  if (status === 'cancelled') return '已取消'
  return '待确认'
}

export function returnReasonLabel(reason: string) {
  const map: Record<string, string> = {
    refund_only: '仅退款',
    return_refund: '退货退款',
    shipping_damage: '运损',
    other: '其他',
  }
  return map[reason] || reason
}

export function returnTotalQty(ret: { items?: Array<{ quantity?: number }> | null }): number {
  return (ret.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0)
}

export function bundlePriceModeLabel(mode: string): string {
  switch (mode) {
    case 'fixed':
      return '固定价'
    case 'main_only':
      return '只收主商品'
    default:
      return '合计计价'
  }
}
