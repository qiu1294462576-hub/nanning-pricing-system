// ═══════════════════════════════════════════════════════════════
// 南宁家政智能定价系统 — Mock Dashboard Data
// Based on real data models from nanning_pricing_system1to5
// ═══════════════════════════════════════════════════════════════

export const kpiData = {
  totalOrders: 12732,
  avgPrice: 186.4,
  avgMargin: 38.21,
  lossRate: 0.0,
  totalRevenue: 237.4,    // 万元
  totalProfit: 90.7,      // 万元
  orderGrowth: 12.3,
  priceGrowth: 4.8,
  marginGrowth: 6.2,
  revenueGrowth: 18.7,
}

export const monthlyTrend = [
  { month: '2025-01', avgPrice: 172.3, orderCount: 820, revenue: 14.1 },
  { month: '2025-02', avgPrice: 210.5, orderCount: 1150, revenue: 24.2 },
  { month: '2025-03', avgPrice: 195.8, orderCount: 980, revenue: 19.2 },
  { month: '2025-04', avgPrice: 178.2, orderCount: 1050, revenue: 18.7 },
  { month: '2025-05', avgPrice: 182.6, orderCount: 1120, revenue: 20.5 },
  { month: '2025-06', avgPrice: 168.9, orderCount: 920, revenue: 15.5 },
  { month: '2025-07', avgPrice: 175.4, orderCount: 1180, revenue: 20.7 },
  { month: '2025-08', avgPrice: 189.2, orderCount: 1250, revenue: 23.7 },
  { month: '2025-09', avgPrice: 183.7, orderCount: 1080, revenue: 19.8 },
  { month: '2025-10', avgPrice: 191.3, orderCount: 1320, revenue: 25.3 },
  { month: '2025-11', avgPrice: 186.8, orderCount: 1150, revenue: 21.5 },
  { month: '2025-12', avgPrice: 194.1, orderCount: 1050, revenue: 20.4 },
  { month: '2026-01', avgPrice: 198.5, orderCount: 1280, revenue: 25.4 },
  { month: '2026-02', avgPrice: 225.8, orderCount: 1450, revenue: 32.7 },
  { month: '2026-03', avgPrice: 201.2, orderCount: 1180, revenue: 23.7 },
  { month: '2026-04', avgPrice: 188.6, orderCount: 1220, revenue: 23.0 },
  { month: '2026-05', avgPrice: 192.4, orderCount: 1310, revenue: 25.2 },
]

export const districtBreakdown = [
  { district: '青秀区', avgPrice: 215.3, orders: 2850, tier: '高端', premium: 1.15 },
  { district: '良庆区', avgPrice: 198.7, orders: 2240, tier: '中高端', premium: 1.10 },
  { district: '江南区', avgPrice: 182.4, orders: 1980, tier: '中端', premium: 1.00 },
  { district: '西乡塘区', avgPrice: 178.6, orders: 1850, tier: '中端', premium: 1.00 },
  { district: '兴宁区', avgPrice: 175.2, orders: 1620, tier: '中端', premium: 1.00 },
  { district: '邕宁区', avgPrice: 168.9, orders: 1240, tier: '中低端', premium: 1.10 },
  { district: '武鸣区', avgPrice: 155.3, orders: 952, tier: '低端', premium: 1.25 },
]

export const serviceBreakdown = [
  { service: '日常保洁', orders: 5230, avgPrice: 142.5, percentage: 41.1 },
  { service: '深度清洁', orders: 3420, avgPrice: 228.8, percentage: 26.9 },
  { service: '开荒保洁', orders: 2180, avgPrice: 315.2, percentage: 17.1 },
  { service: '家电清洗', orders: 1902, avgPrice: 168.6, percentage: 14.9 },
]

export const aiVsLegacy = {
  aiLossRate: 0,
  legacyLossRate: 46.84,
  aiAvgMargin: 38.21,
  legacyAvgMargin: 12.4,
  aiMape: 30.40,
  legacyMape: 68.5,
}

