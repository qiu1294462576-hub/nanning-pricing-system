import { Search, Bell } from 'lucide-react'
import { motion } from 'framer-motion'

export function Header({ title = '数据看板', unreadCount = 2, onNavigate }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border-subtle bg-bg-surface/80 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <h1 className="text-[16px] font-semibold tracking-[-0.01em] text-text-primary">
          {title}
        </h1>
        <span className="rounded-full bg-success-muted px-2 py-0.5 text-[10px] font-medium text-success">
          实时
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border-default bg-bg-elevated/50 px-3 py-1.5 text-[12px] text-text-muted transition-colors hover:border-border-strong hover:text-text-secondary">
          <Search className="h-3.5 w-3.5" />
          <span>搜索...</span>
          <kbd className="ml-4 rounded bg-bg-hover px-1.5 py-0.5 text-[10px] font-medium text-text-subtle">
            ⌘K
          </kbd>
        </button>

        <button
          onClick={() => onNavigate?.('notifications')}
          className="relative flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-text-muted transition-colors hover:bg-bg-hover hover:text-text-secondary">
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full"
              style={{ background: '#e5484d' }}
            >
              <span className="text-[9px] font-bold text-white">{unreadCount}</span>
            </motion.span>
          )}
        </button>

        <button className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold text-white" style={{ background: 'linear-gradient(135deg, #5e6ad2, #7a7fad)' }}>
          李
        </button>
      </div>
    </header>
  )
}
