import { motion } from 'framer-motion'
import { KpiCards } from '@/components/dashboard/KpiCards'
import { TrendChart, DistrictChart, ServiceChart } from '@/components/dashboard/TrendChart'
import { TaskList } from '@/components/dashboard/TaskList'
import { TeamStatus } from '@/components/dashboard/TeamStatus'
import { Notifications } from '@/components/dashboard/Notifications'
import {
  kpiData, monthlyTrend, districtBreakdown,
  serviceBreakdown, tasks,
} from '@/data/mock-data'

export function DashboardPage() {
  return (
    <>
      <KpiCards data={kpiData} />
      <TrendChart data={monthlyTrend} />
      <div className="grid gap-4 lg:grid-cols-2">
        <DistrictChart data={districtBreakdown} />
        <ServiceChart data={serviceBreakdown} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <TaskList tasks={tasks} />
        <TeamStatus members={[]} />
        <Notifications notifications={[]} />
      </div>
    </>
  )
}
