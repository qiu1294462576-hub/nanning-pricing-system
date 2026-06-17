import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, AreaChart, Area,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { districtBreakdown, serviceBreakdown, monthlyTrend } from '@/data/mock-data'

const analysisData = monthlyTrend.map(m => ({
  ...m,
  revenuePerOrder: (m.revenue / m.orderCount * 10000).toFixed(1),
  profitEstimate: (m.revenue * 0.382).toFixed(1),
}))

const marginDistribution = [
  { range: '<20%', count: 320, color: '#ef4444' },
  { range: '20-30%', count: 1850, color: '#f59e0b' },
  { range: '30-40%', count: 4520, color: '#10b981' },
  { range: '40-50%', count: 3840, color: '#00b8a9' },
  { range: '>50%', count: 2202, color: '#8b7cf6' },
]

export function AnalyticsPage() {
  const [period, setPeriod] = useState('6m')
  const sliced = period === '6m' ? analysisData.slice(-6) : period === '12m' ? analysisData.slice(-12) : analysisData

  const totalRevenue = sliced.reduce((s, d) => s + d.revenue, 0)
  const totalProfit = sliced.reduce((s, d) => s + parseFloat(d.profitEstimate), 0)
  const avgOrderPrice = (sliced.reduce((s, d) => s + d.avgPrice, 0) / sliced.length).toFixed(1)

  return (
    <>
      {/* Summary Row */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: '总营收', value: totalRevenue, prefix: '¥', suffix: '万', decimals: 1 },
            { label: '总利润', value: totalProfit, prefix: '¥', suffix: '万', decimals: 1 },
            { label: '平均客单价', value: parseFloat(avgOrderPrice), prefix: '¥', decimals: 1 },
            { label: '订单总量', value: sliced.reduce((s, d) => s + d.orderCount, 0), suffix: '单' },
          ].map((item, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="text-[11px] text-text-muted">{item.label}</div>
                <div className="mt-1 text-[22px] font-semibold text-text-primary">
                  <AnimatedNumber value={item.value} prefix={item.prefix || ''} suffix={item.suffix || ''} decimals={item.decimals || 0} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Revenue + Profit Trend */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>营收与利润趋势</CardTitle>
            <div className="flex gap-1">
              {['6m', '12m', 'all'].map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`rounded-[var(--radius-sm)] px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    period === p ? 'bg-accent-muted text-accent-hover' : 'text-text-muted hover:bg-bg-hover'
                  }`}>
                  {p === '6m' ? '近6月' : p === '12m' ? '近12月' : '全部'}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="chart-container h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sliced} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00b8a9" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#00b8a9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}万`} />
                  <Tooltip contentStyle={{ background: '#181a21', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#9ca3af' }} />
                  <Area type="monotone" dataKey="revenue" name="营收(万)" stroke="#00b8a9" strokeWidth={2} fill="url(#revGrad)" dot={false} />
                  <Area type="monotone" dataKey="profitEstimate" name="利润(万)" stroke="#10b981" strokeWidth={2} fill="url(#profGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Two column: Margin Distribution + District Performance */}
      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}>
          <Card className="h-full">
            <CardHeader><CardTitle>利润率分布</CardTitle></CardHeader>
            <CardContent>
              <div className="chart-container h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={marginDistribution} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="range" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#181a21', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" name="订单数" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {marginDistribution.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.8} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.4 }}>
          <Card className="h-full">
            <CardHeader><CardTitle>区域经营对比</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {districtBreakdown.map((d, i) => (
                  <div key={d.district} className="flex items-center gap-3">
                    <span className="w-[65px] flex-shrink-0 text-[12px] text-text-secondary">{d.district}</span>
                    <div className="flex-1">
                      <div className="relative h-5 overflow-hidden rounded-full bg-bg-elevated">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(d.orders / 3000) * 100}%` }}
                          transition={{ delay: 0.3 + i * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{ background: `linear-gradient(90deg, #00b8a9, #8b7cf6)` }}
                        />
                      </div>
                    </div>
                    <span className="w-[50px] flex-shrink-0 text-right text-[12px] font-medium text-text-primary">{d.orders}</span>
                    <Badge variant={i === 0 ? 'accent' : 'default'}>{d.tier}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  )
}
