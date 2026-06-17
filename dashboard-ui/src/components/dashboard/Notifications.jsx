import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle, Info, Bell, ChevronRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const typeConfig = {
  alert: { icon: AlertTriangle, color: 'text-danger', bg: 'bg-danger-muted' },
  success: { icon: CheckCircle, color: 'text-success', bg: 'bg-success-muted' },
  warning: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning-muted' },
  info: { icon: Info, color: 'text-info', bg: 'bg-info-muted' },
}

export function Notifications({ notifications }) {
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.5 }}
    >
      <Card className="glass-card">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>通知</CardTitle>
          {unreadCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-accent-hover">
              {unreadCount} 条未读
              <ChevronRight className="h-3 w-3" />
            </span>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'rgba(94, 106, 210, 0.1)' }}>
                <Bell className="h-4 w-4" style={{ color: '#5e6ad2' }} />
              </div>
              <p className="text-[12px] text-text-muted">暂无系统通知</p>
              <p className="mt-0.5 text-[10px] text-text-subtle">系统预警和更新将自动出现在这里</p>
            </div>
          ) : (
          <div className="divide-y divide-border-subtle">
            {notifications.map((notification, index) => {
              const config = typeConfig[notification.type]
              const Icon = config.icon

              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.75 + index * 0.06, duration: 0.3 }}
                  className={cn(
                    'group flex items-start gap-3 px-5 py-3 transition-colors hover:bg-bg-hover/50',
                    !notification.read && 'bg-accent-muted/[0.03]'
                  )}
                >
                  <div className={cn(
                    'mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full',
                    config.bg
                  )}>
                    <Icon className={cn('h-3.5 w-3.5', config.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-[12px] font-medium',
                        !notification.read ? 'text-text-primary' : 'text-text-secondary'
                      )}>
                        {notification.title}
                      </span>
                      {!notification.read && (
                        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-text-muted">
                      {notification.message}
                    </p>
                    <span className="mt-1 block text-[10px] text-text-subtle">
                      {notification.time}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
