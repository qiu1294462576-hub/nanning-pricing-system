import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { DashboardPage } from '@/pages/DashboardPage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { PricingPage } from '@/pages/PricingPage'
import { CostQueryPage } from '@/pages/CostQueryPage'
import { CompetitivePage } from '@/pages/CompetitivePage'
import { OrdersPage } from '@/pages/OrdersPage'
import { TeamPage } from '@/pages/TeamPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { ModelPage } from '@/pages/ModelPage'
import { SettingsPage } from '@/pages/SettingsPage'

const pageMap = {
  dashboard: { title: '数据看板', component: DashboardPage },
  analytics: { title: '经营分析', component: AnalyticsPage },
  pricing: { title: '智能定价', component: PricingPage },
  cost: { title: '成本核算', component: CostQueryPage },
  competitive: { title: '竞品数据', component: CompetitivePage },
  orders: { title: '订单审核', component: OrdersPage },
  team: { title: '团队管理', component: TeamPage },
  notifications: { title: '消息通知', component: NotificationsPage },
  model: { title: 'AI 模型', component: ModelPage },
  settings: { title: '参数配置', component: SettingsPage },
}

function App() {
  const [activeNav, setActiveNav] = useState('dashboard')
  const unreadCount = 0
  const currentPage = pageMap[activeNav] || pageMap.dashboard
  const PageComponent = currentPage.component

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      <Sidebar activeItem={activeNav} onItemClick={setActiveNav} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={currentPage.title} unreadCount={unreadCount} onNavigate={setActiveNav} />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1440px] space-y-4 p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeNav}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="space-y-4">
                  <PageComponent />
                </div>
              </motion.div>
            </AnimatePresence>

            <footer className="flex items-center justify-between border-t border-border-subtle pt-4 pb-2 text-[11px] text-text-subtle">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                <span>南宁家政智能定价系统 v2.0</span>
                <span className="text-text-subtle">·</span>
                <span>AI模型已加载</span>
                <span className="text-text-subtle">·</span>
                <span>数据更新于 2026-06-16 10:30</span>
              </div>
              <span className="font-mono text-[10px]">XGBoost v3.2 · MAPE 30.40%</span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
