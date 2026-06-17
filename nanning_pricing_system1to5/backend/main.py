"""
南宁家政 AI 动态定价 — FastAPI 后端服务
=========================================
一键启动: python -m uvicorn backend.main:app --reload --port 8000
"""

import os
import sys
import json
import math
import csv
from typing import Optional, List, Literal
from datetime import datetime

import pandas as pd
import numpy as np

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from core.pricing_engine import PricingEngine
from core.cost_calculator import CostCalculator

SERVICE_TYPES = Literal["日常保洁", "深度清洁", "开荒保洁", "家电清洗"]
SKILL_LEVELS = Literal["新手", "熟练", "金牌"]
DISTRICTS = Literal["青秀", "良庆", "江南", "西乡塘", "兴宁", "邕宁", "武鸣"]
APARTMENT_TYPES = Literal["1室", "2室", "3室", "4室+", "别墅"]
TIME_PERIODS = Literal["工作日", "周末", "节假日", "旺季"]
PRICING_MODES = Literal["ai", "rule"]

app = FastAPI(
    title="南宁家政 AI 动态定价 API",
    description="四层混合定价模型（成本兜底+市场锚定+AI动态调价+规则校验）",
    version="4.0",
)

# CORS 允许前端跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局引擎（启动时加载）
engine: Optional[PricingEngine] = None
cc: Optional[CostCalculator] = None
_backtest_running: bool = False
_backtest_summary: Optional[dict] = None


# ============================================================
# Pydantic 模型
# ============================================================

class PriceRequest(BaseModel):
    service_type: SERVICE_TYPES = Field(..., description="服务类型")
    skill_level: SKILL_LEVELS = Field(..., description="师傅等级")
    district: DISTRICTS = Field(..., description="城区")
    duration: float = Field(..., gt=0, description="服务时长(小时)")
    apartment_type: APARTMENT_TYPES = Field("3室", description="户型")
    time_period: TIME_PERIODS = Field("工作日", description="时间段")
    mode: PRICING_MODES = Field("ai", description="定价模式")


class BatchPriceRequest(BaseModel):
    orders: List[PriceRequest]


class BacktestRequest(BaseModel):
    pass


class ParamUpdate(BaseModel):
    category: str
    subcategory: str
    value: float


class CostParamsUpdateRequest(BaseModel):
    updates: List[ParamUpdate]


class OrderReviewRequest(BaseModel):
    district: Optional[str] = "全部"
    service_type: Optional[str] = "全部"
    skill_level: Optional[str] = "全部"
    time_period: Optional[str] = "全部"
    is_loss_only: bool = False
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=200)


# ============================================================
# 启动事件
# ============================================================

@app.on_event("startup")
def startup():
    global engine, cc
    try:
        engine = PricingEngine()
        cc = CostCalculator()
        status = "模型已加载" if engine._model_loaded else "模型未训练，请先运行 scripts/train_model.py"
        print(f"[OK] 定价引擎初始化完成: {status}")
    except Exception as e:
        print(f"[ERROR] 引擎初始化失败: {e}")
        engine = None


# ============================================================
# API 端点
# ============================================================

@app.get("/")
def root():
    return {
        "service": "南宁家政 AI 动态定价 API",
        "version": "4.0",
        "status": "running" if engine else "error",
        "layers": ["cost_floor", "market_anchor", "ai_dynamic", "rule_validation"],
        "model_loaded": engine._model_loaded if engine else False,
        "docs": "/docs",
    }


@app.post("/api/price")
def get_price(req: PriceRequest):
    """单次定价"""
    if engine is None:
        raise HTTPException(status_code=503, detail="定价引擎未初始化")

    try:
        result = engine.get_price(
            service_type=req.service_type,
            skill_level=req.skill_level,
            district=req.district,
            duration=req.duration,
            apartment_type=req.apartment_type,
            time_period=req.time_period,
            mode=req.mode,
        )
        return {
            "success": True,
            "input": req.model_dump(),
            "result": result,
        }
    except (ValueError, KeyError) as e:
        raise HTTPException(status_code=400, detail=f"输入参数错误: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")


@app.post("/api/batch-price")
def batch_price(req: BatchPriceRequest):
    """批量定价"""
    if engine is None:
        raise HTTPException(status_code=503, detail="定价引擎未初始化")

    results = []
    for order in req.orders:
        try:
            result = engine.get_price(
                service_type=order.service_type,
                skill_level=order.skill_level,
                district=order.district,
                duration=order.duration,
                apartment_type=order.apartment_type,
                time_period=order.time_period,
                mode=order.mode,
            )
            results.append({"input": order.model_dump(), "result": result})
        except ValueError as e:
            results.append({"input": order.model_dump(), "error": f"参数错误: {str(e)}"})
        except Exception as e:
            results.append({"input": order.model_dump(), "error": f"服务错误: {str(e)}"})

    return {"success": True, "count": len(results), "results": results}


