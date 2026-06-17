<p align="center">
  <h1 align="center">南宁家政 AI 动态定价系统</h1>
  <p align="center">
    <strong>基于 XGBoost 的四层混合定价引擎 · 数据驱动决策平台</strong>
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/Python-3.10%2B-blue?style=flat-square&logo=python" alt="Python" />
    <img src="https://img.shields.io/badge/FastAPI-0.110%2B-009688?style=flat-square&logo=fastapi" alt="FastAPI" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/XGBoost-2.0%2B-red?style=flat-square" alt="XGBoost" />
    <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker" alt="Docker" />
  </p>
</p>

---

## 项目概述

本项目是一套面向南宁家政服务市场的 **AI 智能定价与运营管理平台**，覆盖从数据采集、统计建模、成本核算到 AI 动态定价的完整业务闭环。系统采用四层混合定价架构（成本兜底 → 市场锚定 → AI 动态调价 → 规则校验），结合 XGBoost 机器学习模型，实现覆盖 7 个城区、4 类服务、3 档技能等级的精准定价能力。

平台由三大子系统组成：

| 子系统 | 技术栈 | 说明 |
|:---|:---|:---|
| **定价引擎后端** | Python · FastAPI · XGBoost | 四层混合定价 API，含回测、成本核算、参数管理 |
| **数据看板前端** | React 19 · Vite · Tailwind CSS v4 | SaaS 风格管理后台，Linear 深色主题，支持数据导入与可视化 |
| **微信小程序** | 原生开发 | 移动端定价查询、成本查看、订单审核 |

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        客户端层                                  │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │  React 看板   │  │  Phase5 Web SPA  │  │  微信小程序         │  │
│  │  (Vite+shadcn)│  │  (Vanilla+ECharts)│  │  (原生开发)        │  │
│  └──────┬───────┘  └────────┬─────────┘  └────────┬──────────┘  │
└─────────┼───────────────────┼──────────────────────┼────────────┘
          │                   │                      │
          ▼                   ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI 后端服务 (Port 8000)                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    四层混合定价引擎                            │ │
│  │                                                              │ │
│  │   Layer 1          Layer 2         Layer 3        Layer 4   │ │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────┐ │ │
│  │  │ 成本兜底  │→│ 市场锚定  │→│ AI 动态调价 │→│ 规则校验  │ │ │
│  │  │ CostFloor │  │ MarketAn │  │  XGBoost   │  │ RuleCheck│ │ │
│  │  └──────────┘  └──────────┘  └────────────┘  └──────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────────────┐  │
│  │ CostCalc     │ │ FeatureEng   │ │ Dashboard / Backtest API │  │
│  │ 成本核算模块  │ │ 25维特征工程  │ │ KPI / 回测 / 订单审核     │  │
│  └─────────────┘ └──────────────┘ └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       数据层                                     │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────────────┐  │
│  │ 样本订单     │ │ 竞品价格数据  │ │ 供需 / 社区 / 节假日数据  │  │
│  │ 12,700+条   │ │ 3平台 600条   │ │ CSV 结构化存储             │  │
│  └─────────────┘ └──────────────┘ └──────────────────────────┘  │
│  数据来源: 美团 · 58同城 · 天鹅到家 + 南宁本地市场调研              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 核心功能

### 定价引擎

- **四层混合定价**: 成本兜底 → 市场锚定 → XGBoost AI 动态调价 → 业务规则校验，四层递进确保定价合理性与盈利性
- **25 维特征输入**: 服务类型、技能等级、城区、时长、户型、时段、供需比、季节因子、节假日标记等
- **实时定价 API**: 单笔定价 < 50ms，支持批量定价接口
- **双模式对比**: 同一请求可对比 AI 定价与规则定价的差异

### 成本核算

- **四级成本分摊**: 直接成本（人工+物料+交通）→ 间接成本（管理费 6%）→ 风险缓冲（10%）→ 目标利润（25-35%）
- **84 个核心场景**: 覆盖 4 类服务 x 3 档技能 x 7 个城区的完整组合
- **动态参数调整**: 成本参数可通过 API 实时修改，自动备份历史版本

