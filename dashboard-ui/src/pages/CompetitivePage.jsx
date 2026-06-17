import { useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const platforms = ['美团家政', '天鹅到家', '58到家']
const platformColors = { '美团家政': '#e8a735', '天鹅到家': '#5e6ad2', '58到家': '#27a644' }

const competitiveData = [
  { service: '日常保洁', '美团家政': 138, '天鹅到家': 155, '58到家': 130, ourPrice: 142 },
  { service: '深度清洁', '美团家政': 228, '天鹅到家': 260, '58到家': 215, ourPrice: 235 },
  { service: '开荒保洁', '美团家政': 310, '天鹅到家': 350, '58到家': 285, ourPrice: 315 },
  { service: '家电清洗', '美团家政': 158, '天鹅到家': 188, '58到家': 148, ourPrice: 168 },
]

const priceHistory = [
  { month: '2026-01', '美团家政': 142, '天鹅到家': 160, '58到家': 135, ours: 145 },
  { month: '2026-02', '美团家政': 148, '天鹅到家': 165, '58到家': 138, ours: 150 },
  { month: '2026-03', '美团家政': 145, '天鹅到家': 158, '58到家': 132, ours: 148 },
  { month: '2026-04', '美团家政': 140, '天鹅到家': 155, '58到家': 130, ours: 145 },
  { month: '2026-05', '美团家政': 138, '天鹅到家': 152, '58到家': 128, ours: 142 },
  { month: '2026-06', '美团家政': 135, '天鹅到家': 150, '58到家': 125, ours: 140 },
]

const competitorRecords = [
  { id: 1, platform: '美团家政', district: '青秀区', service: '日常保洁', price: 145, date: '2026-06-15', change: -3 },
  { id: 2, platform: '天鹅到家', district: '青秀区', service: '深度清洁', price: 268, date: '2026-06-15', change: 0 },
  { id: 3, platform: '58到家', district: '良庆区', service: '日常保洁', price: 125, date: '2026-06-14', change: -5 },
  { id: 4, platform: '美团家政', district: '江南区', service: '开荒保洁', price: 295, date: '2026-06-14', change: 8 },
  { id: 5, platform: '天鹅到家', district: '西乡塘区', service: '家电清洗', price: 178, date: '2026-06-13', change: 0 },
  { id: 6, platform: '58到家', district: '兴宁区', service: '深度清洁', price: 208, date: '2026-06-13', change: -10 },
  { id: 7, platform: '美团家政', district: '邕宁区', service: '日常保洁', price: 118, date: '2026-06-12', change: 2 },
  { id: 8, platform: '天鹅到家', district: '武鸣区', service: '开荒保洁', price: 320, date: '2026-06-12', change: 0 },
]

export function CompetitivePage() {
  const [platformFilter, setPlatformFilter] = useState('all')

  return (
    <>
      {/* Platform Summary */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="grid grid-cols-3 gap-3">
          {platforms.map(p => (
            <Card key={p} className="glass-card">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="h-8 w-8 rounded-full" style={{ background: platformColors[p], opacity: 0.2 }}>
                  <div className="flex h-full items-center justify-center text-[12px] font-bold" style={{ color: platformColors[p] }}>
                    {p[0]}
                  </div>
                </div>
                <div>
                  <div className="text-[13px] font-medium text-text-primary">{p}</div>
                  <div className="text-[11px] text-text-muted">600+ 价格记录</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Price Comparison Chart */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
        <Card className="glass-card">
          <CardHeader><CardTitle>竞品价格对比（各服务类型均价）</CardTitle></CardHeader>
          <CardContent>
            <div className="chart-container h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={competitiveData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="service" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `¥${v}`} />
                  <Tooltip contentStyle={{ background: '#181a21', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="美团家政" fill="#e8a735" radius={[3, 3, 0, 0]} maxBarSize={24} />
                  <Bar dataKey="天鹅到家" fill="#5e6ad2" radius={[3, 3, 0, 0]} maxBarSize={24} />
                  <Bar dataKey="58到家" fill="#27a644" radius={[3, 3, 0, 0]} maxBarSize={24} />
                  <Bar dataKey="ourPrice" name="我们" fill="#7170ff" radius={[3, 3, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Latest Records */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}>
        <Card className="glass-card">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>最新竞品价格采集</CardTitle>
            <div className="flex gap-1">
              {['all', ...platforms].map(p => (
                <button key={p} onClick={() => setPlatformFilter(p)}
                  className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                    platformFilter === p ? 'bg-accent-muted text-accent-hover' : 'text-text-muted hover:bg-bg-hover'
                  }`}>
                  {p === 'all' ? '全部' : p}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border-subtle">
              {competitorRecords
                .filter(r => platformFilter === 'all' || r.platform === platformFilter)
                .map((r, i) => (
                <motion.div key={r.id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.03, duration: 0.25 }}
                  className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-bg-hover/50">
                  <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background: platformColors[r.platform] + '20', color: platformColors[r.platform] }}>
                    {r.platform[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-text-primary">
                      {r.service} · {r.district}
                    </div>
                    <div className="text-[11px] text-text-muted">{r.platform}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[14px] font-semibold text-text-primary">¥{r.price}</div>
                    <div className={`text-[10px] ${r.change > 0 ? 'text-danger' : r.change < 0 ? 'text-success' : 'text-text-subtle'}`}>
                      {r.change > 0 ? `+${r.change}` : r.change < 0 ? r.change : '持平'}
                    </div>
                  </div>
                  <span className="text-[10px] text-text-subtle">{r.date.slice(5)}</span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </>
  )
}