@app.get("/api/model-info")
def model_info():
    """获取模型信息"""
    if engine is None:
        raise HTTPException(status_code=503, detail="定价引擎未初始化")
    return {"success": True, "model_info": engine.get_model_info()}


@app.post("/api/backtest")
async def run_backtest(background_tasks: BackgroundTasks):
    """触发回测（异步后台执行）"""
    global _backtest_running, _backtest_summary
    if _backtest_running:
        return {"success": False, "detail": "回测正在运行中，请稍后再试"}

    def _run():
        global _backtest_running, _backtest_summary
        _backtest_running = True
        try:
            from scripts.backtest import main as run_backtest_main
            _backtest_summary = run_backtest_main()
        except Exception as e:
            _backtest_summary = {"error": str(e)}
        finally:
            _backtest_running = False

    background_tasks.add_task(_run)
    return {"success": True, "detail": "回测已启动，请通过 GET /api/backtest-results 查询结果"}


@app.get("/api/backtest-results")
def get_backtest_results():
    """获取最近一次回测结果"""
    if _backtest_summary is not None:
        return {"success": True, "summary": _backtest_summary, "running": _backtest_running}
    path = os.path.join(BASE_DIR, "output", "backtest_results.json")
    if not os.path.exists(path):
        return {"success": False, "detail": "回测结果不存在，请先运行 POST /api/backtest"}
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return {"success": True, "summary": data, "running": _backtest_running}


@app.get("/healthz")
def healthz():
    """存活探针"""
    return {"status": "ok"}


@app.get("/ready")
def ready():
    """就绪探针"""
    if engine is None:
        raise HTTPException(status_code=503, detail="引擎未就绪")
    return {"status": "ready", "model_loaded": engine._model_loaded}


# ============================================================
# Phase 5: 新增端点
# ============================================================

@app.get("/api/cost-params")
def get_cost_params():
    """获取所有成本参数（含前端 lookup 表）"""
    if cc is None:
        raise HTTPException(status_code=503, detail="成本计算器未初始化")

    params_list = []
    for cat, subs in cc.params.items():
        for sub, val in subs.items():
            params_list.append({
                "category": cat,
                "subcategory": sub,
                "value": val,
                "unit": "",
                "note": "",
            })

    return {
        "success": True,
        "params": params_list,
        "lookups": {
            cat: dict(subs) for cat, subs in cc.params.items()
        },
    }


