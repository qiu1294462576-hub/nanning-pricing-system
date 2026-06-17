"""
南宁家政 AI 定价 — 回测脚本
==============================
对比 AI 定价 vs 纯规则定价 vs 旧模型定价。
验证回南天价格缺口是否修复、各城区定价合理性。
"""

import os
import sys
import json
import warnings
from datetime import datetime
from collections import defaultdict

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

warnings.filterwarnings("ignore")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from core.pricing_engine import PricingEngine
from core.cost_calculator import CostCalculator

# 旧模型定价函数（从 statistical_analysis.py 复用）
GENERIC_RATES = {
    ("日常保洁", "新手"): 35, ("日常保洁", "熟练"): 40, ("日常保洁", "金牌"): 45,
    ("深度清洁", "新手"): 48, ("深度清洁", "熟练"): 58, ("深度清洁", "金牌"): 68,
    ("开荒保洁", "新手"): 4, ("开荒保洁", "熟练"): 5, ("开荒保洁", "金牌"): 6,
    ("家电清洗", "新手"): 85, ("家电清洗", "熟练"): 110, ("家电清洗", "金牌"): 140,
}
PREMIUM_MAP = {"青秀": 1.15, "良庆": 1.10, "江南": 1.00, "西乡塘": 1.00,
               "兴宁": 1.00, "邕宁": 1.10, "武鸣": 1.25}
PRODUCTIVITY = {"新手": 18, "熟练": 15, "金牌": 12}


def old_model_price(service_type: str, skill: str, district: str,
                    duration: float) -> float:
    """旧模型定价：标准价格 × 0.85（Phase 2 倒推公式，模拟平台折扣后实际成交价）"""
    # 0.85 系数来源：Phase 2 统计发现实际成交价约为标准挂牌价的 85%
    # 这是平台通用折扣率，未按城区/季节/服务类型细分
    rate = GENERIC_RATES.get((service_type, skill), 0)
    premium = PREMIUM_MAP.get(district, 1.0)
    if service_type in ("日常保洁", "深度清洁"):
        std = rate * premium * duration
    elif service_type == "开荒保洁":
        area = duration * PRODUCTIVITY.get(skill, 15)
        std = rate * premium * area
    else:
        units = max(1, round(duration / 1.5))
        std = rate * premium * units
    return std * 0.85


def setup_chinese_font():
    import matplotlib.font_manager as fm
    want = ["SimHei", "Microsoft YaHei", "Noto Sans CJK SC",
            "PingFang SC", "Heiti SC"]
    available = {f.name for f in fm.fontManager.ttflist}
    for name in want:
        if name in available:
            plt.rcParams["font.sans-serif"] = [name, "DejaVu Sans"]
            plt.rcParams["axes.unicode_minus"] = False
            return name
    cjk = [f.name for f in fm.fontManager.ttflist if any(k in f.name for k in ["Hei", "CJK"])]
    if cjk:
        plt.rcParams["font.sans-serif"] = cjk + ["DejaVu Sans"]
    return "DejaVu Sans"


