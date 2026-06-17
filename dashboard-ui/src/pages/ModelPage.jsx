import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { aiVsLegacy } from '@/data/mock-data'

const featureImportance = [
  { feature: '服务类型', importance: 0.18 },
  { feature: '区域等级', importance: 0.15 },
  { feature: '技能等级', importance: 0.12 },
  { feature: '季节因子', importance: 0.11 },
  { feature: '供需比', importance: 0.10 },
  { feature: '竞品均价', importance: 0.09 },
  { feature: '历史价格', importance: 0.08 },
  { feature: '社区层级', importance: 0.07 },
  { feature: '节假日', importance: 0.05 },
  { feature: '时段', importance: 0.05 },
]

const radarData = [
  { metric: '准确率', ai: 92, legacy: 45 },
  { metric: '利润率', ai: 88, legacy: 35 },
  { metric: '亏损控制', ai: 100, legacy: 53 },
  { metric: '响应速度', ai: 95, legacy: 70 },
  { metric: '区域覆盖', ai: 85, legacy: 60 },
  { metric: '季节适应', ai: 90, legacy: 40 },
]

const modelMetrics = [
  { label: 'MAPE', value: '30.40%', desc: '平均绝对百分比误差', good: true },
  { label: 'R² Score', value: '0.847', desc: '模型决定系数', good: true },
  { label: '训练样本', value: '12,732', desc: '历史订单数据量', good: true },
  { label: '特征数', value: '25', desc: '模型输入维度', good: false },
  { label: '亏损率', value: '0%', desc: 'AI定价亏损订单占比', good: true },
  { label: '平均利润率', value: '38.21%', desc: 'AI定价平均毛利率', good: true },
]

export function ModelPage() {
  return (
    <>
      {/* Model Status */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-success-muted text-[20px]">🤖</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-semibold text-text-primary">XGBoost 定价模型 v3.2</span>
                <Badge variant="success">运行中</Badge>
              </div>
              <div className="mt-0.5 text-[12px] text-text-muted">最近训练: 2026-06-01 · 训练耗时: 4.2s · 模型大小: 2.8MB</div>
            </div>
            <button className="rounded-[var(--radius-md)] border border-border-default px-4 py-2 text-[12px] font-medium text-text-secondary hover:bg-bg-hover">
              重新训练
            </button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Key Metrics */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {modelMetrics.map((m, i) => (
            <Card key={i} className="glass-card">
              <CardContent className="py-3">
                <div className="text-[10px] text-text-subtle">{m.label}</div>
                <div className="mt-0.5 text-[18px] font-semibold text-text-primary">{m.value}</div>
                <div className="text-[10px] text-text-muted">{m.desc}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* AI vs Legacy */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}>
          <Card className="glass-card h-full">
            <CardHeader><CardTitle>AI vs 传统模型对比</CardTitle></CardHeader>
            <CardContent>
              <div className="chart-container h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.06)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                    <Radar name="AI模型" dataKey="ai" stroke="#5e6ad2" fill="#5e6ad2" fillOpacity={0.2} strokeWidth={2} />
                    <Radar name="传统模型" dataKey="legacy" stroke="#e5484d" fill="#e5484d" fillOpacity={0.1} strokeWidth={2} />
                    <Tooltip contentStyle={{ background: '#181a21', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex justify-center gap-6 text-[11px]">
                <div className="flex items-center gap-1.5"><span className="h-[3px] w-4 rounded-full bg-[#5e6ad2]" />AI模型</div>
                <div className="flex items-center gap-1.5"><span className="h-[3px] w-4 rounded-full bg-[#e5484d]" />传统模型</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Feature Importance */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.4 }}>
          <Card className="glass-card h-full">
            <CardHeader><CardTitle>特征重要性排名 (Top 10)</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {featureImportance.map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-[65px] flex-shrink-0 text-right text-[11px] text-text-secondary">{f.feature}</span>
                    <div className="flex-1">
                      <div className="relative h-4 overflow-hidden rounded-full bg-bg-elevated">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(f.importance / 0.18) * 100}%` }}
                          transition={{ delay: 0.3 + i * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{ background: i < 3 ? 'linear-gradient(90deg, #5e6ad2, #7170ff)' : 'rgba(94,106,210,0.4)' }}
                        />
                      </div>
                    </div>
                    <span className="w-[40px] flex-shrink-0 text-right text-[11px] font-mono text-text-muted">
                      {(f.importance * 100).toFixed(1)}%
                    </span>
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
