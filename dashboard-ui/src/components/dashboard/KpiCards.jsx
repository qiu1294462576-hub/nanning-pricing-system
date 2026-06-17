import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { cn } from '@/lib/utils'

const kpiConfig = [
  { key: 'totalOrders', label: '累计订单', prefix: '', suffix: '', decimals: 0, growthKey: 'orderGrowth', color: '#00b8a9', inverse: false },
  { key: 'avgPrice', label: '平均客单价', prefix: '¥', suffix: '', decimals: 1, growthKey: 'priceGrowth', color: '#38bdf8', inverse: false },
  { key: 'avgMargin', label: '平均利润率', prefix: '', suffix: '%', decimals: 1, growthKey: 'marginGrowth', color: '#10b981', inverse: false },
  { key: 'lossRate', label: 'AI亏损率', prefix: '', suffix: '%', decimals: 1, growthKey: null, color: '#ef4444', inverse: true },
  { key: 'totalRevenue', label: '总营收', prefix: '¥', suffix: '万', decimals: 1, growthKey: 'revenueGrowth', color: '#8b7cf6', inverse: false },
  { key: 'totalProfit', label: '总利润', prefix: '¥', suffix: '万', decimals: 1, growthKey: null, color: '#f59e0b', inverse: false },
]

export function KpiCards({ data }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {kpiConfig.map((config, index) => (
        <motion.div
          key={config.key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <KpiCard config={config} data={data} />
        </motion.div>
      ))}
    </div>
  )
}

function KpiCard({ config, data }) {
  const value = data[config.key]
  const growth = config.growthKey ? data[config.growthKey] : null
  const isPositive = config.inverse ? growth <= 0 : growth > 0
  const growthColor = growth == null
    ? 'text-text-subtle'
    : isPositive
      ? 'text-success'
      : 'text-danger'

  return (
    <Card className="group cursor-default">
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">{config.label}</span>
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: config.color, opacity: 0.6 }}
          />
        </div>
        <div className="mb-1.5 text-[24px] font-bold tracking-tight text-text-primary">
          <AnimatedNumber
            value={value}
            prefix={config.prefix}
            suffix={config.suffix}
            decimals={config.decimals}
          />
        </div>
        {growth != null && (
          <div className={cn('flex items-center gap-1 text-[11px] font-medium', growthColor)}>
            {growth > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : growth < 0 ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            <span>{Math.abs(growth)}%</span>
            <span className="text-text-subtle">vs 上月</span>
          </div>
        )}
        {growth == null && config.key === 'lossRate' && (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-success">
            <span className="status-dot online inline-block h-1.5 w-1.5 rounded-full bg-success" />
            <span>AI模型运行正常</span>
          </div>
        )}
        {growth == null && config.key === 'totalProfit' && (
          <div className="flex items-center gap-1 text-[11px] text-text-muted">
            <span>利润率 {(data.totalProfit / data.totalRevenue * 100).toFixed(1)}%</span>
          </div>
        )}
      </div>
      <div
        className="h-[2px] w-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, ${config.color}, transparent)` }}
      />
    </Card>
  )
}
