import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const CHART_COLORS = ['#00b8a9', '#10b981', '#f59e0b', '#ef4444', '#8b7cf6', '#f472b6']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card-elevated p-3 shadow-xl">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-[12px]">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-text-secondary">{entry.name}:</span>
          <span className="font-semibold text-text-primary">
            {typeof entry.value === 'number'
              ? entry.value.toLocaleString('zh-CN', { maximumFractionDigits: 1 })
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

const tabOptions = [
  { key: '6m', label: '近6月' },
  { key: '12m', label: '近12月' },
  { key: 'all', label: '全部' },
]

export function TrendChart({ data }) {
  const [range, setRange] = useState('6m')
  const sliced = range === '6m' ? data.slice(-6) : range === '12m' ? data.slice(-12) : data

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>月度趋势</CardTitle>
          <div className="flex gap-0.5">
            {tabOptions.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setRange(tab.key)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                  range === tab.key
                    ? 'bg-accent-muted text-accent'
                    : 'text-text-muted hover:bg-bg-hover hover:text-text-secondary'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="chart-container h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sliced} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00b8a9" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#00b8a9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="orderGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                  tickLine={false}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis
                  yAxisId="price"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  domain={['dataMin - 10', 'dataMax + 10']}
                  tickFormatter={(v) => `¥${v}`}
                />
                <YAxis
                  yAxisId="orders"
                  orientation="right"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  yAxisId="price"
                  type="monotone"
                  dataKey="avgPrice"
                  name="客单价"
                  stroke="#00b8a9"
                  strokeWidth={2}
                  fill="url(#priceGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#00b8a9', stroke: '#111318', strokeWidth: 2 }}
                />
                <Area
                  yAxisId="orders"
                  type="monotone"
                  dataKey="orderCount"
                  name="订单量"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#orderGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#10b981', stroke: '#111318', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center justify-center gap-6 text-[11px] text-text-muted">
            <div className="flex items-center gap-1.5">
              <span className="h-[2px] w-4 rounded-full" style={{ background: '#00b8a9' }} />
              客单价 (¥)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-[2px] w-4 rounded-full" style={{ background: '#10b981' }} />
              订单量
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function DistrictChart({ data }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="h-full">
        <CardHeader>
          <CardTitle>区域均价对比</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="chart-container h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 0, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `¥${v}`}
                />
                <YAxis
                  type="category"
                  dataKey="district"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={65}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="avgPrice"
                  name="均价"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={18}
                >
                  {data.map((_, index) => (
                    <Cell
                      key={index}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      fillOpacity={0.75}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function ServiceChart({ data }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="h-full">
        <CardHeader>
          <CardTitle>服务类型分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="chart-container h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="orders"
                  nameKey="service"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  stroke="none"
                >
                  {data.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {data.map((item, i) => (
              <div key={item.service} className="flex items-center gap-2 text-[11px]">
                <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i] }} />
                <span className="text-text-secondary">{item.service}</span>
                <span className="ml-auto font-medium text-text-muted">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
