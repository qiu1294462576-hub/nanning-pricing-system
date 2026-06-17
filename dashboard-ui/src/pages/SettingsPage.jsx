import { useState } from 'react'
import { motion } from 'framer-motion'
import { Save, RotateCcw } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const configSections = [
  {
    title: '区域溢价系数',
    description: '各区域的定价溢价倍率，影响最终定价上限',
    fields: [
      { key: 'qx', label: '青秀区', value: 1.15, type: 'number', step: 0.05, min: 0.8, max: 1.5 },
      { key: 'lq', label: '良庆区', value: 1.10, type: 'number', step: 0.05, min: 0.8, max: 1.5 },
      { key: 'jn', label: '江南区', value: 1.00, type: 'number', step: 0.05, min: 0.8, max: 1.5 },
      { key: 'xxt', label: '西乡塘区', value: 1.00, type: 'number', step: 0.05, min: 0.8, max: 1.5 },
      { key: 'xn', label: '兴宁区', value: 1.00, type: 'number', step: 0.05, min: 0.8, max: 1.5 },
      { key: 'yn', label: '邕宁区', value: 1.10, type: 'number', step: 0.05, min: 0.8, max: 1.5 },
      { key: 'wm', label: '武鸣区', value: 1.25, type: 'number', step: 0.05, min: 0.8, max: 1.5 },
    ],
  },
  {
    title: '季节定价倍率',
    description: '节假日和特殊时期的定价倍率',
    fields: [
      { key: 'spring', label: '春节', value: 4.0, type: 'number', step: 0.5, min: 1, max: 6 },
      { key: 'sanyuesan', label: '三月三', value: 3.0, type: 'number', step: 0.5, min: 1, max: 5 },
      { key: 'huinantian', label: '回南天', value: 2.5, type: 'number', step: 0.5, min: 1, max: 4 },
      { key: 'summer', label: '暑期', value: 1.3, type: 'number', step: 0.1, min: 1, max: 2 },
      { key: 'national', label: '国庆', value: 2.0, type: 'number', step: 0.5, min: 1, max: 4 },
    ],
  },
  {
    title: '成本结构比例',
    description: '定价模型中的成本占比参数',
    fields: [
      { key: 'labor', label: '人工成本占比', value: 65, type: 'number', step: 1, min: 50, max: 80, suffix: '%' },
      { key: 'material', label: '材料成本占比', value: 10, type: 'number', step: 1, min: 5, max: 20, suffix: '%' },
      { key: 'transport', label: '交通成本占比', value: 8, type: 'number', step: 1, min: 3, max: 15, suffix: '%' },
      { key: 'mgmt', label: '管理费用占比', value: 7, type: 'number', step: 1, min: 3, max: 15, suffix: '%' },
      { key: 'risk', label: '风险准备金', value: 10, type: 'number', step: 1, min: 5, max: 20, suffix: '%' },
    ],
  },
  {
    title: 'AI模型参数',
    description: 'XGBoost 模型的超参数配置',
    fields: [
      { key: 'learning_rate', label: '学习率', value: 0.1, type: 'number', step: 0.01, min: 0.01, max: 0.5 },
      { key: 'max_depth', label: '最大深度', value: 6, type: 'number', step: 1, min: 2, max: 12 },
      { key: 'n_estimators', label: '迭代次数', value: 200, type: 'number', step: 50, min: 50, max: 500 },
      { key: 'target_margin', label: '目标利润率', value: 30, type: 'number', step: 5, min: 15, max: 50, suffix: '%' },
    ],
  },
]

export function SettingsPage() {
  const [config, setConfig] = useState(() => {
    const init = {}
    configSections.forEach(s => s.fields.forEach(f => { init[f.key] = f.value }))
    return init
  })
  const [saved, setSaved] = useState(false)

  function updateValue(key, val) {
    setConfig(prev => ({ ...prev, [key]: val }))
    setSaved(false)
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleReset() {
    const init = {}
    configSections.forEach(s => s.fields.forEach(f => { init[f.key] = f.value }))
    setConfig(init)
    setSaved(false)
  }

  return (
    <>
      {/* Save Bar */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-border-default bg-bg-surface px-5 py-3">
          <span className="text-[13px] text-text-secondary">系统参数配置</span>
          <div className="flex gap-2">
            <button onClick={handleReset}
              className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border-default px-3 py-1.5 text-[12px] text-text-muted hover:bg-bg-hover">
              <RotateCcw className="h-3 w-3" /> 恢复默认
            </button>
            <button onClick={handleSave}
              className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-accent px-4 py-1.5 text-[12px] font-medium text-white hover:bg-accent-hover">
              <Save className="h-3 w-3" /> {saved ? '已保存 ✓' : '保存配置'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Config Sections */}
      {configSections.map((section, si) => (
        <motion.div key={section.title}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 + si * 0.08, duration: 0.4 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>{section.title}</CardTitle>
                <Badge variant="default">{section.fields.length} 项</Badge>
              </div>
              <p className="text-[11px] text-text-subtle">{section.description}</p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {section.fields.map(field => (
                  <div key={field.key} className="flex items-center gap-3 rounded-[var(--radius-md)] bg-bg-elevated/40 px-3 py-2.5">
                    <label className="min-w-[100px] text-[12px] text-text-secondary">{field.label}</label>
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="number"
                        value={config[field.key]}
                        step={field.step}
                        min={field.min}
                        max={field.max}
                        onChange={e => updateValue(field.key, parseFloat(e.target.value))}
                        className="h-7 w-full rounded-[var(--radius-sm)] border border-border-default bg-bg-surface px-2.5 text-right text-[13px] font-mono text-text-primary outline-none transition-colors focus:border-accent"
                      />
                      {field.suffix && <span className="text-[11px] text-text-subtle">{field.suffix}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </>
  )
}
