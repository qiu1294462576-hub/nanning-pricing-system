import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, Users, Upload, X, Trash2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const statusColors = { online: '#10b981', busy: '#f59e0b', offline: '#6b7280' }
const statusLabels = { online: '在线', busy: '忙碌', offline: '离线' }

const roleOptions = ['定价策略经理', '数据工程师', '数据分析师', '运营主管', '区域经理', '客服人员', '财务人员']

export function TeamPage() {
  const [members, setMembers] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({ name: '', role: '定价策略经理' })

  const onlineCount = members.filter(m => m.status === 'online').length

  function addMember() {
    if (!form.name.trim()) return
    setMembers(prev => [
      ...prev,
      {
        id: `m${Date.now()}`,
        name: form.name.trim(),
        role: form.role,
        status: 'online',
        currentTask: '',
        tasksCompleted: 0,
      },
    ])
    setForm({ name: '', role: '定价策略经理' })
    setShowAddForm(false)
  }

  function removeMember(id) {
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  const hasMembers = members.length > 0

  return (
    <>
      <AnimatePresence mode="wait">
        {!hasMembers ? (
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
                  <Users className="h-7 w-7" style={{ color: '#00b8a9' }} />
                </motion.div>
                <h3 className="mb-1 text-[16px] font-semibold text-text-primary">暂无团队成员</h3>
                <p className="mb-6 max-w-sm text-center text-[13px] leading-relaxed text-text-muted">
                  添加团队成员以分配任务、跟踪工作进度。可以手动添加或批量导入成员信息。
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 rounded-[var(--radius-md)] bg-accent px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-accent-hover active:scale-[0.98]"
                  >
                    <UserPlus className="h-4 w-4" />
                    添加成员
                  </button>
                  <button
                    className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border-default px-5 py-2.5 text-[13px] font-medium text-text-muted transition-all hover:border-border-strong hover:text-text-secondary"
                  >
                    <Upload className="h-4 w-4" />
                    批量导入
                  </button>
                </div>

                {/* Quick Add Form */}
                <AnimatePresence>
                  {showAddForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-6 w-full max-w-md overflow-hidden"
                    >
                      <div className="rounded-[var(--radius-md)] border border-border-default bg-bg-elevated/50 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-[13px] font-medium text-text-primary">添加新成员</span>
                          <button onClick={() => setShowAddForm(false)} className="text-text-subtle hover:text-text-muted">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="mb-1 block text-[11px] text-text-muted">姓名</label>
                            <input
                              type="text"
                              value={form.name}
                              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && addMember()}
                              placeholder="输入成员姓名"
                              className="h-8 w-full rounded-[var(--radius-sm)] border border-border-default bg-bg-base px-3 text-[13px] text-text-primary outline-none placeholder:text-text-subtle focus:border-accent"
                              autoFocus
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] text-text-muted">职位角色</label>
                            <select
                              value={form.role}
                              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                              className="h-8 w-full rounded-[var(--radius-sm)] border border-border-default bg-bg-base px-3 text-[13px] text-text-primary outline-none focus:border-accent"
                            >
                              {roleOptions.map(r => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                          </div>
                          <button
                            onClick={addMember}
                            disabled={!form.name.trim()}
                            className="w-full rounded-[var(--radius-sm)] bg-accent py-2 text-[13px] font-medium text-white transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            确认添加
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* Members List State */
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="py-4">
                  <div className="text-[11px] text-text-muted">团队人数</div>
                  <div className="mt-1 text-[22px] font-semibold text-text-primary">{members.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <div className="text-[11px] text-text-muted">当前在线</div>
                  <div className="mt-1 text-[22px] font-semibold text-success">{onlineCount}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <div className="text-[11px] text-text-muted">本月完成任务</div>
                  <div className="mt-1 text-[22px] font-semibold text-text-primary">
                    {members.reduce((s, m) => s + m.tasksCompleted, 0)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Member List */}
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>团队成员</CardTitle>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border-default px-3 py-1.5 text-[12px] text-text-muted transition-colors hover:border-border-strong hover:text-text-secondary"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  添加成员
                </button>
              </CardHeader>

              {/* Inline Add Form */}
              <AnimatePresence>
                {showAddForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden border-b border-border-default"
                  >
                    <div className="flex items-center gap-3 px-5 py-3">
                      <input
                        type="text"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && addMember()}
                        placeholder="输入成员姓名"
                        className="h-8 w-40 rounded-[var(--radius-sm)] border border-border-default bg-bg-base px-3 text-[13px] text-text-primary outline-none placeholder:text-text-subtle focus:border-accent"
                        autoFocus
                      />
                      <select
                        value={form.role}
                        onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                        className="h-8 rounded-[var(--radius-sm)] border border-border-default bg-bg-base px-3 text-[13px] text-text-primary outline-none focus:border-accent"
                      >
                        {roleOptions.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      <button
                        onClick={addMember}
                        disabled={!form.name.trim()}
                        className="rounded-[var(--radius-sm)] bg-accent px-4 py-1.5 text-[12px] font-medium text-white hover:bg-accent-hover disabled:opacity-40"
                      >
                        添加
                      </button>
                      <button
                        onClick={() => { setShowAddForm(false); setForm({ name: '', role: '定价策略经理' }) }}
                        className="text-text-subtle hover:text-text-muted"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <CardContent className="p-0">
                <div className="divide-y divide-border-subtle">
                  {members.map((member, i) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                      className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-bg-hover/50"
                    >
                      <div className="relative flex-shrink-0">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full text-[14px] font-semibold text-white"
                          style={{ background: 'linear-gradient(135deg, #00b8a9, #8b7cf6)' }}
                        >
                          {member.name[0]}
                        </div>
                        <span
                          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-bg-surface"
                          style={{ background: statusColors[member.status] }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-medium text-text-primary">{member.name}</span>
                          <Badge variant={member.status === 'online' ? 'success' : member.status === 'busy' ? 'warning' : 'default'}>
                            {statusLabels[member.status]}
                          </Badge>
                        </div>
                        <div className="mt-0.5 text-[12px] text-text-muted">{member.role}</div>
                        {member.currentTask && (
                          <div className="mt-1 text-[11px] text-text-subtle">{member.currentTask}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[18px] font-semibold text-text-primary">{member.tasksCompleted}</div>
                          <div className="text-[10px] text-text-subtle">任务完成</div>
                        </div>
                        <button
                          onClick={() => removeMember(member.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-text-subtle opacity-0 transition-all group-hover:opacity-100 hover:bg-danger-muted hover:text-danger"
                          title="移除成员"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
