import { Search, Bell, Command } from 'lucide-react'
import { motion } from 'framer-motion'

export function Header({ title = '数据看板', unreadCount = 0, onNavigate }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border-subtle bg-bg-surface/60 px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <h1 className="heading-display text-[17px] text-text-primary">
          {title}
        </h1>
        <span className="inline-flex items-center gap-1 rounded-full bg-success-muted px-2 py-0.5 text-[10px] font-medium text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          实时
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button className="group flex items-center gap-2 rounded-lg border border-border-default bg-bg-elevated/40 px-3 py-1.5 text-[12px] text-text-muted transition-all hover:border-border-strong hover:bg-bg-hover">
          <Search className="h-3.5 w-3.5 transition-colors group-hover:text-text-secondary" />
          <span className="transition-colors group-hover:text-text-secondary">搜索...</span>
          <kbd className="ml-3 flex items-center gap-0.5 rounded border border-border-subtle bg-bg-surface px-1.5 py-0.5 text-[10px] font-medium text-text-subtle">
            <Command className="h-2.5 w-2.5" />
            K
          </kbd>
        </button>

        <button
          onClick={() => onNavigate?.('notifications')}
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-hover hover:text-text-secondary"
        >
          <Bell className="h-[17px] w-[17px]" strokeWidth={1.8} />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger"
            >
              <span className="text-[9px] font-bold text-white">{unreadCount}</span>
            </motion.span>
          )}
        </button>

        <div className="mx-1 h-5 w-px bg-border-subtle" />

        <button className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold text-white" style={{ background: 'linear-gradient(135deg, #00b8a9, #8b7cf6)' }}>
          李
        </button>
      </div>
    </header>
  )
}
