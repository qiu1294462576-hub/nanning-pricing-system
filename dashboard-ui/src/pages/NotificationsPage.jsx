import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, CheckCircle, Info, Bell, Check, CheckCheck, BellOff, X } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const typeConfig = {
  alert: { icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  success: { icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  warning: { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  info: { icon: Info, color: '#38bdf8', bg: 'rgba(56,189,248,0.15)' },
}

export function NotificationsPage() {
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('all')
  const unreadCount = items.filter(n => !n.read).length
  const hasItems = items.length > 0

  function markRead(id) {
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  function markAllRead() {
    setItems(prev => prev.map(n => ({ ...n, read: true })))
  }

  function clearAll() {
    setItems([])
  }

  const filtered = items.filter(n => filter === 'all' || (filter === 'unread' ? !n.read : n.read))

  return (
    <>
      <AnimatePresence mode="wait">
        {!hasItems ? (
          /* Empty State */
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
          >
            <Card>
              <CardContent className="flex flex-col items-center py-14">
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ background: 'rgba(0, 184, 169, 0.1)', border: '1px solid rgba(0, 184, 169, 0.2)' }}
                >
                  <BellOff className="h-7 w-7" style={{ color: '#00b8a9' }} />
                </motion.div>
                <h3 className="mb-1 text-[16px] font-semibold text-text-primary">暂无系统通知</h3>
                <p className="max-w-sm text-center text-[13px] leading-relaxed text-text-muted">
                  系统运行过程中产生的预警、模型更新、竞品变动等通知将自动出现在这里。
                </p>

                <div className="mt-8 w-full max-w-md rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated/30 p-4">
                  <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-text-subtle">
                    通知类型说明
                  </p>
                  <div className="space-y-2.5">
                    {[
                      { type: 'alert', label: '预警通知', desc: 'AI模型偏差、供需异常等实时预警' },
                      { type: 'success', label: '完成通知', desc: '模型训练完成、审批通过等状态更新' },
                      { type: 'warning', label: '提醒通知', desc: '供应紧张、定价建议等运营提示' },
                      { type: 'info', label: '信息通知', desc: '竞品价格变动、数据导入等系统事件' },
                    ].map(t => {
                      const cfg = typeConfig[t.type]
                      return (
                        <div key={t.type} className="flex items-center gap-3">
                          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full" style={{ background: cfg.bg }}>
                            <cfg.icon className="h-3 w-3" style={{ color: cfg.color }} />
                          </div>
                          <div>
                            <span className="text-[12px] font-medium text-text-secondary">{t.label}</span>
                            <span className="ml-2 text-[11px] text-text-subtle">{t.desc}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* Notifications List */
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle>消息通知</CardTitle>
                  {unreadCount > 0 && <Badge variant="danger">{unreadCount} 未读</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {['all', 'unread', 'read'].map(f => (
                      <button key={f} onClick={() => setFilter(f)}
                        className={`rounded-[var(--radius-sm)] px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          filter === f ? 'bg-accent-muted text-accent-hover' : 'text-text-muted hover:bg-bg-hover'
                        }`}>
                        {f === 'all' ? '全部' : f === 'unread' ? '未读' : '已读'}
                      </button>
                    ))}
                  </div>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead}
                      className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-border-default px-2.5 py-1 text-[11px] text-text-muted hover:bg-bg-hover">
                      <CheckCheck className="h-3 w-3" /> 全部已读
                    </button>
                  )}
                  <button onClick={clearAll}
                    className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-border-default px-2.5 py-1 text-[11px] text-text-muted transition-colors hover:border-danger/30 hover:text-danger">
                    <X className="h-3 w-3" /> 清空
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border-subtle">
                  {filtered.map((n, i) => {
                    const cfg = typeConfig[n.type]
                    const Icon = cfg.icon
                    return (
                      <motion.div key={n.id}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 + i * 0.04, duration: 0.25 }}
                        className={`flex items-start gap-3 px-5 py-4 transition-colors hover:bg-bg-hover/50 ${!n.read ? 'bg-accent-muted/[0.03]' : ''}`}>
                        <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full" style={{ background: cfg.bg }}>
                          <Icon className="h-4 w-4" style={{ color: cfg.color }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[13px] font-medium ${!n.read ? 'text-text-primary' : 'text-text-secondary'}`}>
                              {n.title}
                            </span>
                            {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                          </div>
                          <p className="mt-1 text-[12px] leading-relaxed text-text-muted">{n.message}</p>
                          <span className="mt-1.5 block text-[10px] text-text-subtle">{n.time}</span>
                        </div>
                        {!n.read && (
                          <button onClick={() => markRead(n.id)}
                            className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-border-default text-text-subtle hover:bg-bg-hover hover:text-text-secondary"
                            title="标记已读">
                            <Check className="h-3 w-3" />
                          </button>
                        )}
                      </motion.div>
                    )
                  })}
                  {filtered.length === 0 && hasItems && (
                    <div className="py-12 text-center text-[13px] text-text-muted">
                      {filter === 'unread' ? '没有未读通知' : filter === 'read' ? '没有已读通知' : '暂无通知'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