export const tasks = [
  {
    id: 't1',
    title: '青秀区春季定价策略调整',
    description: '根据市场竞争变化，调整青秀区深度清洁服务的定价系数',
    priority: 'high',
    status: 'in_progress',
    assignee: '李明',
    dueDate: '2026-06-18',
    tags: ['定价策略', '青秀区'],
  },
  {
    id: 't2',
    title: '竞品价格数据采集更新',
    description: '美团平台接口变更，需要更新爬虫脚本并重新采集数据',
    priority: 'high',
    status: 'todo',
    assignee: '张伟',
    dueDate: '2026-06-20',
    tags: ['数据采集', '技术'],
  },
  {
    id: 't3',
    title: 'XGBoost模型月度重训练',
    description: '使用最新订单数据重新训练AI定价模型，更新特征权重',
    priority: 'medium',
    status: 'todo',
    assignee: '王芳',
    dueDate: '2026-06-25',
    tags: ['AI模型', '月度任务'],
  },
  {
    id: 't4',
    title: '邕宁区新客户报价审核',
    description: '审核邕宁区3个新社区的开荒保洁报价方案',
    priority: 'medium',
    status: 'in_review',
    assignee: '陈静',
    dueDate: '2026-06-17',
    tags: ['报价审核', '邕宁区'],
  },
  {
    id: 't5',
    title: '端午节定价系数配置',
    description: '配置端午节期间的节假日定价倍率和供应调整参数',
    priority: 'low',
    status: 'done',
    assignee: '李明',
    dueDate: '2026-06-10',
    tags: ['节假日', '参数配置'],
  },
  {
    id: 't6',
    title: '月度经营分析报告',
    description: '汇总5月份各区域、各服务类型的经营数据，生成分析报告',
    priority: 'medium',
    status: 'in_progress',
    assignee: '王芳',
    dueDate: '2026-06-19',
    tags: ['报告', '月度'],
  },
]

export const teamMembers = [
  {
    id: 'm1',
    name: '李明',
    role: '定价策略经理',
    avatar: null,
    status: 'online',
    currentTask: '青秀区春季定价策略调整',
    tasksCompleted: 24,
  },
  {
    id: 'm2',
    name: '张伟',
    role: '数据工程师',
    avatar: null,
    status: 'online',
    currentTask: '竞品价格数据采集更新',
    tasksCompleted: 31,
  },
  {
    id: 'm3',
    name: '王芳',
    role: '数据分析师',
    avatar: null,
    status: 'busy',
    currentTask: '月度经营分析报告',
    tasksCompleted: 18,
  },
  {
    id: 'm4',
    name: '陈静',
    role: '运营主管',
    avatar: null,
    status: 'offline',
    currentTask: '邕宁区新客户报价审核',
    tasksCompleted: 27,
  },
  {
    id: 'm5',
    name: '刘强',
    role: '区域经理',
    avatar: null,
    status: 'online',
    currentTask: '良庆区客户回访',
    tasksCompleted: 15,
  },
]

export const notifications = [
  {
    id: 'n1',
    type: 'alert',
    title: 'AI模型预测偏差预警',
    message: '西乡塘区家电清洗服务近3日实际成交价低于AI预测价12%，建议关注',
    time: '10分钟前',
    read: false,
  },
  {
    id: 'n2',
    type: 'success',
    title: '月度重训练完成',
    message: 'XGBoost定价模型已完成5月数据重训练，MAPE从32.1%降至30.4%',
    time: '1小时前',
    read: false,
  },
  {
    id: 'n3',
    type: 'info',
    title: '竞品价格更新',
    message: '美团家政平台青秀区深度清洁价格下调5元/次，已记录至竞品数据库',
    time: '2小时前',
    read: true,
  },
  {
    id: 'n4',
    type: 'warning',
    title: '供应紧张预警',
    message: '良庆区日常保洁服务人员供需比降至0.65，建议启用旺季定价策略',
    time: '3小时前',
    read: true,
  },
  {
    id: 'n5',
    type: 'info',
    title: '新订单数据导入',
    message: '已导入上周1,284条新订单数据，数据质量评分98.2%',
    time: '昨天',
    read: true,
  },
  {
    id: 'n6',
    type: 'success',
    title: '定价方案审批通过',
    message: '武鸣区开荒保洁新定价方案已获管理层审批，即日生效',
    time: '昨天',
    read: true,
  },
]

export const recentOrders = [
  { id: 'ORD-20260615-001', service: '深度清洁', district: '青秀区', price: 268, status: 'completed', margin: 42.3 },
  { id: 'ORD-20260615-002', service: '日常保洁', district: '良庆区', price: 155, status: 'completed', margin: 35.8 },
  { id: 'ORD-20260615-003', service: '开荒保洁', district: '江南区', price: 420, status: 'in_progress', margin: 40.1 },
  { id: 'ORD-20260615-004', service: '家电清洗', district: '西乡塘区', price: 188, status: 'completed', margin: 31.5 },
  { id: 'ORD-20260615-005', service: '深度清洁', district: '兴宁区', price: 235, status: 'pending', margin: 38.7 },
]