### 数据分析

- **统计建模**: Spearman 相关性分析、ANOVA 方差检验、季节性分解、价格敏感度分析
- **回测系统**: AI 定价 vs 规则定价 vs 历史模型，4,876 笔订单全量对比
- **亏损诊断**: 按城区 / 服务类型 / 技能等级多维度分析亏损订单

### 运营管理

- **订单审核**: 历史订单筛选、损益分析、异常订单标记
- **竞品监控**: 美团、58同城、天鹅到家三平台价格采集与对比
- **团队管理**: 成员状态追踪、任务分配与完成率统计
- **通知系统**: 多级告警（紧急 / 成功 / 警告 / 信息）

---

## 技术栈

| 层级 | 技术选型 | 版本 |
|:---|:---|:---|
| **看板前端** | React + Vite + Tailwind CSS v4 + shadcn/ui + Recharts + Framer Motion | 19 / 8 / 4.x |
| **Web SPA** | Vanilla JavaScript + ECharts | 5.4 |
| **微信小程序** | 原生开发 (WXML + WXSS + JS) | 3.16 |
| **后端框架** | FastAPI + Pydantic v2 + Uvicorn | 0.110+ |
| **机器学习** | XGBoost + scikit-learn + numpy + pandas | 2.0+ |
| **数据采集** | Scrapy + Selenium + BeautifulSoup4 | - |
| **可视化** | Matplotlib + Seaborn + Plotly + Recharts + ECharts | - |
| **部署** | Docker Compose | - |

---

## 项目结构