@app.put("/api/cost-params")
def update_cost_params(req: CostParamsUpdateRequest):
    """更新成本参数（含验证、CSV 备份、引擎重载）"""
    if cc is None:
        raise HTTPException(status_code=503, detail="成本计算器未初始化")

    # 验证
    errors = []
    for u in req.updates:
        if u.category not in cc.params:
            errors.append(f"未知参数类别: {u.category}")
            continue
        if u.subcategory not in cc.params[u.category]:
            errors.append(f"未知子类别: {u.category}/{u.subcategory}")
            continue
        # 合理性校验
        if u.category == "师傅到手时薪" and (u.value < 10 or u.value > 100):
            errors.append(f"师傅时薪 {u.value} 超出合理范围 [10, 100]")
        if u.category in ("社保系数", "管理费率", "风险裕量", "目标毛利率"):
            if u.value <= 0 or u.value >= 2:
                errors.append(f"{u.category} {u.value} 超出合理范围 (0, 2)")

    if errors:
        raise HTTPException(status_code=400, detail="参数验证失败: " + "; ".join(errors))

    # 备份旧 CSV
    import shutil
    csv_path = cc.params_path
    backup_path = csv_path + ".backup." + datetime.now().strftime("%Y%m%d_%H%M%S")
    try:
        shutil.copy2(csv_path, backup_path)
    except Exception:
        pass  # 备份失败不阻塞

    # 写新 CSV
    try:
        rows = [["category", "subcategory", "value", "unit", "note"]]
        for cat, subs in cc.params.items():
            for sub, val in subs.items():
                rows.append([cat, sub, str(val), "", ""])

        # 应用更新
        update_map = {}
        for u in req.updates:
            update_map[(u.category, u.subcategory)] = u.value

        for i in range(1, len(rows)):
            cat, sub = rows[i][0], rows[i][1]
            if (cat, sub) in update_map:
                rows[i][2] = str(update_map[(cat, sub)])

        with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerows(rows)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"写入 CSV 失败: {str(e)}")

    # 重载引擎
    try:
        cc = CostCalculator()
        engine = PricingEngine()
        status = "模型已加载" if engine._model_loaded else "模型未训练"
        print(f"[OK] 参数更新完成，引擎已重载: {status}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"引擎重载失败: {str(e)}")

    return {
        "success": True,
        "detail": f"已更新 {len(req.updates)} 个参数",
        "model_loaded": engine._model_loaded,
    }


@app.post("/api/order-review")
def order_review(req: OrderReviewRequest):
    """历史订单复盘（分页 + 筛选 + 聚合）"""
    if cc is None:
        raise HTTPException(status_code=503, detail="成本计算器未初始化")

    orders_path = os.path.join(BASE_DIR, "data", "nanning", "sample_orders.csv")
    if not os.path.exists(orders_path):
        raise HTTPException(status_code=404, detail="订单数据文件不存在，请先运行 scripts/generate_realistic_data.py")

    # 运行完整复盘
    try:
        review_rows, loss_rows, summary_all = cc.review_historical_orders(orders_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"复盘计算失败: {str(e)}")

    # 筛选
    filtered = review_rows
    if req.district and req.district != "全部":
        filtered = [r for r in filtered if r["城区"] == req.district]
    if req.service_type and req.service_type != "全部":
        filtered = [r for r in filtered if r["服务类型"] == req.service_type]
    if req.skill_level and req.skill_level != "全部":
        filtered = [r for r in filtered if r["服务等级"] == req.skill_level]
    if req.time_period and req.time_period != "全部":
        filtered = [r for r in filtered if _get_time_period(r.get("下单时间", "")) == req.time_period]
    if req.is_loss_only:
        filtered = [r for r in filtered if r["新模型_是否亏损"] == "是"]

    total_filtered = len(filtered)

    # 分页
    start = (req.page - 1) * req.page_size
    end = start + req.page_size
    page_orders = filtered[start:end]

    # 聚合（基于筛选后的数据）
    from collections import defaultdict
    agg_dist = defaultdict(lambda: {"total": 0, "loss": 0, "loss_amount": 0.0})
    agg_svc = defaultdict(lambda: {"total": 0, "loss": 0, "loss_amount": 0.0})
    agg_skill = defaultdict(lambda: {"total": 0, "loss": 0, "loss_amount": 0.0})

    for r in filtered:
        d, s, sl = r["城区"], r["服务类型"], r["服务等级"]
        agg_dist[d]["total"] += 1
        agg_svc[s]["total"] += 1
        agg_skill[sl]["total"] += 1
        if r["新模型_是否亏损"] == "是":
            agg_dist[d]["loss"] += 1
            agg_dist[d]["loss_amount"] += r["新模型_亏损额"]
            agg_svc[s]["loss"] += 1
            agg_svc[s]["loss_amount"] += r["新模型_亏损额"]
            agg_skill[sl]["loss"] += 1
            agg_skill[sl]["loss_amount"] += r["新模型_亏损额"]

    def _agg_to_list(agg):
        return sorted([
            {"name": k, "total": v["total"], "loss": v["loss"],
             "loss_rate": round(v["loss"] / v["total"] * 100, 1) if v["total"] else 0,
             "loss_amount": round(v["loss_amount"], 2)}
            for k, v in agg.items()
        ], key=lambda x: -x["loss_amount"])

    # 筛选摘要
    loss_count = sum(1 for r in filtered if r["新模型_是否亏损"] == "是")
    total_loss = sum(r["新模型_亏损额"] for r in filtered if r["新模型_是否亏损"] == "是")

    return {
        "success": True,
        "summary": {
            "total_orders": total_filtered,
            "loss_count": loss_count,
            "loss_rate": round(loss_count / total_filtered * 100, 2) if total_filtered > 0 else 0,
            "total_loss_amount": round(total_loss, 2),
        },
        "orders": page_orders,
        "aggregations": {
            "by_district": _agg_to_list(agg_dist),
            "by_service_type": _agg_to_list(agg_svc),
            "by_skill_level": _agg_to_list(agg_skill),
        },
        "pagination": {
            "page": req.page,
            "page_size": req.page_size,
            "total_filtered": total_filtered,
            "total_pages": max(1, math.ceil(total_filtered / req.page_size)) if total_filtered > 0 else 1,
        },
    }


def _get_time_period(date_str: str) -> str:
    """推断时间段（简化版：周末/工作日）"""
    if not date_str:
        return "工作日"
    try:
        dt = pd.to_datetime(date_str)
        if dt.weekday() >= 5:
            return "周末"
        return "工作日"
    except Exception:
        return "工作日"


@app.get("/api/dashboard/kpi")
def dashboard_kpi():
    """数据看板 KPI 摘要 + 趋势 + 分布"""

    orders_path = os.path.join(BASE_DIR, "data", "nanning", "sample_orders.csv")
    if not os.path.exists(orders_path):
        raise HTTPException(status_code=404, detail="订单数据文件不存在")

    df = pd.read_csv(orders_path)
    df["下单时间"] = pd.to_datetime(df["下单时间"])
    df["month"] = df["下单时间"].dt.to_period("M").astype(str)

    # KPI
    total_orders = len(df)
    avg_price = float(df["订单金额"].mean()) if total_orders > 0 else 0
    total_revenue = float(df["订单金额"].sum())
    total_profit = total_revenue * 0.38  # 估算（基于平均 38% 毛利率）

    # 用成本模型计算利润率
    if cc:
        try:
            review = cc.review_historical_orders(orders_path)
            if review and review[0]:
                margins_new = [float(r["新模型_实际利润率(%)"]) for r in review[0]]
                avg_margin = float(np.mean(margins_new)) if margins_new else 0
                loss_count = sum(1 for r in review[0] if r["新模型_是否亏损"] == "是")
                loss_rate = round(loss_count / len(review[0]) * 100, 2) if review[0] else 0
                total_profit = total_revenue - sum(float(r["新模型_总成本"]) for r in review[0])
            else:
                avg_margin = 38.2
                loss_rate = 0.0
        except Exception:
            avg_margin = 38.2
            loss_rate = 0.0
    else:
        avg_margin = 38.2
        loss_rate = 0.0

    # 月度趋势
    monthly = df.groupby("month").agg(
        avg_price=("订单金额", "mean"),
        order_count=("订单金额", "count"),
    ).reset_index().sort_values("month")

    months_sorted = monthly["month"].tolist()

    # 城区分布
    district_stats = []
    for dist in df["城区"].unique():
        ddf = df[df["城区"] == dist]
        district_stats.append({
            "district": dist,
            "orders": int(len(ddf)),
            "avg_price": round(float(ddf["订单金额"].mean()), 2),
            "avg_duration": round(float(ddf["服务时长"].mean()), 1),
        })

    # 服务类型分布
    service_stats = []
    for svc in df["服务类型"].unique():
        sdf = df[df["服务类型"] == svc]
        service_stats.append({
            "service": svc,
            "orders": int(len(sdf)),
            "avg_price": round(float(sdf["订单金额"].mean()), 2),
        })

    # AI vs Legacy (from backtest)
    backtest_path = os.path.join(BASE_DIR, "output", "backtest_results.json")
    ai_vs_legacy = {}
    if os.path.exists(backtest_path):
        try:
            with open(backtest_path, "r", encoding="utf-8") as f:
                bt = json.load(f)
            ai_vs_legacy = {
                "ai_loss_rate": bt.get("ai_loss_rate", "N/A"),
                "ai_avg_margin": bt.get("ai_avg_margin", "N/A"),
                "legacy_loss_rate": bt.get("legacy_loss_rate", "N/A"),
                "legacy_avg_margin": bt.get("legacy_avg_margin", "N/A"),
            }
        except Exception:
            pass

    return {
        "success": True,
        "model_loaded": engine._model_loaded if engine else False,
        "kpi": {
            "total_orders": total_orders,
            "avg_price": round(avg_price, 2),
            "avg_margin_pct": round(avg_margin, 2),
            "loss_rate_pct": round(loss_rate, 2),
            "total_revenue": round(total_revenue, 2),
            "total_profit": round(total_profit, 2),
        },
        "trend": {
            "months": months_sorted,
            "avg_price": [round(float(x), 2) for x in monthly["avg_price"].tolist()],
            "order_count": [int(x) for x in monthly["order_count"].tolist()],
        },
        "district_breakdown": sorted(district_stats, key=lambda x: -x["orders"]),
        "service_breakdown": sorted(service_stats, key=lambda x: -x["orders"]),
        "ai_vs_legacy": ai_vs_legacy,
    }


@app.get("/api/scenarios")
def get_scenarios():
    """获取全部 84 个核心定价场景"""
    if cc is None:
        raise HTTPException(status_code=503, detail="成本计算器未初始化")

    try:
        scenarios = cc.calculate_all_scenarios()
        return {
            "success": True,
            "total": len(scenarios),
            "scenarios": [s.summary_dict() for s in scenarios],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"场景计算失败: {str(e)}")


# 静态文件挂载 — Web SPA
phase5_web_path = os.path.join(BASE_DIR, "phase5", "web")
if os.path.isdir(phase5_web_path):
    app.mount("/app", StaticFiles(directory=phase5_web_path, html=True), name="webapp")


# ============================================================
# 启动入口
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
