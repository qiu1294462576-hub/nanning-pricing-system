# 南宁家政智能定价系统

基于 AI 动态定价的家政服务管理系统，包含 XGBoost 定价引擎、数据分析看板和微信小程序端。

## 项目结构

```
├── dashboard-ui/              # 数据看板前端（React + Vite + shadcn/ui）
│   ├── src/
│   │   ├── components/        # UI 组件（卡片、图表、布局）
│   │   ├── pages/             # 页面（定价、订单、竞品、团队等）
│   │   └── data/              # 模拟数据
│   ├── package.json
│   └── vite.config.js
│
├── nanning_pricing_system1to5/ # 后端定价引擎（Python + FastAPI）
│   ├── backend/               # API 服务
│   ├── core/                  # 定价核心算法（XGBoost）
│   ├── frontend/              # 微信小程序前端
│   ├── data/                  # 市场数据与样本订单
│   ├── output/                # 模型输出与回测结果
│   ├── docs/                  # 技术文档
│   ├── scripts/               # 工具脚本
│   ├── tests/                 # 测试用例
│   ├── config.yaml            # 系统配置
│   └── requirements.txt       # Python 依赖
│
└── 6/                         # 项目交付文档
    ├── docs/                  # Markdown 格式文档
    └── pdf-deliverables/      # PDF 格式交付物
```

## 快速开始

### 数据看板

```bash
cd dashboard-ui
npm install
npm run dev
```

### 后端定价引擎

```bash
cd nanning_pricing_system1to5
pip install -r requirements.txt
python -m backend.main
```

## 技术栈

- **前端**: React 19 + Vite 8 + Tailwind CSS v4 + shadcn/ui + Recharts + Framer Motion
- **后端**: Python FastAPI + XGBoost + scikit-learn
- **小程序**: 微信小程序原生开发
- **部署**: Docker Compose

## 定价模型

四层定价架构：成本兜底 → 市场锚定 → AI 动态调价 → 规则校验

- XGBoost v3.2，MAPE 30.40%
- 25 维特征输入
- 覆盖南宁 7 个城区、4 类服务
