import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Calculator, FileText, Settings,
  TrendingUp, Users, Bell, ChevronLeft, ChevronRight,
  Sparkles, Database, Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navGroups = [
  {
    label: '概览',
    items: [
      { icon: LayoutDashboard, label: '数据看板', id: 'dashboard', badge: null },
      { icon: TrendingUp, label: '经营分析', id: 'analytics', badge: 'NEW' },
    ],
  },
  {
    label: '定价管理',
    items: [
      { icon: Calculator, label: '智能定价', id: 'pricing', badge: null },
      { icon: Layers, label: '成本核算', id: 'cost', badge: null },
      { icon: Database, label: '竞品数据', id: 'competitive', badge: null },
    ],
  },
  {
    label: '运营',
    items: [
      { icon: FileText, label: '订单审核', id: 'orders', badge: null },
      { icon: Users, label: '团队管理', id: 'team', badge: null },
      { icon: Bell, label: '消息通知', id: 'notifications', badge: null },
    ],
  },
  {
    label: '系统',
    items: [
      { icon: Sparkles, label: 'AI模型', id: 'model', badge: null },
      { icon: Settings, label: '参数配置', id: 'settings', badge: null },
    ],
  },
]

export function Sidebar({ activeItem, onItemClick }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 68 : 240 }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      className="relative flex h-screen flex-col border-r border-border-default bg-bg-surface"
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 border-b border-border-subtle px-4">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)]" style={{ background: 'linear-gradient(135deg, #5e6ad2, #7a7fad)' }}>
          <Calculator className="h-4 w-4 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <span className="text-[14px] font-semibold tracking-tight text-text-primary">
                家政定价系统
              </span>
              <span className="ml-1.5 text-[10px] font-medium text-accent-hover">PRO</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-subtle"
                >
                  {group.label}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = activeItem === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => onItemClick?.(item.id)}
                    className={cn(
                      'nav-item group flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left transition-colors',
                      isActive
                        ? 'active bg-accent-muted text-accent-hover'
                        : 'text-text-muted hover:bg-bg-hover hover:text-text-secondary'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className={cn(
                      'h-[18px] w-[18px] flex-shrink-0 transition-colors',
                      isActive ? 'text-accent-hover' : 'text-text-subtle group-hover:text-text-muted'
                    )} />
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="flex-1 overflow-hidden whitespace-nowrap text-[13px] font-medium"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {!collapsed && item.badge && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          'rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                          item.badge === 'NEW'
                            ? 'bg-accent-muted text-accent-hover'
                            : 'bg-danger-muted text-danger'
                        )}
                      >
                        {item.badge}
                      </motion.span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-border-subtle p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text-secondary"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-[12px] font-medium">收起菜单</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  )
}
