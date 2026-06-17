import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const statusColors = {
  online: 'bg-success',
  busy: 'bg-warning',
  offline: 'bg-text-subtle',
}

export function TeamStatus({ members }) {
  const onlineCount = members.filter(m => m.status === 'online').length

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>团队状态</CardTitle>
          <span className="text-[11px] text-text-muted">
            {onlineCount}/{members.length} 在线
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-muted">
                <Users className="h-5 w-5 text-accent" strokeWidth={1.8} />
              </div>
              <p className="text-[13px] font-medium text-text-secondary">暂无团队成员</p>
              <p className="mt-1 text-[11px] text-text-muted">在团队管理页面中添加成员</p>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {members.map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-bg-hover/40"
                >
                  <div className="relative flex-shrink-0">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold text-white"
                      style={{
                        background: member.status === 'online'
                          ? 'linear-gradient(135deg, #00b8a9, #10b981)'
                          : member.status === 'busy'
                            ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                            : undefined,
                        backgroundColor: member.status === 'offline' ? 'var(--color-bg-active)' : undefined,
                      }}
                    >
                      {member.name[0]}
                    </div>
                    <span className={cn(
                      'status-dot absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-bg-surface',
                      statusColors[member.status]
                    )} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-text-primary">{member.name}</span>
                      <span className="text-[10px] text-text-subtle">{member.role}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-text-muted">
                      {member.status === 'offline' ? '—' : member.currentTask}
                    </p>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <div className="text-[12px] font-semibold text-text-secondary">{member.tasksCompleted}</div>
                    <div className="text-[9px] text-text-subtle">已完成</div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
