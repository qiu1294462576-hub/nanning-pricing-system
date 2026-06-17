import { motion } from 'framer-motion'
import { Circle, Clock, CheckCircle2, AlertCircle, MoreHorizontal } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusConfig = {
  todo: { icon: Circle, label: '待处理', variant: 'default', color: 'text-text-muted' },
  in_progress: { icon: Clock, label: '进行中', variant: 'info', color: 'text-info' },
  in_review: { icon: AlertCircle, label: '审核中', variant: 'warning', color: 'text-warning' },
  done: { icon: CheckCircle2, label: '已完成', variant: 'success', color: 'text-success' },
}

const priorityConfig = {
  high: { label: '高', variant: 'danger' },
  medium: { label: '中', variant: 'warning' },
  low: { label: '低', variant: 'default' },
}

export function TaskList({ tasks }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
    >
      <Card className="glass-card">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>待办任务</CardTitle>
          <span className="text-[11px] text-text-muted">
            {tasks.filter(t => t.status !== 'done').length} 项未完成
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border-subtle">
            {tasks.map((task, index) => {
              const status = statusConfig[task.status]
              const StatusIcon = status.icon
              const priority = priorityConfig[task.priority]

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.65 + index * 0.06, duration: 0.3 }}
                  className="group flex items-start gap-3 px-5 py-3 transition-colors hover:bg-bg-hover/50"
                >
                  <StatusIcon className={cn('mt-0.5 h-4 w-4 flex-shrink-0', status.color)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-[13px] font-medium',
                        task.status === 'done' ? 'text-text-muted line-through' : 'text-text-primary'
                      )}>
                        {task.title}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-text-muted">
                      {task.description}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge variant={priority.variant}>{priority.label}</Badge>
                      {task.tags?.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[10px] text-text-subtle">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-1">
                    <span className="text-[10px] text-text-subtle">{task.dueDate?.slice(5)}</span>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-medium text-white" style={{ background: 'linear-gradient(135deg, rgba(94,106,210,0.8), rgba(122,127,173,0.8))' }}>
                      {task.assignee?.[0]}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
