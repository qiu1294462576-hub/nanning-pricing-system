import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Calculator, FileText, Settings,
  TrendingUp, Users, Bell, ChevronLeft, ChevronRight,
  Sparkles, Database, Layers, Zap,
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
      animate={{ width: collapsed ? 64 : 244 }}
      transition={{ type: 'tween', duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex h-screen flex-col border-r border-border-subtle bg-bg-surface"
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border-subtle px-4">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ background: 'linear-gradient(135deg, #00b8a9 0%, #00d4c3 100%)' }}
        >
          <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <span className="text-[13px] font-semibold tracking-tight text-text-primary">
                家政定价系统
              </span>
              <span className="ml-1.5 rounded bg-violet-muted px-1 py-0.5 text-[9px] font-semibold tracking-wide text-violet">
                PRO
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-subtle"
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
                      'nav-item group flex w-full items-center gap-2.5 px-3 py-2 text-left',
                      isActive
                        ? 'active text-accent-hover'
                        : 'text-text-muted hover:bg-bg-hover hover:text-text-secondary'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className={cn(
                      'h-[17px] w-[17px] flex-shrink-0 transition-colors',
                      isActive ? 'text-accent' : 'text-text-subtle group-hover:text-text-muted'
                    )} strokeWidth={1.8} />
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.12 }}
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
                          'rounded px-1.5 py-0.5 text-[9px] font-semibold leading-none tracking-wide',
                          item.badge === 'NEW'
                            ? 'bg-violet-muted text-violet'
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

      {/* Footer */}
      <div className="border-t border-border-subtle p-2">
        {!collapsed && (
          <div className="mb-2 flex items-center gap-2 px-2 py-1.5">
            <div
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #00b8a9, #8b7cf6)' }}
            >
              李
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-text-primary">李经理</div>
              <div className="text-[10px] text-text-muted">定价策略经理</div>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-md px-3 py-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text-secondary"
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
