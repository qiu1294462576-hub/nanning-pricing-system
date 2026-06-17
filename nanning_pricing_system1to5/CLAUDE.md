# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

南宁家政动态定价系统 — A dynamic pricing system for the Nanning (China) housekeeping services market. Simulates ~8000 orders across 7 districts and 4 service types, with statistical modeling to quantify pricing factors (seasonality, district premiums, skill levels).

## Commands

```bash
# Data pipeline
python scripts/generate_realistic_data.py   # Generate CSVs → data/nanning/
python scripts/statistical_analysis.py      # Stats + charts → output/figures/, output/analysis_data.js
python scripts/train_model.py               # Train XGBoost → output/models/pricing_model.json
python scripts/backtest.py                  # Backtest AI vs rule-based vs legacy pricing

# Cost calculator
python core/cost_calculator.py              # Generate break-even Excel + verify data

# Backend API
uvicorn backend.main:app --reload --port 8000

# Tests
pytest tests/ -v                            # Run all tests
python tests/test_cost_calculator.py        # Run cost calculator tests only

# Frontend — static HTML, open directly in browser (no build step):
#   frontend/01_data_preview.html           Data preview dashboard
#   frontend/02_analysis_dashboard.html     Statistical analysis dashboard
#   frontend/03_break_even_calculator.html  Break-even calculator (mobile-first)
#   frontend/04_model_test.html             AI pricing tester (requires backend API running)
```

## Architecture

### Pricing Engine (4-tier hybrid model)

```
Layer 1: Cost Floor       → break_even_price × 1.1 safety margin
Layer 2: Market Anchor    → competitor_avg_price × 1.3 soft cap
Layer 3: AI Dynamic       → XGBoost-predicted markup multiplier
Layer 4: Rule Validation  → district premium, season multiplier, time slot, supply-demand
```

The `PricingEngine` class in `core/pricing_engine.py` orchestrates all four layers. `core/ml_pricing_model.py` wraps the XGBoost model (train/predict/save/load). `core/feature_engineer.py` builds feature matrices from raw CSVs for both batch training and single online inference.

### Cost Calculator (4-tier cost model)

`core/cost_calculator.py` implements bottom-up cost accounting:
1. Direct costs (labor wages × hours × skill level)
2. Indirect costs (social insurance, materials, transportation by district)
3. Risk buffer (configurable %)
4. Profit margin (target gross margin %)

Outputs a 3-sheet Excel (`output/南宁家政保本定价测算表.xlsx`): 84-scenario break-even matrix, historical order review (12,732 orders), loss cause summary.

### Data Flow

```
config.yaml
    │
    ▼
scripts/generate_realistic_data.py  ──► data/nanning/ (7 CSVs)
    │
    ├──► scripts/statistical_analysis.py  ──► output/figures/ (8 PNGs)
    │                                       ──► output/analysis_data.js
    │
    ├──► scripts/train_model.py            ──► output/models/pricing_model.json
    │
    ├──► core/cost_calculator.py           ──► output/南宁家政保本定价测算表.xlsx
    │
    └──► core/pricing_engine.py (+ model)  ──► backend/main.py (FastAPI)
                                                  │
                                                  ▼
                                            frontend/04_model_test.html
```

Frontends 01-03 are pure static HTML (no server needed); 04 calls the FastAPI backend.

## Key Files

- `config.yaml` — All pricing config: 7 districts with housing prices and premiums, 4 service types with rate tables, cost structure (68% labor), season multipliers (4× Spring Festival), supply-demand ratios
- `core/pricing_engine.py` — `PricingEngine` class: 4-tier hybrid pricing with `get_price()` and `batch_get_price()`
- `core/ml_pricing_model.py` — `MLPricingModel` class: XGBoost wrapper (train/predict/save/load/feature importance)
- `core/feature_engineer.py` — `FeatureEngineer` class: builds feature matrices from CSVs for training and single inference
- `core/cost_calculator.py` — `CostCalculator` class: 4-tier cost model, Excel export, frontend verification
- `scripts/generate_realistic_data.py` — Generates ~8000 orders (2025-01 to 2026-05), 600 competitive prices, supply-demand data, cost benchmarks
- `scripts/statistical_analysis.py` — Spearman correlation + ANOVA, 8 matplotlib charts
- `scripts/train_model.py` — Time-split train/val, trains XGBoost, outputs feature importance chart
- `scripts/backtest.py` — Compares AI vs rule-based vs legacy pricing; outputs metrics and 4-panel chart
- `backend/main.py` — FastAPI app: `POST /api/price`, `POST /api/batch-price`, `POST /api/backtest`, `GET /api/model-info`
- `frontend/02_analysis_dashboard.html` — ECharts dashboard: 6 charts, 4 filters, dynamic KPI cards
- `frontend/03_break_even_calculator.html` — Mobile-first break-even calculator (JS logic mirrors Python `cost_calculator.py`)
- `frontend/04_model_test.html` — AI pricing tester comparing AI mode vs rule-only mode

## Key Data Concepts

- **7 districts**: 青秀 (high-end, +15%), 良庆 (mid-high, +10%), 江南/西乡塘/兴宁 (mid, base), 邕宁 (mid-low, +10%), 武鸣 (low-end, +25%)
- **4 service types**: 日常保洁 (35-45 元/h), 深度清洁 (45-65 元/h), 开荒保洁 (6-10 元/㎡), 家电清洗 (80-130 元/台)
- **Cost structure**: Labor 68%, Social insurance 18%, Materials 8%, Management 6%
- **Season multipliers**: Spring Festival 4.0×, 三月三 3.0×, 回南天 2.5× (deep clean only), Summer/Winter break 1.5×, Weekend 1.3×
- **3 skill levels per service**: novice / skilled / gold — different base rates per level

## 注意事项

- All text labels and data are in Chinese
- No build step required for frontend — just open HTML files (01-03 work offline; 04 needs the API running)
- Analysis script requires a CJK font for matplotlib (auto-detected at runtime)
- The `_references/` directory contains template/starter repos and is not part of the project code
- `frontend/data.js` and `output/analysis_data.js` are auto-generated — regenerate via `scripts/generate_frontend_data_js.py` and `scripts/generate_dashboard_data.py` respectively