```
jiazheng/
├── dashboard-ui/                          # SaaS 数据看板（React + Vite）
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/                 # 仪表盘组件（KPI卡片、趋势图、图表）
│   │   │   ├── layout/                    # 布局组件（侧边栏、顶栏）
│   │   │   └── ui/                        # 基础 UI 组件（Button、Card、Badge 等）
│   │   ├── pages/                         # 页面
│   │   │   ├── DashboardPage.jsx          # 数据总览
│   │   │   ├── PricingPage.jsx            # 智能定价
│   │   │   ├── OrdersPage.jsx             # 订单审核（支持文件导入）
│   │   │   ├── CostQueryPage.jsx          # 成本查询
│   │   │   ├── CompetitivePage.jsx        # 竞品分析
│   │   │   ├── AnalyticsPage.jsx          # 数据分析
│   │   │   ├── ModelPage.jsx              # 模型管理
│   │   │   ├── TeamPage.jsx               # 团队管理
│   │   │   ├── NotificationsPage.jsx      # 消息通知
│   │   │   └── SettingsPage.jsx           # 系统设置
│   │   ├── data/                          # 模拟数据
│   │   ├── App.jsx                        # 应用入口（Hash 路由）
│   │   └── main.jsx                       # Vite 入口
│   ├── package.json
│   └── vite.config.js
│
├── nanning_pricing_system1to5/            # 后端定价引擎（Python）
│   ├── backend/
│   │   └── main.py                        # FastAPI 应用（12+ API 端点）
│   ├── core/                              # 定价核心模块
│   │   ├── pricing_engine.py              # 四层混合定价引擎
│   │   ├── cost_calculator.py             # 成本核算与保本定价
│   │   ├── ml_pricing_model.py            # XGBoost 模型封装
│   │   └── feature_engineer.py            # 25 维特征工程
│   ├── scripts/                           # 数据管道与训练脚本
│   │   ├── train_model.py                 # 模型训练
│   │   ├── backtest.py                    # 回测评估
│   │   ├── statistical_analysis.py        # 统计分析报告
│   │   ├── generate_realistic_data.py     # 合成数据生成
│   │   ├── data_importer.py               # CSV/Excel/MySQL 数据导入
│   │   └── generate_dashboard_data.py     # 看板数据导出
│   ├── tests/
│   │   └── test_cost_calculator.py        # 单元测试
│   ├── phase5/
│   │   ├── web/                           # 生产 Web SPA（Vanilla JS + ECharts）
│   │   │   ├── index.html
│   │   │   ├── css/app.css
│   │   │   └── js/
│   │   │       ├── app.js, api.js, store.js
│   │   │       ├── components/            # toast, modal, kpi-card, header, tabbar
│   │   │       ├── pages/                 # pricing, cost-query, order-review, params, dashboard
│   │   │       └── utils/                 # format, defaults, charts
│   │   └── miniprogram/                   # 微信小程序
│   │       ├── app.js, app.json, app.wxss
│   │       ├── project.config.json
│   │       ├── pages/                     # pricing, cost-query, order-review, params, dashboard
│   │       └── utils/                     # api, format, defaults
│   ├── frontend/                          # Phase 1-2 静态分析看板
│   │   ├── 01_data_preview.html
│   │   ├── 02_analysis_dashboard.html
│   │   ├── 03_break_even_calculator.html
│   │   └── 04_model_test.html
│   ├── data/nanning/                      # 结构化数据
│   │   ├── sample_orders.csv              # 样本订单 ~12,700 条
│   │   ├── competitive_prices.csv         # 竞品价格 600 条（3 平台）
│   │   ├── supply_demand_data.csv         # 供需数据（7 城区 x 17 月）
│   │   ├── area_economic_data.csv         # 社区经济数据 73 条
│   │   ├── holiday_season_data.csv        # 节假日与季节性事件 17 条
│   │   ├── cost_benchmark.csv             # 成本基准 96 条
│   │   └── cost_parameters.csv            # 运行时成本参数（API 可编辑）
│   ├── output/                            # 模型输出
│   │   ├── models/                        # XGBoost 模型文件
│   │   ├── figures/                       # 分析图表（10 张 PNG）
│   │   ├── backtest_results.json          # 回测结果
│   │   └── calculator_verify.json         # 计算器验证
│   ├── docs/                              # 技术文档
│   │   ├── 数据字典.md
│   │   ├── 南宁家政AI动态定价算法模型报告.md
│   │   ├── 南宁家政市场统计建模分析报告.md
│   │   ├── 南宁家政服务成本核算与保本定价报告.md
│   │   ├── 南宁家政市场数据质量报告.md
│   │   └── 数据采集合规指南.md
│   ├── config.yaml                        # 全局配置（区域/服务/成本/季节）
│   ├── docker-compose.yaml                # Docker 编排
│   └── requirements.txt                   # Python 依赖
│
└── 6/                                     # 项目交付文档
    ├── docs/                              # Markdown 格式文档
    │   ├── 分角色操作指南/
    │   ├── 培训专用/
    │   ├── 所有规则，手册，报告/
    │   ├── 数据相关/
    │   └── 系统运行，运维/
    └── pdf-deliverables/                  # PDF 格式交付物
```

---

## 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+
- pip / npm

### 1. 启动定价引擎后端

```bash
cd nanning_pricing_system1to5

# 安装 Python 依赖
pip install -r requirements.txt

# 启动 FastAPI 服务（开发模式）
python -m uvicorn backend.main:app --reload --port 8000
```

服务启动后访问 http://localhost:8000/docs 查看 API 文档。

### 2. 启动数据看板前端

```bash
cd dashboard-ui

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 3. Docker 一键部署

```bash
cd nanning_pricing_system1to5
docker-compose up -d
```

---

## API 接口

后端提供 RESTful API，完整端点列表：

| 方法 | 路径 | 说明 |
|:---|:---|:---|
| `GET` | `/` | 服务状态与版本信息 |
| `POST` | `/api/price` | 单笔智能定价 |
| `POST` | `/api/batch-price` | 批量定价 |
| `GET` | `/api/model-info` | XGBoost 模型元数据 |
| `POST` | `/api/backtest` | 触发异步回测 |
| `GET` | `/api/backtest-results` | 获取回测结果 |
| `GET` | `/api/cost-params` | 获取成本参数 |
| `PUT` | `/api/cost-params` | 更新成本参数（自动备份） |
| `POST` | `/api/order-review` | 历史订单审核（分页/筛选） |
| `GET` | `/api/dashboard/kpi` | KPI 看板数据 |
| `GET` | `/api/scenarios` | 84 个核心定价场景 |
| `GET` | `/healthz` | 健康检查 |
| `GET` | `/ready` | 就绪检查 |

### 定价请求示例

```bash
curl -X POST http://localhost:8000/api/price \
  -H "Content-Type: application/json" \
  -d '{
    "service_type": "深度清洁",
    "skill_level": "熟练",
    "district": "青秀",
    "duration": 4,
    "apartment_type": "3室",
    "time_period": "周末",
    "mode": "ai"
  }'
