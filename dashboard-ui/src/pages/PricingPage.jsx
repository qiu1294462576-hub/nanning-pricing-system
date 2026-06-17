import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calculator, MapPin, Wrench, Star, Sparkles, ChevronRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { districtBreakdown, serviceBreakdown } from '@/data/mock-data'

const serviceTypes = [
  { key: 'daily', label: '日常保洁', icon: '🧹', baseRate: 45, unit: '小时' },
  { key: 'deep', label: '深度清洁', icon: '✨', baseRate: 80, unit: '小时' },
  { key: 'renovation', label: '开荒保洁', icon: '🏗️', baseRate: 12, unit: '㎡' },
  { key: 'appliance', label: '家电清洗', icon: '🔧', baseRate: 120, unit: '台' },
]

const skillLevels = [
  { key: 'novice', label: '新手', multiplier: 1.0, color: 'default' },
  { key: 'skilled', label: '熟练', multiplier: 1.25, color: 'info' },
  { key: 'gold', label: '金牌', multiplier: 1.55, color: 'accent' },
]

export function PricingPage() {
  const [service, setService] = useState('daily')
  const [district, setDistrict] = useState('青秀区')
  const [level, setLevel] = useState('skilled')
  const [quantity, setQuantity] = useState(3)
  const [result, setResult] = useState(null)

  function calculate() {
    const svc = serviceTypes.find(s => s.key === service)
    const dst = districtBreakdown.find(d => d.district === district)
    const lvl = skillLevels.find(l => l.key === level)
    const baseCost = svc.baseRate * quantity
    const costFloor = baseCost * 1.35
    const marketAnchor = baseCost * 1.8
    const aiDynamic = costFloor * lvl.multiplier * (dst?.premium || 1.0) * 1.08
    const final = Math.max(costFloor, Math.min(aiDynamic, marketAnchor))
    setResult({
      baseCost,
      costFloor: Math.round(costFloor),
      marketAnchor: Math.round(marketAnchor),
      aiPrice: Math.round(aiDynamic),
      finalPrice: Math.round(final),
      margin: ((final - costFloor) / final * 100).toFixed(1),
    })
  }

  const fadeIn = (delay = 0) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  })

  return (
    <>
      <motion.div {...fadeIn()}>
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent-hover" />
            <CardTitle>智能定价计算器</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Input Section */}
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-[12px] font-medium text-text-secondary">服务类型</label>
                  <div className="grid grid-cols-2 gap-2">
                    {serviceTypes.map(s => (
                      <button
                        key={s.key}
                        onClick={() => setService(s.key)}
                        className={`flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2.5 text-left text-[13px] transition-all ${
                          service === s.key
                            ? 'border-accent bg-accent-muted text-accent-hover'
                            : 'border-border-default bg-bg-elevated/50 text-text-muted hover:border-border-strong hover:text-text-secondary'
                        }`}
                      >
                        <span>{s.icon}</span>
                        <div>
                          <div className="font-medium">{s.label}</div>
                          <div className="text-[10px] text-text-subtle">¥{s.baseRate}/{s.unit}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-medium text-text-secondary">服务区域</label>
                  <div className="flex flex-wrap gap-1.5">
                    {districtBreakdown.map(d => (
                      <button
                        key={d.district}
                        onClick={() => setDistrict(d.district)}
                        className={`rounded-full border px-3 py-1 text-[12px] transition-all ${
                          district === d.district
                            ? 'border-accent bg-accent-muted text-accent-hover'
                            : 'border-border-default text-text-muted hover:border-border-strong'
                        }`}
                      >
                        {d.district}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-medium text-text-secondary">技能等级</label>
                  <div className="flex gap-2">
                    {skillLevels.map(l => (
                      <button
                        key={l.key}
                        onClick={() => setLevel(l.key)}
                        className={`flex-1 rounded-[var(--radius-md)] border px-3 py-2 text-center text-[13px] transition-all ${
                          level === l.key
                            ? 'border-accent bg-accent-muted text-accent-hover'
                            : 'border-border-default text-text-muted hover:border-border-strong'
                        }`}
                      >
                        {l.label}
                        <div className="text-[10px] text-text-subtle">×{l.multiplier}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-medium text-text-secondary">
                    数量: <span className="text-accent-hover">{quantity}</span>
                    <span className="ml-1 text-text-subtle">{serviceTypes.find(s => s.key === service)?.unit}</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={quantity}
                    onChange={e => setQuantity(Number(e.target.value))}
                    className="w-full accent-[var(--color-accent)]"
                  />
                </div>

                <button
                  onClick={calculate}
                  className="w-full rounded-[var(--radius-md)] bg-accent py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-accent-hover active:scale-[0.98]"
                >
                  AI 智能定价
                </button>
              </div>

              {/* Result Section */}
              <div className="flex flex-col justify-center">
                {result ? (
                  <motion.div
                    key={JSON.stringify(result)}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-3"
                  >
                    <div className="rounded-[var(--radius-lg)] border border-border-default bg-bg-elevated p-5 text-center">
                      <div className="mb-1 text-[11px] text-text-muted">AI 建议定价</div>
                      <div className="text-[36px] font-bold tracking-tight text-text-primary">
                        <AnimatedNumber value={result.finalPrice} prefix="¥" />
                      </div>
                      <div className="mt-1 text-[12px] text-success">
                        预计利润率 {result.margin}%
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-[var(--radius-md)] bg-bg-elevated/60 p-3">
                        <div className="text-[10px] text-text-subtle">成本底线</div>
                        <div className="mt-0.5 text-[14px] font-semibold text-text-secondary">¥{result.costFloor}</div>
                      </div>
                      <div className="rounded-[var(--radius-md)] bg-bg-elevated/60 p-3">
                        <div className="text-[10px] text-text-subtle">AI 动态价</div>
                        <div className="mt-0.5 text-[14px] font-semibold text-accent-hover">¥{result.aiPrice}</div>
                      </div>
                      <div className="rounded-[var(--radius-md)] bg-bg-elevated/60 p-3">
                        <div className="text-[10px] text-text-subtle">市场天花板</div>
                        <div className="mt-0.5 text-[14px] font-semibold text-text-secondary">¥{result.marketAnchor}</div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border-default p-8 text-center text-[13px] text-text-muted">
                    选择参数后点击"AI 智能定价"按钮查看定价结果
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pricing Factor Analysis */}
      <motion.div {...fadeIn(0.15)}>
        <Card>
          <CardHeader>
            <CardTitle>四层定价模型</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
              {[
                { layer: '第一层', name: '成本兜底', desc: '四级成本分摊模型', icon: '📊', color: 'info' },
                { layer: '第二层', name: '市场锚定', desc: '竞品价格×1.3上限', icon: '🎯', color: 'warning' },
                { layer: '第三层', name: 'AI动态调价', desc: 'XGBoost 25维特征', icon: '🤖', color: 'accent' },
                { layer: '第四层', name: '规则校验', desc: '区域/季节/供需修正', icon: '⚖️', color: 'success' },
              ].map((item, i) => (
                <div key={i} className="rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated/40 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-[18px]">{item.icon}</span>
                    <Badge variant={item.color}>{item.layer}</Badge>
                  </div>
                  <div className="text-[14px] font-semibold text-text-primary">{item.name}</div>
                  <div className="mt-1 text-[11px] text-text-muted">{item.desc}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </>
  )
}
