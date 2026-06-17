import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, ArrowUpDown } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const costItems = [
  { id: 'c1', name: '基础人工工资', category: '直接成本', value: 45, unit: '元/小时', note: '南宁市最低工资标准上浮20%' },
  { id: 'c2', name: '社保公积金', category: '直接成本', value: 12.6, unit: '元/小时', note: '按基础工资的28%计提' },
  { id: 'c3', name: '清洁材料费', category: '直接成本', value: 8, unit: '元/次', note: '含清洁剂、工具折旧' },
  { id: 'c4', name: '交通补贴', category: '直接成本', value: 15, unit: '元/次', note: '城区内平均交通费' },
  { id: 'c5', name: '管理人员分摊', category: '间接成本', value: 6.5, unit: '元/小时', note: '管理人员工资÷服务工时' },
  { id: 'c6', name: '场地租金分摊', category: '间接成本', value: 3.2, unit: '元/小时', note: '办公场地按服务面积分摊' },
  { id: 'c7', name: '系统运维费', category: '间接成本', value: 1.8, unit: '元/单', note: 'IT系统+定价模型运维' },
  { id: 'c8', name: '风险准备金', category: '风险缓冲', value: 7.1, unit: '元/小时', note: '直接成本的10%作为风险缓冲' },
  { id: 'c9', name: '目标利润', category: '利润', value: 22.5, unit: '元/小时', note: '目标利润率25-35%' },
  { id: 'c10', name: '保险费', category: '直接成本', value: 2.5, unit: '元/小时', note: '雇主责任险+第三方责任险' },
]

const categoryColors = {
  '直接成本': 'info',
  '间接成本': 'warning',
  '风险缓冲': 'danger',
  '利润': 'success',
}

export function CostQueryPage() {
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [sortField, setSortField] = useState('value')
  const [sortDir, setSortDir] = useState('desc')

  const categories = ['all', ...new Set(costItems.map(c => c.category))]
  let items = costItems.filter(c =>
    (filterCat === 'all' || c.category === filterCat) &&
    c.name.includes(search)
  )
  items.sort((a, b) => sortDir === 'desc' ? b[sortField] - a[sortField] : a[sortField] - b[sortField])

  const totalDirect = costItems.filter(c => c.category === '直接成本').reduce((s, c) => s + c.value, 0)
  const totalIndirect = costItems.filter(c => c.category === '间接成本').reduce((s, c) => s + c.value, 0)
  const totalRisk = costItems.filter(c => c.category === '风险缓冲').reduce((s, c) => s + c.value, 0)
  const totalProfit = costItems.filter(c => c.category === '利润').reduce((s, c) => s + c.value, 0)

  return (
    <>
      {/* Cost Summary Cards */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: '直接成本', value: totalDirect, color: 'info', unit: '元/时' },
            { label: '间接成本', value: totalIndirect, color: 'warning', unit: '元/时' },
            { label: '风险缓冲', value: totalRisk, color: 'danger', unit: '元/时' },
            { label: '目标利润', value: totalProfit, color: 'success', unit: '元/时' },
          ].map((item, i) => (
            <Card key={i} className="glass-card">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-text-muted">{item.label}</span>
                  <Badge variant={item.color}>{item.unit}</Badge>
                </div>
                <div className="mt-1 text-[22px] font-semibold text-text-primary">¥{item.value.toFixed(1)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Cost Table */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
        <Card className="glass-card">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>成本参数明细</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-subtle" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="搜索参数..."
                  className="h-7 rounded-[var(--radius-sm)] border border-border-default bg-bg-elevated/50 pl-8 pr-3 text-[12px] text-text-primary outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
                />
              </div>
              <button onClick={() => { setSortDir(d => d === 'desc' ? 'asc' : 'desc') }}
                className="flex h-7 items-center gap-1 rounded-[var(--radius-sm)] border border-border-default px-2 text-[11px] text-text-muted hover:bg-bg-hover">
                <ArrowUpDown className="h-3 w-3" /> 金额
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex gap-1.5 px-5 pb-3">
              {categories.map(cat => (
                <button key={cat} onClick={() => setFilterCat(cat)}
                  className={`rounded-full px-3 py-1 text-[11px] transition-all ${
                    filterCat === cat ? 'bg-accent-muted text-accent-hover' : 'text-text-muted hover:bg-bg-hover'
                  }`}>
                  {cat === 'all' ? '全部' : cat}
                </button>
              ))}
            </div>
            <div className="divide-y divide-border-subtle">
              {items.map((item, i) => (
                <motion.div key={item.id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.03, duration: 0.25 }}
                  className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-bg-hover/50">
                  <Badge variant={categoryColors[item.category]}>{item.category}</Badge>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-text-primary">{item.name}</div>
                    <div className="text-[11px] text-text-muted">{item.note}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[15px] font-semibold text-text-primary">¥{item.value}</div>
                    <div className="text-[10px] text-text-subtle">{item.unit}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </>
  )
}