```

---

## 定价模型

### 四层混合架构

```
输入: 服务类型 / 技能等级 / 城区 / 时长 / 户型 / 时段
        │
        ▼
  ┌─────────────┐
  │ L1 成本兜底  │  计算保本价 × 1.1 安全系数 = 绝对底价
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │ L2 市场锚定  │  美团/58/天鹅到家三平台均价 × 1.3 = 柔性上限
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │ L3 AI 调价   │  XGBoost 预测价格倍率 → 保本价 × AI 倍率
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │ L4 规则校验  │  城区溢价 / 季节加价 / 供需调节 / 时段附加费
  └──────┬──────┘
         ▼
  最终定价 = max(底价, 规则价, AI价)，受市场锚定上限约束
```

### 季节性与区域性调价

| 因子 | 调整幅度 | 说明 |
|:---|:---|:---|
| 春节 | +300% | 法定节假日用工荒 |
| 三月三 | +200% | 广西特色节假日 |
| 回南天 | +150% | 南宁气候特征，清洁需求激增 |
| 青秀区 | +15% | 高端城区溢价 |
| 良庆区 | +10% | 中高端城区 |
| 武鸣区 | +25% | 远距离交通补贴 |

### 回测结果

基于 4,876 笔测试订单的对比评估：

| 模型 | 亏损率 | 平均利润率 | 准确率 |
|:---|:---|:---|:---|
| **AI 定价（本系统）** | **0%** | **38.2%** | **69.8%** |
| 规则定价 | 0% | 38.0% | 69.6% |
| 历史模型 | 46.8% | -3.5% | 67.4% |

XGBoost 模型指标: R² = 0.8505, 验证集 MAE = 0.096, 验证集 MAPE = 7.84%

---

## 数据规模

| 数据集 | 规模 | 来源 |
|:---|:---|:---|
| 样本订单 | ~12,700 条（2025.01 – 2026.05） | 合成 + 市场调研 |
| 竞品价格 | 600 条 | 美团 / 58同城 / 天鹅到家 |
| 供需数据 | 119 条（7 城区 x 17 月） | 区域月度统计 |
| 社区经济 | 73 条 | 南宁 7 城区社区数据 |
| 成本基准 | 96 条 | 行业成本调研 |
| 节假日事件 | 17 条 | 本地化季节/节日因子 |

---

## 配置说明

全局配置位于 `nanning_pricing_system1to5/config.yaml`，涵盖：

- **区域定义**: 7 个城区的名称、均价、等级和溢价系数
- **服务类型**: 4 类服务的基准费率、最低时长和技能等级定价
- **成本结构**: 人工占比 68%、保险 18%、物料 8%、管理费 6%
- **季节因子**: 春节 x4.0、三月三 x3.0、回南天 x2.5 等乘数
- **供需参数**: 各城区月度供需比与调节系数
- **爬虫配置**: 美团 / 天鹅到家 / 58同城 采集目标与频率

---

## 项目交付文档

`6/` 目录包含完整的项目交付材料：

- **分角色操作指南** — 管理员、运营、财务人员的使用手册
- **培训专用材料** — 系统培训课件与操作练习
- **规则与报告** — 业务规则说明、算法报告、数据质量报告
- **数据相关文档** — 数据字典、采集合规指南
- **运维文档** — 系统部署与日常运维手册

---

## License

本项目仅供内部使用。
