import * as React from 'react'
import { cn } from '@/lib/utils'

function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: 'bg-bg-elevated text-text-secondary border-border-subtle',
    success: 'bg-success-muted text-success border-transparent',
    warning: 'bg-warning-muted text-warning border-transparent',
    danger: 'bg-danger-muted text-danger border-transparent',
    info: 'bg-info-muted text-info border-transparent',
    accent: 'bg-accent-muted text-accent border-transparent',
    violet: 'bg-violet-muted text-violet border-transparent',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none tracking-wide uppercase',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
