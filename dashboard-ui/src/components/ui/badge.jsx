import * as React from 'react'
import { cn } from '@/lib/utils'

function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: 'bg-bg-elevated text-text-secondary border-border-default',
    success: 'bg-success-muted text-success border-transparent',
    warning: 'bg-warning-muted text-warning border-transparent',
    danger: 'bg-danger-muted text-danger border-transparent',
    info: 'bg-info-muted text-info border-transparent',
    accent: 'bg-accent-muted text-accent-hover border-transparent',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