def main():
    print("=" * 60)
    print("  南宁家政 AI 定价 — 回测")
    print("=" * 60)

    setup_chinese_font()

    # 1. 初始化
    print("\n[1/5] 初始化引擎...")
    engine = PricingEngine()
    cc = CostCalculator()
    print(f"  模型已加载: {engine._model_loaded}")

    # 2. 加载测试数据（2026年数据）
    print("\n[2/5] 加载测试数据...")
    data_path = os.path.join(BASE_DIR, "data", "nanning", "sample_orders.csv")
    df = pd.read_csv(data_path)
    df["下单时间"] = pd.to_datetime(df["下单时间"])
    df_test = df[df["下单时间"] >= "2026-01-01"].copy()
    print(f"  测试集: {len(df_test)} 条订单")

    # 3. 逐笔回测
    print("\n[3/5] 逐笔回测三种定价模式..."
          "\n      这可能需要一些时间，请稍候...")

    results = []
    for idx, row in df_test.iterrows():
        st = row["服务类型"]
        sl = row["服务等级"]
        dist = row["城区"]
        dur = float(row["服务时长"])
        actual_price = float(row["订单金额"])
        order_dt = row["下单时间"].to_pydatetime()

        # 从订单数据提取实际参数
        apt = row.get("户型", "3室")
        if not isinstance(apt, str) or pd.isna(apt):
            apt = "3室"
        # 根据下单时间推断时间段
        wd = order_dt.weekday()
        m = order_dt.month
        if m == 1:
            tp = "旺季"  # 春节前
        elif m in (3, 4):
            tp = "旺季"  # 回南天/三月三
        elif wd >= 5:
            tp = "周末"
        else:
            tp = "工作日"

        # AI 定价 (传入订单日期和实际参数)
        ai_result = engine.get_price(st, sl, dist, dur, apartment_type=apt,
                                     time_period=tp, mode="ai", order_date=order_dt)
        # 规则定价 (传入订单日期和实际参数)
        rule_result = engine.get_price(st, sl, dist, dur, apartment_type=apt,
                                       time_period=tp, mode="rule", order_date=order_dt)
        # 旧模型定价
        old_price = old_model_price(st, sl, dist, dur)
        # 保本价
        cost = cc.calculate_cost(st, sl, dist, dur, apartment_type=apt)
        break_even = cost.break_even_price

        results.append({
            "订单ID": row["订单ID"],
            "下单时间": row["下单时间"].strftime("%Y-%m-%d"),
            "城区": dist,
            "服务类型": st,
            "服务等级": sl,
            "服务时长": dur,
            "实际成交价": actual_price,
            "保本价": round(break_even, 2),
            "AI定价": ai_result["final_price"],
            "规则定价": rule_result["final_price"],
            "旧模型定价": round(old_price, 2),
            "AI毛利率": round((ai_result["final_price"] - break_even) / ai_result["final_price"] * 100, 2) if ai_result["final_price"] > 0 else 0,
            "规则毛利率": round((rule_result["final_price"] - break_even) / rule_result["final_price"] * 100, 2) if rule_result["final_price"] > 0 else 0,
            "是否亏损(AI)": "是" if ai_result["final_price"] < break_even else "否",
            "是否亏损(规则)": "是" if rule_result["final_price"] < break_even else "否",
            "是否亏损(旧模型)": "是" if old_price < break_even else "否",
        })

    result_df = pd.DataFrame(results)
    n = len(result_df)

    # 4. 汇总统计
    print("\n[4/5] 汇总统计...")

    # 亏损率
    loss_ai = (result_df["是否亏损(AI)"] == "是").sum()
    loss_rule = (result_df["是否亏损(规则)"] == "是").sum()
    loss_old = (result_df["是否亏损(旧模型)"] == "是").sum()

    # 平均毛利率
    margin_ai = result_df["AI毛利率"].mean()
    margin_rule = result_df["规则毛利率"].mean()
    old_margins = []
    for _, row in result_df.iterrows():
        old_p = row["旧模型定价"]
        be = row["保本价"]
        old_margins.append((old_p - be) / old_p * 100 if old_p > 0 else 0)
    margin_old = np.mean(old_margins)

    # 定价准确率（相对实际成交价的偏差，1 - |pred-actual|/(actual+1)）
    def calc_accuracy(col):
        return np.mean(1 - np.abs(result_df[col].values - result_df["实际成交价"].values) /
                       (result_df["实际成交价"].values + 1))

    # MAPE (Mean Absolute Percentage Error)
    def calc_mape(col):
        actuals = result_df["实际成交价"].values
        preds = result_df[col].values
        return np.mean(np.abs((actuals - preds) / (actuals + 1e-6))) * 100

    acc_ai = calc_accuracy("AI定价")
    acc_rule = calc_accuracy("规则定价")
    acc_old = calc_accuracy("旧模型定价")

    mape_ai = calc_mape("AI定价")
    mape_rule = calc_mape("规则定价")
    mape_old = calc_mape("旧模型定价")

    # 更有信息量的指标：定价超出保本价的中位数倍数
    median_mult_ai = np.median(result_df["AI定价"].values / result_df["保本价"].values)
    median_mult_rule = np.median(result_df["规则定价"].values / result_df["保本价"].values)

    summary = {
        "测试订单数": n,
        "AI定价_亏损率": f"{loss_ai/n*100:.2f}%",
        "规则定价_亏损率": f"{loss_rule/n*100:.2f}%",
        "旧模型_亏损率": f"{loss_old/n*100:.2f}%",
        "AI定价_平均毛利率": f"{margin_ai:.2f}%",
        "规则定价_平均毛利率": f"{margin_rule:.2f}%",
        "旧模型_平均毛利率": f"{margin_old:.2f}%",
        "AI定价_准确率": f"{acc_ai:.2%}",
        "规则定价_准确率": f"{acc_rule:.2%}",
        "旧模型_准确率": f"{acc_old:.2%}",
        "AI定价_MAPE": f"{mape_ai:.2f}%",
        "规则定价_MAPE": f"{mape_rule:.2f}%",
        "旧模型_MAPE": f"{mape_old:.2f}%",
        "AI定价_中位数倍率": round(float(median_mult_ai), 3),
        "规则定价_中位数倍率": round(float(median_mult_rule), 3),
    }

    print("\n  === 回测对比 ===")
    print(f"  {'指标':<25} {'AI定价':<15} {'规则定价':<15} {'旧模型':<15}")
    print(f"  {'-'*65}")
    print(f"  {'亏损率':<25} {summary['AI定价_亏损率']:<15} {summary['规则定价_亏损率']:<15} {summary['旧模型_亏损率']:<15}")
    print(f"  {'平均毛利率':<25} {summary['AI定价_平均毛利率']:<15} {summary['规则定价_平均毛利率']:<15} {summary['旧模型_平均毛利率']:<15}")
    print(f"  {'定价准确率':<25} {summary['AI定价_准确率']:<15} {summary['规则定价_准确率']:<15} {summary['旧模型_准确率']:<15}")
    print(f"  {'MAPE':<25} {summary['AI定价_MAPE']:<15} {summary['规则定价_MAPE']:<15} {summary['旧模型_MAPE']:<15}")
    print(f"  {'中位数倍率(vs保本价)':<25} {summary['AI定价_中位数倍率']:<15} {summary['规则定价_中位数倍率']:<15} {'—':<15}")

    # ---- 专项分析 ----
    print("\n\n  --- 专项分析 ---")

    # 回南天专项
    df_test["月份"] = df_test["下单时间"].dt.month
    hn_mask = (df_test["月份"].isin([3, 4])) & (df_test["服务类型"] == "深度清洁")
    if hn_mask.sum() > 0:
        hn_results = result_df[hn_mask.values]
        hn_old_mean = hn_results["旧模型定价"].mean()
        hn_ai_mean = hn_results["AI定价"].mean()
        hn_actual_mean = hn_results["实际成交价"].mean()
        print(f"\n  [回南天专项] {hn_mask.sum()} 笔深度清洁订单:")
        print(f"    实际成交均价: ¥{hn_actual_mean:.1f}")
        print(f"    旧模型定价均价: ¥{hn_old_mean:.1f}")
        print(f"    AI定价均价: ¥{hn_ai_mean:.1f}")
        if hn_actual_mean > 0:
            hn_old_gap = (hn_old_mean - hn_actual_mean) / hn_actual_mean * 100
            hn_ai_gap = (hn_ai_mean - hn_actual_mean) / hn_actual_mean * 100
            print(f"    旧模型 vs 实际: {hn_old_gap:.1f}%")
            print(f"    AI定价 vs 实际: {hn_ai_gap:.1f}%")
        summary["回南天_深度清洁_订单数"] = int(hn_mask.sum())
        summary["回南天_AI均价"] = round(hn_ai_mean, 1)
        summary["回南天_旧模型均价"] = round(hn_old_mean, 1)

    # 各城区
    districts = ["青秀", "良庆", "江南", "西乡塘", "兴宁", "邕宁", "武鸣"]
    print(f"\n  [各城区亏损率]")
    print(f"  {'城区':<8} {'AI亏损率':<12} {'规则亏损率':<12} {'旧模型亏损率':<12}")
    dist_summary = {}
    for d in districts:
        mask = result_df["城区"] == d
        if mask.sum() == 0:
            continue
        subset = result_df[mask]
        dl_ai = (subset["是否亏损(AI)"] == "是").sum()
        dl_rule = (subset["是否亏损(规则)"] == "是").sum()
        dl_old = (subset["是否亏损(旧模型)"] == "是").sum()
        cnt = len(subset)
        print(f"  {d:<8} {dl_ai/cnt*100:<11.1f}% {dl_rule/cnt*100:<11.1f}% {dl_old/cnt*100:<11.1f}%")
        dist_summary[d] = {
            "总订单": cnt,
            "AI亏损率": f"{dl_ai/cnt*100:.1f}%",
            "规则亏损率": f"{dl_rule/cnt*100:.1f}%",
            "旧模型亏损率": f"{dl_old/cnt*100:.1f}%",
        }
    summary["各城区"] = dist_summary

    # ---- 保存结果 ----
    print("\n[5/5] 保存回测结果...")
    output_dir = os.path.join(BASE_DIR, "output")
    result_path = os.path.join(output_dir, "backtest_results.json")
    with open(result_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f"  [OK] 回测结果: {result_path}")

    # ---- 对比图表 ----
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))

    # 子图1: 亏损率对比
    ax = axes[0, 0]
    labels = ["AI定价", "规则定价", "旧模型"]
    loss_rates = [loss_ai/n*100, loss_rule/n*100, loss_old/n*100]
    colors = ["#2563eb", "#16a34a", "#dc2626"]
    bars = ax.bar(labels, loss_rates, color=colors, width=0.5)
    for bar, v in zip(bars, loss_rates):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5,
                f"{v:.1f}%", ha="center", fontsize=11, fontweight="bold")
    ax.set_title("亏损率对比", fontsize=13)
    ax.set_ylabel("亏损率 (%)")
    ax.set_ylim(0, max(loss_rates) * 1.3)

    # 子图2: 平均毛利率对比
    ax = axes[0, 1]
    margins = [margin_ai, margin_rule, margin_old]
    bars = ax.bar(labels, margins, color=colors, width=0.5)
    for bar, v in zip(bars, margins):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.3,
                f"{v:.1f}%", ha="center", fontsize=11, fontweight="bold")
    ax.set_title("平均毛利率对比", fontsize=13)
    ax.set_ylabel("毛利率 (%)")

    # 子图3: 各城区亏损率
    ax = axes[1, 0]
    x = range(len(districts))
    ai_losses = []
    rule_losses = []
    old_losses = []
    dist_labels = []
    for d in districts:
        mask = result_df["城区"] == d
        if mask.sum() < 5:
            continue
        subset = result_df[mask]
        cnt = len(subset)
        ai_losses.append((subset["是否亏损(AI)"] == "是").sum() / cnt * 100)
        rule_losses.append((subset["是否亏损(规则)"] == "是").sum() / cnt * 100)
        old_losses.append((subset["是否亏损(旧模型)"] == "是").sum() / cnt * 100)
        dist_labels.append(d)

    x = range(len(dist_labels))
    w = 0.25
    ax.bar([i - w for i in x], ai_losses, w, label="AI定价", color="#2563eb")
    ax.bar([i for i in x], rule_losses, w, label="规则定价", color="#16a34a")
    ax.bar([i + w for i in x], old_losses, w, label="旧模型", color="#dc2626")
    ax.set_xticks(x)
    ax.set_xticklabels(dist_labels)
    ax.set_title("各城区亏损率对比", fontsize=13)
    ax.set_ylabel("亏损率 (%)")
    ax.legend(fontsize=10)

    # 子图4: 定价准确率
    ax = axes[1, 1]
    accs = [acc_ai*100, acc_rule*100, acc_old*100]
    bars = ax.bar(labels, accs, color=colors, width=0.5)
    for bar, v in zip(bars, accs):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5,
                f"{v:.1f}%", ha="center", fontsize=11, fontweight="bold")
    ax.set_title("定价准确率对比", fontsize=13)
    ax.set_ylabel("准确率 (%)")
    ax.set_ylim(0, 100)

    plt.tight_layout()
    fig_dir = os.path.join(output_dir, "figures")
    os.makedirs(fig_dir, exist_ok=True)
    fig_path = os.path.join(fig_dir, "backtest_comparison.png")
    fig.savefig(fig_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  [OK] 对比图表: {fig_path}")

    print(f"\n{'=' * 60}")
    print(f"  回测完成!")
    print(f"{'=' * 60}")
    return summary


if __name__ == "__main__":
    main()
