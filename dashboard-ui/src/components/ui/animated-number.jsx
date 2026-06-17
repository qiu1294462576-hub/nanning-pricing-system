import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0, className, duration = 1200 }) {
  const [display, setDisplay] = useState(0)
  const startRef = useRef(0)
  const rafRef = useRef(null)

  useEffect(() => {
    const start = startRef.current
    const diff = value - start
    const startTime = performance.now()

    function tick(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      const current = start + diff * eased
      setDisplay(current)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        startRef.current = value
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  const formatted = display.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return (
    <span className={cn('kpi-number tabular-nums', className)}>
      {prefix}{formatted}{suffix}
    </span>
  )
}
