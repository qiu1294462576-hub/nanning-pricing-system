# dashboard-ui

南宁家政智能定价系统的数据管理看板，基于 React 19 + Vite 8 构建的现代 SaaS 风格单页应用。

## 技术栈

- **React 19** — UI 框架
- **Vite 8** — 构建工具
- **Tailwind CSS v4** — 样式系统（`@theme` 指令）
- **Recharts** — 数据可视化
- **Framer Motion** — 动画系统
- **Lucide React** — 图标库

## 快速开始

```bash
npm install
npm run dev     # 开发服务器 → http://localhost:5173
npm run build   # 生产构建
```

## 项目结构

```
src/
├── components/
│   ├── layout/              # 布局组件
│   │   ├── Sidebar.jsx      # 可折叠侧边栏导航
│   │   └── Header.jsx       # 顶栏（搜索、通知、用户头像）
│   ├── dashboard/           # 看板组件
│   │   ├── KpiCards.jsx     # KPI 指标卡片（6项）
│   │   ├── TrendChart.jsx   # 趋势图、区域图、服务分布图
│   │   ├── TaskList.jsx     # 待办任务列表
│   │   ├── TeamStatus.jsx   # 团队成员在线状态
│   │   └── Notifications.jsx# 系统通知流
│   └── ui/                  # 基础 UI 组件
│       ├── card.jsx         # 卡片容器
│       ├── badge.jsx        # 标签徽章
│       └── animated-number.jsx # 数字动画
├── pages/                   # 页面组件（10个路由页面）
│   ├── DashboardPage.jsx    # 数据总览看板
│   ├── AnalyticsPage.jsx    # 经营分析（收入/利润趋势）
│   ├── PricingPage.jsx      # AI 智能定价计算器
│   ├── CostQueryPage.jsx    # 成本参数查询
│   ├── CompetitivePage.jsx  # 竞品价格对比
│   ├── OrdersPage.jsx       # 订单审核与导入
│   ├── TeamPage.jsx         # 团队成员管理
│   ├── NotificationsPage.jsx# 消息通知中心
│   ├── ModelPage.jsx        # AI 模型监控
│   └── SettingsPage.jsx     # 系统参数配置
├── data/
│   └── mock-data.js         # 模拟数据（KPI、趋势、区域、服务等）
├── lib/
│   └── utils.js             # 工具函数（cn、formatNumber、formatCompact）
├── App.jsx                  # 应用入口（路由 + 布局 Shell）
├── index.css                # 设计令牌系统（Seed → Theme → Utility）
└── main.jsx                 # Vite 入口
```

## 设计系统

采用 Seed Token 架构，所有视觉变量从 6 个种子令牌派生：

| Seed Token | 默认值 | 用途 |
|:---|:---|:---|
| `--seed-bg` | `#0b0d13` | 页面基础背景 |
| `--seed-fg` | `#f1f3f5` | 主文本色 |
| `--seed-primary` | `#00b8a9` | 主色调（青绿） |
| `--seed-accent` | `#8b7cf6` | 辅助色（紫罗兰） |
| `--seed-surface` | `#111318` | 表面背景 |
| `--seed-radius` | `10px` | 基础圆角 |

字体：Plus Jakarta Sans（正文）+ JetBrains Mono（代码）

## 路由

采用 Hash-based 客户端路由，通过 `activeNav` state 管理 10 个页面切换，支持 AnimatePresence 页面过渡动画。
