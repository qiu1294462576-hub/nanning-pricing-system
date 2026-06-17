import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatNumber(n, options = {}) {
  const { decimals = 0, prefix = '', suffix = '' } = options
  if (n == null) return '—'
  const formatted = Number(n).toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `${prefix}${formatted}${suffix}`
}

export function formatCompact(n) {
  if (n == null) return '—'
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}
