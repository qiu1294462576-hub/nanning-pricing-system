#!/usr/bin/env python3
"""
南宁家政市场统计建模分析 — Phase 2
基于 sample_orders.csv 及相关辅助数据，量化定价影响因素，
生成分析图表和交互式看板数据。
"""

import os
import sys
import json
import warnings
from datetime import datetime, date

import yaml
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import matplotlib.ticker as mticker
import seaborn as sns
from scipy import stats
from scipy.stats import spearmanr, pearsonr, f_oneway, kruskal

warnings.filterwarnings("ignore")

# ============================================================
# Paths
# ============================================================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data", "nanning")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
FIG_DIR = os.path.join(OUTPUT_DIR, "figures")

os.makedirs(FIG_DIR, exist_ok=True)

# ============================================================
# Chinese font setup
# ============================================================
def setup_chinese_font():
    """Detect and configure a CJK-capable font for matplotlib."""
    want_fonts = ["SimHei", "Microsoft YaHei", "Noto Sans CJK SC",
                  "WenQuanYi Micro Hei", "WenQuanYi Zen Hei",
                  "PingFang SC", "Heiti SC", "STHeiti",
                  "Source Han Sans SC", "Noto Sans SC"]
    available = {f.name for f in fm.fontManager.ttflist}
    for name in want_fonts:
        if name in available:
            plt.rcParams["font.sans-serif"] = [name, "DejaVu Sans"]
            plt.rcParams["axes.unicode_minus"] = False
            return name
    # Fallback: register all CJK fonts found
    cjk_fonts = [f.name for f in fm.fontManager.ttflist
                 if any(k in f.name for k in ["Hei", "Song", "Ming", "CJK", "Gothic", "Maru", "Mincho"])]
    if cjk_fonts:
        plt.rcParams["font.sans-serif"] = cjk_fonts + ["DejaVu Sans"]
        plt.rcParams["axes.unicode_minus"] = False
        return cjk_fonts[0]
    plt.rcParams["axes.unicode_minus"] = False
    return "DejaVu Sans"

FONT_NAME = setup_chinese_font()
print(f"[INFO] Using font: {FONT_NAME}")

# ============================================================
# 1. Data Loading
# ============================================================

def load_config():
    """Load config.yaml using PyYAML."""
    config_path = os.path.join(BASE_DIR, "config.yaml")
    with open(config_path, "r", encoding="utf-8") as f:
        raw = yaml.safe_load(f)
    # Build simplified district map
    districts_map = {}
    for d in raw.get("districts", []):
        districts_map[d["name"]] = {
            "premium": float(d["premium"]),
            "tier": d.get("tier", ""),
        }
    # Build cost structure
    cost_struct = {}
    cs = raw.get("cost_structure", {})
    for k, v in cs.items():
        try:
            cost_struct[k] = float(v)
        except (ValueError, TypeError):
            pass
    return {
        "districts": districts_map,
        "cost_structure": cost_struct,
        "service_types": raw.get("service_types", []),
        "season_multipliers": raw.get("season_multipliers", {}),
    }


def load_orders():
    df = pd.read_csv(os.path.join(DATA_DIR, "sample_orders.csv"))
    df["下单时间"] = pd.to_datetime(df["下单时间"])
    df["日期"] = df["下单时间"].dt.date
    df["月份"] = df["下单时间"].dt.month
    df["月份标签"] = df["下单时间"].dt.strftime("%Y-%m")
    df["星期"] = df["下单时间"].dt.dayofweek  # 0=Mon, 6=Sun
    df["周几"] = df["下单时间"].dt.day_name()
    return df


def load_cost_benchmark():
    """Load cost benchmark, build lookup: (service_type, skill_level, district) -> adjusted_rate."""
    df = pd.read_csv(os.path.join(DATA_DIR, "cost_benchmark.csv"))
    # Only rows with district-specific rates (contain '-')
    district_rows = df[df["服务等级"].str.contains("-", na=False)].copy()
    # Parse district-service-skill from 服务等级 field like "青秀-新手"
    district_rows["parsed_district"] = district_rows["服务等级"].str.split("-").str[0]
    district_rows["parsed_skill"] = district_rows["服务等级"].str.split("-").str[1]
    lookup = {}
    for _, row in district_rows.iterrows():
        key = (row["parsed_district"], row["服务类型"], row["parsed_skill"])
        lookup[key] = float(row["含区域加价"])
    return lookup


def load_area_economic():
    df = pd.read_csv(os.path.join(DATA_DIR, "area_economic_data.csv"))
    community_lookup = {}
    district_tier = {}
    for _, row in df.iterrows():
        community_lookup[(row["城区"], row["小区名称"])] = {
            "tier": row["档次标签"],
            "coefficient": float(row["加价系数"]),
            "housing_price": float(row["城区均价"]),
        }
        if row["城区"] not in district_tier:
            district_tier[row["城区"]] = {
                "tier": row["档次标签"],
                "premium": float(row["加价系数"]),
                "avg_price": float(row["城区均价"]),
            }
    return community_lookup, district_tier


def load_holidays():
    df = pd.read_csv(os.path.join(DATA_DIR, "holiday_season_data.csv"))
    return df


def load_supply_demand():
    df = pd.read_csv(os.path.join(DATA_DIR, "supply_demand_data.csv"))
    # Parse 年月 like "2026-01"
    df["year"] = df["年月"].astype(str).str[:4].astype(int)
    df["month"] = df["年月"].astype(str).str[5:7].astype(int)
    return df


def load_competitive():
    df = pd.read_csv(os.path.join(DATA_DIR, "competitive_prices.csv"))
    return df


# ============================================================
# 2. Data Enrichment
# ============================================================

def enrich_orders(orders, config, cost_lookup, community_lookup, district_tier):
    df = orders.copy()

    # District premium from config
    premium_map = {d: cfg["premium"] for d, cfg in config["districts"].items()}
    tier_map = {d: cfg["tier"] for d, cfg in config["districts"].items()}
    df["区域加价系数"] = df["城区"].map(premium_map)
    df["城区档次"] = df["城区"].map(tier_map)

    # Community tier and coefficient
    df["小区档次"] = df.apply(
        lambda r: community_lookup.get((r["城区"], r["小区"]), {}).get("tier", "未知"), axis=1
    )
    df["小区加价系数"] = df.apply(
        lambda r: community_lookup.get((r["城区"], r["小区"]), {}).get("coefficient", 1.0), axis=1
    )

    # Benchmark adjusted rate from cost_lookup
    df["基准单价"] = df.apply(
        lambda r: cost_lookup.get((r["城区"], r["服务类型"], r["服务等级"]),
                                   cost_lookup.get((r["城区"], r["服务类型"], r["服务等级"]), np.nan)),
        axis=1,
    )

    # Fill missing benchmark rates using generic rate (non-district rows in cost_benchmark)
    generic_rates = {
        ("日常保洁", "新手"): 35, ("日常保洁", "熟练"): 40, ("日常保洁", "金牌"): 45,
        ("深度清洁", "新手"): 45, ("深度清洁", "熟练"): 55, ("深度清洁", "金牌"): 65,
        ("开荒保洁", "新手"): 6, ("开荒保洁", "熟练"): 8, ("开荒保洁", "金牌"): 10,
        ("家电清洗", "新手"): 80, ("家电清洗", "熟练"): 100, ("家电清洗", "金牌"): 130,
    }
    df["基准单价_未加价"] = df.apply(
        lambda r: generic_rates.get((r["服务类型"], r["服务等级"]), np.nan), axis=1
    )
    df["基准单价"] = df["基准单价"].fillna(df["基准单价_未加价"] * df["区域加价系数"])

    # Hourly rate services: calculate standard price
    hourly_services = ["日常保洁", "深度清洁"]
    sqm_services = ["开荒保洁"]
    unit_services = ["家电清洗"]

    # For hourly services: standard_price = adjusted_rate * duration
    mask_hourly = df["服务类型"].isin(hourly_services)
    df.loc[mask_hourly, "标准价格"] = df.loc[mask_hourly, "基准单价"] * df.loc[mask_hourly, "服务时长"]

    # For 家电清洗: units = max(1, round(duration/1.5)), standard_price = units * adjusted_rate
    mask_unit = df["服务类型"].isin(unit_services)
    df.loc[mask_unit, "估算台数"] = np.maximum(1, np.round(df.loc[mask_unit, "服务时长"] / 1.5))
    df.loc[mask_unit, "标准价格"] = df.loc[mask_unit, "估算台数"] * df.loc[mask_unit, "基准单价"]

    # For 开荒保洁: area = duration * productivity, standard_price = area * adjusted_rate
    # Productivity rates (sqm/h): novice=18, skilled=15, gold=12
    productivity = {"新手": 18, "熟练": 15, "金牌": 12}
    mask_sqm = df["服务类型"].isin(sqm_services)
    df.loc[mask_sqm, "估算面积"] = df.loc[mask_sqm, "服务时长"] * df.loc[mask_sqm, "服务等级"].map(productivity)
    df.loc[mask_sqm, "标准价格"] = df.loc[mask_sqm, "估算面积"] * df.loc[mask_sqm, "基准单价"]

    # Cost structure (total cost ≈ standard_price * 0.85, assuming 15% benchmark margin)
    BENCHMARK_MARGIN = 0.15
    df["估算成本"] = df["标准价格"] * (1 - BENCHMARK_MARGIN)
    df["毛利润"] = df["订单金额"] - df["估算成本"]
    df["毛利率"] = (df["毛利润"] / df["订单金额"]) * 100
    df["是否亏损"] = df["毛利润"] < 0

    # Season and holiday flags
    df["是否周末"] = df["星期"] >= 5
    df["是否三月三"] = df["下单时间"].apply(
        lambda dt: date(2026, 4, 18) <= dt.date() <= date(2026, 4, 24)
    )
    df["是否回南天"] = (df["月份"].isin([3, 4])) & (df["服务类型"] == "深度清洁")
    df["是否春节"] = df["月份"] == 1

    # Season tier
    def get_season(row):
        m = row["月份"]
        if m == 1:
            return "超级旺季"
        elif m in (3, 4):
            return "超级旺季"
        elif m == 2:
            return "普通旺季"
        else:
            return "平季"
    df["旺季等级"] = df.apply(get_season, axis=1)

    # Implied hourly rate
    df["隐含时薪"] = df["订单金额"] / df["服务时长"]

    return df


# ============================================================
# 3. Analysis Modules
# ============================================================

def analyze_correlation(df):
    """Compute Spearman and ANOVA results for numeric and categorical features."""
    numeric_cols = ["订单金额", "服务时长", "区域加价系数", "小区加价系数", "毛利率", "客户评分", "隐含时薪"]
    numeric_labels = ["订单金额", "服务时长", "区域加价系数", "小区加价系数", "毛利率", "客户评分", "隐含时薪"]

    # Spearman correlation matrix
    corr_data = df[numeric_cols].dropna()
    spearman_mat = np.zeros((len(numeric_cols), len(numeric_cols)))
    pval_mat = np.zeros((len(numeric_cols), len(numeric_cols)))
    for i, c1 in enumerate(numeric_cols):
        for j, c2 in enumerate(numeric_cols):
            r, p = spearmanr(corr_data[c1], corr_data[c2])
            spearman_mat[i][j] = round(r, 3)
            pval_mat[i][j] = round(p, 4)

    # ANOVA for categorical features vs 订单金额
    categorical = {
        "服务类型": "服务类型",
        "城区": "城区",
        "服务等级": "服务等级",
        "小区档次": "小区档次",
        "旺季等级": "旺季等级",
    }
    anova_results = []
    for label, col in categorical.items():
        groups = [g["订单金额"].dropna().values for _, g in df.groupby(col) if len(g) >= 3]
        if len(groups) >= 2:
            f_stat, p_val = f_oneway(*groups)
            h_stat, h_p = kruskal(*groups)
            # Effect size (eta-squared)
            grand_mean = df["订单金额"].mean()
            ss_between = sum(len(g) * (g.mean() - grand_mean) ** 2 for g in groups)
            ss_total = sum((df["订单金额"] - grand_mean) ** 2)
            eta2 = ss_between / ss_total if ss_total > 0 else 0
            anova_results.append({
                "variable": label,
                "f_statistic": round(f_stat, 2),
                "p_value": round(p_val, 6),
                "eta_squared": round(eta2, 4),
                "significant": p_val < 0.05,
            })

    # Weekend, 三月三, 回南天, 春节 t-tests
    flags = {"是否周末": "是否周末", "是否三月三": "是否三月三",
             "是否回南天": "是否回南天", "是否春节": "是否春节"}
    flag_results = []
    for label, col in flags.items():
        group_true = df[df[col] == True]["订单金额"]
        group_false = df[df[col] == False]["订单金额"]
        if len(group_true) >= 3 and len(group_false) >= 3:
            t_stat, t_p = stats.ttest_ind(group_true, group_false)
            flag_results.append({
                "variable": label,
                "true_mean": round(group_true.mean(), 1),
                "false_mean": round(group_false.mean(), 1),
                "diff_pct": round((group_true.mean() - group_false.mean()) / group_false.mean() * 100, 1),
                "t_statistic": round(t_stat, 2),
                "p_value": round(t_p, 6),
                "significant": t_p < 0.05,
            })

    return {
        "spearman_matrix": spearman_mat.tolist(),
        "numeric_labels": numeric_labels,
        "anova_results": anova_results,
        "flag_tests": flag_results,
    }


def analyze_seasonal(df):
    """Monthly and weekly aggregation for seasonal analysis."""
    # Monthly aggregation
    monthly = df.groupby("月份标签").agg(
        平均客单价=("订单金额", "mean"),
        平均利润率=("毛利率", "mean"),
        订单量=("订单ID", "count"),
        中位数客单价=("订单金额", "median"),
    ).reset_index()
    monthly.columns = ["月份", "平均客单价", "平均利润率", "订单量", "中位数客单价"]
    monthly = monthly.sort_values("月份")

    # Weekly aggregation
    df_weekly = df.copy()
    df_weekly["周"] = df_weekly["下单时间"].dt.isocalendar().week.astype(int)
    weekly = df_weekly.groupby("周").agg(
        平均客单价=("订单金额", "mean"),
        平均利润率=("毛利率", "mean"),
        订单量=("订单ID", "count"),
    ).reset_index()

    # 三月三 week comparison
    sanyuesan_mask = df["是否三月三"]
    sanyuesan_stats = {
        "avg_price_sanyuesan": round(df[sanyuesan_mask]["订单金额"].mean(), 1) if sanyuesan_mask.sum() > 0 else 0,
        "avg_price_normal": round(df[~sanyuesan_mask]["订单金额"].mean(), 1),
        "avg_margin_sanyuesan": round(df[sanyuesan_mask]["毛利率"].mean(), 1) if sanyuesan_mask.sum() > 0 else 0,
        "avg_margin_normal": round(df[~sanyuesan_mask]["毛利率"].mean(), 1),
        "order_count_sanyuesan": int(sanyuesan_mask.sum()),
    }

    # 回南天 comparison
    huinantian_mask = df["是否回南天"]
    huinantian_stats = {
        "avg_price_huinantian": round(df[huinantian_mask]["订单金额"].mean(), 1) if huinantian_mask.sum() > 0 else 0,
        "avg_price_normal": round(df[~huinantian_mask]["订单金额"].mean(), 1),
        "avg_margin_huinantian": round(df[huinantian_mask]["毛利率"].mean(), 1) if huinantian_mask.sum() > 0 else 0,
        "avg_margin_normal": round(df[~huinantian_mask]["毛利率"].mean(), 1),
        "order_count_huinantian": int(huinantian_mask.sum()),
    }

    # District-month aggregation
    district_monthly = df.groupby(["城区", "月份标签"]).agg(
        平均客单价=("订单金额", "mean"),
        订单量=("订单ID", "count"),
        平均利润率=("毛利率", "mean"),
        亏损率=("是否亏损", lambda x: x.sum() / len(x) * 100),
    ).reset_index()
    district_monthly.columns = ["城区", "月份", "平均客单价", "订单量", "平均利润率", "亏损率"]

    return {
        "monthly": monthly.to_dict(orient="records"),
        "weekly": weekly.to_dict(orient="records"),
        "sanyuesan": sanyuesan_stats,
        "huinantian": huinantian_stats,
        "district_monthly": district_monthly.to_dict(orient="records"),
    }


def analyze_supply_demand(df, supply_demand):
    """Merge with supply-demand data and build heatmap arrays."""
    sd_all = supply_demand.copy()
    sd_monthly = sd_all.groupby(["year", "month", "城区"]).agg(
        预估需求量=("预估需求量", "sum"),
        预估供给量=("预估供给量", "sum"),
        供需比=("供需比", "mean"),
    ).reset_index()

    districts_order = ["青秀", "良庆", "江南", "西乡塘", "兴宁", "邕宁", "武鸣"]

    # Dynamic months from data
    years_present = sorted(sd_all["year"].unique())
    months_present = sorted(sd_all["month"].unique())

    # Build per-year heatmaps
    heatmaps = {}
    for yr in years_present:
        yr_months = sorted(sd_all[sd_all["year"] == yr]["month"].unique())
        n_m = len(yr_months)
        hs = np.zeros((7, n_m))
        hp = np.zeros((7, n_m))
        ho = np.zeros((7, n_m))
        mlabels = [f"{yr}年{m}月" for m in yr_months]
        for i, dist in enumerate(districts_order):
            for j, m in enumerate(yr_months):
                sd_row = sd_monthly[(sd_monthly["year"] == yr) & (sd_monthly["城区"] == dist) & (sd_monthly["month"] == m)]
                if not sd_row.empty:
                    hs[i][j] = round(sd_row["供需比"].values[0], 2)
                ord_rows = df[(df["城区"] == dist) & (df["月份"] == m) & (df["下单时间"].dt.year == yr)]
                if not ord_rows.empty:
                    hp[i][j] = round(ord_rows["订单金额"].mean(), 0)
                    ho[i][j] = len(ord_rows)
        heatmaps[str(yr)] = {
            "months": mlabels,
            "supply_demand_ratio": hs.tolist(),
            "avg_price": hp.tolist(),
            "order_count": ho.tolist(),
        }

    return {
        "districts": districts_order,
        "heatmaps": heatmaps,
    }


def analyze_loss_orders(df):
    """Diagnose loss-making orders by various dimensions."""
    loss_df = df[df["是否亏损"]].copy()
    all_count = len(df)
    loss_count = len(loss_df)
    loss_rate = loss_count / all_count * 100

    # By district
    loss_by_district = df.groupby("城区").agg(
        总订单=("订单ID", "count"),
        亏损订单=("是否亏损", "sum"),
        亏损率=("是否亏损", lambda x: x.sum() / len(x) * 100),
        平均亏损额=("毛利润", lambda x: abs(x[x < 0].mean()) if (x < 0).sum() > 0 else 0),
        平均毛利率=("毛利率", "mean"),
    ).reset_index()

    # By service type
    loss_by_service = df.groupby("服务类型").agg(
        总订单=("订单ID", "count"),
        亏损订单=("是否亏损", "sum"),
        亏损率=("是否亏损", lambda x: x.sum() / len(x) * 100),
        平均亏损额=("毛利润", lambda x: abs(x[x < 0].mean()) if (x < 0).sum() > 0 else 0),
        平均毛利率=("毛利率", "mean"),
    ).reset_index()

    # By district x service type
    loss_by_dist_svc = df.groupby(["城区", "服务类型"]).agg(
        总订单=("订单ID", "count"),
        亏损订单=("是否亏损", "sum"),
        亏损率=("是否亏损", lambda x: x.sum() / len(x) * 100),
    ).reset_index()

    # By month
    loss_by_month = df.groupby("月份标签").agg(
        总订单=("订单ID", "count"),
        亏损订单=("是否亏损", "sum"),
        亏损率=("是否亏损", lambda x: x.sum() / len(x) * 100),
        平均毛利率=("毛利率", "mean"),
    ).reset_index()
    loss_by_month.columns = ["月份", "总订单", "亏损订单", "亏损率", "平均毛利率"]

    # Top loss orders detail
    loss_detail = loss_df.nlargest(min(50, len(loss_df)), "毛利润")[
        ["订单ID", "城区", "小区", "服务类型", "服务等级", "服务时长",
         "订单金额", "标准价格", "毛利润", "毛利率", "月份标签"]
    ].copy()
    loss_detail.columns = ["订单ID", "城区", "小区", "服务类型", "服务等级", "服务时长",
                           "订单金额", "标准成本", "亏损额", "亏损率", "月份"]

    return {
        "total_orders": all_count,
        "loss_count": loss_count,
        "loss_rate": round(loss_rate, 1),
        "avg_loss_amount": round(abs(loss_df["毛利润"].mean()), 1) if loss_count > 0 else 0,
        "by_district": loss_by_district.to_dict(orient="records"),
        "by_service": loss_by_service.to_dict(orient="records"),
        "by_district_service": loss_by_dist_svc.to_dict(orient="records"),
        "by_month": loss_by_month.to_dict(orient="records"),
        "detail": loss_detail.to_dict(orient="records"),
    }


def analyze_price_sensitivity(df):
    """Price sensitivity: price quartile vs rating, and service-level elasticity."""
    results = []
    for svc in df["服务类型"].unique():
        svc_df = df[df["服务类型"] == svc]
        if len(svc_df) < 10:
            continue
        svc_df["价格分位"] = pd.qcut(svc_df["订单金额"], q=4, labels=["Q1-低", "Q2-中低", "Q3-中高", "Q4-高"],
                                    duplicates="drop")
        quartile_stats = svc_df.groupby("价格分位", observed=False).agg(
            平均价格=("订单金额", "mean"),
            平均评分=("客户评分", "mean"),
            订单量=("订单ID", "count"),
            平均利润率=("毛利率", "mean"),
        ).reset_index()
        results.append({
            "service_type": svc,
            "quartiles": quartile_stats.to_dict(orient="records"),
        })

    # Overall: rating vs implied hourly rate
    df_valid = df[df["服务类型"].isin(["日常保洁", "深度清洁"])].copy()
    price_bins = [0, 30, 45, 60, 80, 200]
    price_labels = ["<30元/h", "30-45元/h", "45-60元/h", "60-80元/h", ">80元/h"]
    df_valid["时薪区间"] = pd.cut(df_valid["隐含时薪"], bins=price_bins, labels=price_labels)
    hourly_stats = df_valid.groupby("时薪区间", observed=False).agg(
        平均评分=("客户评分", "mean"),
        订单量=("订单ID", "count"),
    ).reset_index()

    return {
        "by_service": results,
        "hourly_rate_vs_rating": hourly_stats.to_dict(orient="records"),
    }


def analyze_skill_impact(df):
    """Analyze pricing and margin by service type x skill level."""
    skill_stats = df.groupby(["服务类型", "服务等级"]).agg(
        平均价格=("订单金额", "mean"),
        中位数价格=("订单金额", "median"),
        平均利润率=("毛利率", "mean"),
        订单量=("订单ID", "count"),
        平均评分=("客户评分", "mean"),
    ).reset_index()
    return skill_stats.to_dict(orient="records")


def analyze_channel_impact(df):
    """Price and margin by order source."""
    channel_stats = df.groupby("订单来源").agg(
        平均价格=("订单金额", "mean"),
        平均利润率=("毛利率", "mean"),
        订单量=("订单ID", "count"),
    ).reset_index()
    return channel_stats.to_dict(orient="records")


# ============================================================
# 4. Figure Generation
# ============================================================

def fig_correlation_heatmap(corr_data):
    """Figure 1: Spearman correlation heatmap."""
    mat = np.array(corr_data["spearman_matrix"])
    labels = corr_data["numeric_labels"]
    fig, ax = plt.subplots(figsize=(10, 8))
    mask = np.triu(np.ones_like(mat, dtype=bool), k=1)
    sns.heatmap(mat, mask=mask, annot=True, fmt=".2f", cmap="RdBu_r",
                center=0, vmin=-1, vmax=1, square=True,
                xticklabels=labels, yticklabels=labels,
                linewidths=0.5, cbar_kws={"shrink": 0.8, "label": "Spearman ρ"},
                ax=ax)
    ax.set_title("价格影响因素 Spearman 相关矩阵", fontsize=14, fontweight="bold", pad=16)
    plt.xticks(rotation=30, ha="right", fontsize=9)
    plt.yticks(fontsize=9)
    plt.tight_layout()
    path = os.path.join(FIG_DIR, "correlation_heatmap.png")
    fig.savefig(path, dpi=300, bbox_inches="tight")
    plt.close(fig)
    print(f"  [OK] {path}")


def fig_district_price_margin(df):
    """Figure 2: District avg price (bar) + margin (line) dual-axis."""
    dist_stats = df.groupby("城区").agg(
        平均价格=("订单金额", "mean"),
        平均利润率=("毛利率", "mean"),
    ).reindex(["青秀", "良庆", "江南", "西乡塘", "兴宁", "邕宁", "武鸣"])
    fig, ax1 = plt.subplots(figsize=(10, 6))
    x = range(len(dist_stats))
    bars = ax1.bar(x, dist_stats["平均价格"], color="#2563eb", alpha=0.7, label="平均客单价(元)")
    ax1.set_ylabel("平均客单价 (元)", fontsize=12)
    ax1.set_xticks(x)
    ax1.set_xticklabels(dist_stats.index, fontsize=11)
    # Add value labels
    for bar, val in zip(bars, dist_stats["平均价格"]):
        ax1.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 5,
                 f"{val:.0f}", ha="center", fontsize=9)
    ax2 = ax1.twinx()
    ax2.plot(x, dist_stats["平均利润率"], "o-", color="#dc2626", linewidth=2, markersize=8, label="平均利润率(%)")
    ax2.set_ylabel("平均利润率 (%)", fontsize=12)
    for i, (xi, yi) in enumerate(zip(x, dist_stats["平均利润率"])):
        ax2.annotate(f"{yi:.1f}%", (xi, yi), textcoords="offset points", xytext=(0, 12), ha="center", fontsize=9)
    ax1.set_title("各城区平均客单价与利润率", fontsize=14, fontweight="bold")
    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2, loc="upper left")
    plt.tight_layout()
    path = os.path.join(FIG_DIR, "district_price_margin.png")
    fig.savefig(path, dpi=300, bbox_inches="tight")
    plt.close(fig)
    print(f"  [OK] {path}")


def fig_service_type_analysis(df):
    """Figure 3: Service type x skill level grouped bar (avg margin)."""
    skill_stats = df.groupby(["服务类型", "服务等级"]).agg(
        平均利润率=("毛利率", "mean"),
        订单量=("订单ID", "count"),
    ).reset_index()
    svc_order = ["日常保洁", "深度清洁", "开荒保洁", "家电清洗"]
    skill_order = ["新手", "熟练", "金牌"]
    fig, ax = plt.subplots(figsize=(10, 6))
    x = np.arange(len(svc_order))
    width = 0.22
    colors = ["#93c5fd", "#60a5fa", "#2563eb"]
    for i, (skill, color) in enumerate(zip(skill_order, colors)):
        values = []
        for svc in svc_order:
            row = skill_stats[(skill_stats["服务类型"] == svc) & (skill_stats["服务等级"] == skill)]
            values.append(row["平均利润率"].values[0] if not row.empty else 0)
        bars = ax.bar(x + i * width, values, width, label=skill, color=color)
        for bar, val in zip(bars, values):
            if val != 0:
                ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.3,
                        f"{val:.1f}", ha="center", fontsize=8)
    ax.set_xticks(x + width)
    ax.set_xticklabels(svc_order, fontsize=11)
    ax.set_ylabel("平均利润率 (%)", fontsize=12)
    ax.set_title("服务类型 × 技能等级 平均利润率对比", fontsize=14, fontweight="bold")
    ax.axhline(y=df["毛利率"].mean(), color="#dc2626", linestyle="--", linewidth=1, alpha=0.7, label=f"全局均值 {df['毛利率'].mean():.1f}%")
    ax.legend(loc="upper right")
    plt.tight_layout()
    path = os.path.join(FIG_DIR, "service_type_analysis.png")
    fig.savefig(path, dpi=300, bbox_inches="tight")
    plt.close(fig)
    print(f"  [OK] {path}")


def fig_seasonal_trend(seasonal_data):
    """Figure 4: Monthly trend with annotations for 三月三 and 回南天."""
    monthly = pd.DataFrame(seasonal_data["monthly"])
    fig, ax1 = plt.subplots(figsize=(12, 6))
    x = range(len(monthly))
    months = monthly["月份"].tolist()

    ax1.bar(x, monthly["订单量"], color="#bfdbfe", alpha=0.7, label="月度订单量")
    ax1.set_ylabel("订单量", fontsize=12)
    ax1.set_xticks(x)
    ax1.set_xticklabels(months, fontsize=10)

    ax2 = ax1.twinx()
    ax2.plot(x, monthly["平均客单价"], "o-", color="#2563eb", linewidth=2, markersize=8, label="平均客单价(元)")
    ax2.set_ylabel("平均客单价 (元)", fontsize=12)

    ax3 = ax1.twinx()
    ax3.spines["right"].set_position(("outward", 60))
    ax3.plot(x, monthly["平均利润率"], "s--", color="#dc2626", linewidth=2, markersize=8, label="平均利润率(%)")
    ax3.set_ylabel("平均利润率 (%)", fontsize=12)

    # Annotations
    # 春节前 (January)
    ax1.axvspan(-0.4, 0.4, alpha=0.12, color="#fbbf24", label="春节旺季")
    ax1.annotate("春节前\n超级旺季", xy=(0, ax1.get_ylim()[1] * 0.85),
                fontsize=9, color="#92400e", ha="center", fontweight="bold",
                bbox=dict(boxstyle="round,pad=0.3", facecolor="#fef3c7", alpha=0.9))

    # 回南天 (March-April)
    ax1.axvspan(1.5, 3.5, alpha=0.12, color="#a7f3d0")
    ax1.annotate("回南天\n(深度清洁旺季)", xy=(2.5, ax1.get_ylim()[1] * 0.85),
                fontsize=9, color="#047857", ha="center", fontweight="bold",
                bbox=dict(boxstyle="round,pad=0.3", facecolor="#d1fae5", alpha=0.9))

    # 三月三 (April)
    ax1.annotate("三月三\n(Apr 21)", xy=(3, ax1.get_ylim()[1] * 0.55),
                fontsize=9, color="#b91c1c", ha="center", fontweight="bold",
                bbox=dict(boxstyle="round,pad=0.3", facecolor="#fee2e2", alpha=0.9))

    ax1.set_title("月度订单量、客单价与利润率趋势（2026年1-5月）", fontsize=14, fontweight="bold")
    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    lines3, labels3 = ax3.get_legend_handles_labels()
    ax1.legend(lines1 + lines2 + lines3, labels1 + labels2 + labels3, loc="upper left", fontsize=9)
    plt.tight_layout()
    path = os.path.join(FIG_DIR, "seasonal_trend.png")
    fig.savefig(path, dpi=300, bbox_inches="tight")
    plt.close(fig)
    print(f"  [OK] {path}")


def fig_loss_order_distribution(df):
    """Figure 5: Stacked bar of loss orders by district x service type."""
    loss_by_dist_svc = df.groupby(["城区", "服务类型"]).agg(
        亏损订单=("是否亏损", "sum"),
    ).reset_index()
    pivot = loss_by_dist_svc.pivot(index="城区", columns="服务类型", values="亏损订单").fillna(0)
    dist_order = ["青秀", "良庆", "江南", "西乡塘", "兴宁", "邕宁", "武鸣"]
    pivot = pivot.reindex(dist_order)
    svc_colors = {"日常保洁": "#93c5fd", "深度清洁": "#60a5fa", "开荒保洁": "#2563eb", "家电清洗": "#fbbf24"}
    fig, ax = plt.subplots(figsize=(10, 6))
    bottom = np.zeros(len(pivot))
    for svc in ["日常保洁", "深度清洁", "开荒保洁", "家电清洗"]:
        if svc in pivot.columns:
            vals = pivot[svc].values
            ax.bar(range(len(pivot)), vals, bottom=bottom, label=svc,
                   color=svc_colors.get(svc, "#999"))
            bottom += vals
    # Overlay loss rate line
    loss_rate = df.groupby("城区")["是否亏损"].mean() * 100
    loss_rate = loss_rate.reindex(dist_order)
    ax2 = ax.twinx()
    ax2.plot(range(len(dist_order)), loss_rate.values, "D-", color="#dc2626", linewidth=2, markersize=8, label="亏损率(%)")
    for i, (xi, yi) in enumerate(zip(range(len(dist_order)), loss_rate.values)):
        ax2.annotate(f"{yi:.1f}%", (xi, yi), textcoords="offset points", xytext=(0, 10), ha="center", fontsize=9, color="#dc2626")
    ax.set_xticks(range(len(dist_order)))
    ax.set_xticklabels(dist_order, fontsize=11)
    ax.set_ylabel("亏损订单数", fontsize=12)
    ax2.set_ylabel("亏损率 (%)", fontsize=12)
    ax.set_title("各城区亏损订单分布", fontsize=14, fontweight="bold")
    lines1, labels1 = ax.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax.legend(lines1 + lines2, labels1 + labels2, loc="upper left")
    plt.tight_layout()
    path = os.path.join(FIG_DIR, "loss_order_distribution.png")
    fig.savefig(path, dpi=300, bbox_inches="tight")
    plt.close(fig)
    print(f"  [OK] {path}")


def fig_supply_demand_heatmap(sd_data):
    """Figure 6: Supply-demand ratio heatmaps (district x month) per year."""
    for yr_key, hmap in sd_data["heatmaps"].items():
        mat = np.array(hmap["supply_demand_ratio"])
        n_months = len(hmap["months"])
        fig, ax = plt.subplots(figsize=(max(8, n_months * 1.2), 6))
        sns.heatmap(mat, annot=True, fmt=".2f", cmap="RdYlGn_r",
                    xticklabels=hmap["months"], yticklabels=sd_data["districts"],
                    vmin=0, vmax=5, center=1.5, linewidths=0.5,
                    cbar_kws={"shrink": 0.8, "label": "供需比 (需求/供给)"},
                    ax=ax)
        ax.set_title(f"南宁各城区月度供需比热力图 ({yr_key})", fontsize=14, fontweight="bold", pad=16)
        ax.set_xlabel("月份", fontsize=12)
        ax.set_ylabel("城区", fontsize=12)
        plt.tight_layout()
        path = os.path.join(FIG_DIR, f"supply_demand_heatmap_{yr_key}.png")
        fig.savefig(path, dpi=300, bbox_inches="tight")
        plt.close(fig)
        print(f"  [OK] {path}")


def fig_price_vs_rating(df):
    """Figure 7: Scatter of implied hourly rate vs customer rating."""
    df_plot = df[df["服务类型"].isin(["日常保洁", "深度清洁"])].copy()
    fig, ax = plt.subplots(figsize=(10, 6))
    service_colors = {"日常保洁": "#2563eb", "深度清洁": "#059669"}
    for svc, color in service_colors.items():
        svc_data = df_plot[df_plot["服务类型"] == svc]
        ax.scatter(svc_data["隐含时薪"], svc_data["客户评分"],
                  c=color, label=svc, alpha=0.6, s=60, edgecolors="white", linewidth=0.5)
    # Trend line
    from numpy.polynomial.polynomial import polyfit
    x_all = df_plot["隐含时薪"]
    y_all = df_plot["客户评分"]
    mask = ~(x_all.isna() | y_all.isna())
    if mask.sum() > 3:
        b, m = polyfit(x_all[mask], y_all[mask], 1)
        x_line = np.linspace(x_all.min(), x_all.max(), 100)
        ax.plot(x_line, b + m * x_line, "--", color="#dc2626", linewidth=1.5, alpha=0.7, label="趋势线")
    ax.set_xlabel("隐含时薪 (元/小时)", fontsize=12)
    ax.set_ylabel("客户评分", fontsize=12)
    ax.set_title("价格 vs 客户满意度（日常保洁 & 深度清洁）", fontsize=14, fontweight="bold")
    ax.legend()
    plt.tight_layout()
    path = os.path.join(FIG_DIR, "price_vs_rating_scatter.png")
    fig.savefig(path, dpi=300, bbox_inches="tight")
    plt.close(fig)
    print(f"  [OK] {path}")


def fig_margin_distribution(df):
    """Figure 8: Margin distribution histogram by season tier."""
    fig, ax = plt.subplots(figsize=(10, 6))
    season_colors = {"超级旺季": "#dc2626", "普通旺季": "#f59e0b", "平季": "#2563eb"}
    for season, color in season_colors.items():
        subset = df[df["旺季等级"] == season]["毛利率"]
        if len(subset) > 0:
            ax.hist(subset, bins=25, alpha=0.45, color=color, label=f"{season} (n={len(subset)})", edgecolor="white")
    ax.axvline(x=0, color="#dc2626", linestyle="--", linewidth=1.5, alpha=0.7, label="盈亏线")
    ax.axvline(x=df["毛利率"].mean(), color="#1e3a5f", linestyle="--", linewidth=1.5, alpha=0.7,
              label=f"均值 {df['毛利率'].mean():.1f}%")
    ax.set_xlabel("毛利率 (%)", fontsize=12)
    ax.set_ylabel("订单数", fontsize=12)
    ax.set_title("毛利率分布（按旺季等级着色）", fontsize=14, fontweight="bold")
    ax.legend(loc="upper right")
    plt.tight_layout()
    path = os.path.join(FIG_DIR, "margin_distribution.png")
    fig.savefig(path, dpi=300, bbox_inches="tight")
    plt.close(fig)
    print(f"  [OK] {path}")


# ============================================================
# 5. JSON Export
# ============================================================

def export_dashboard_data(df, corr_data, seasonal_data, sd_data, loss_data,
                          sensitivity_data, skill_data, channel_data):
    """Export all dashboard data as a JS file with const ANALYSIS_DATA = {...};"""
    # KPI summary
    kpi = {
        "total_orders": len(df),
        "avg_price": round(df["订单金额"].mean(), 1),
        "median_price": round(df["订单金额"].median(), 1),
        "avg_margin_pct": round(df["毛利率"].mean(), 1),
        "median_margin_pct": round(df["毛利率"].median(), 1),
        "loss_rate": round(df["是否亏损"].mean() * 100, 1),
        "total_revenue": round(df["订单金额"].sum(), 0),
        "total_profit": round(df["毛利润"].sum(), 0),
        "avg_duration": round(df["服务时长"].mean(), 1),
    }

    # District summary
    district_summary = df.groupby("城区").agg(
        平均价格=("订单金额", "mean"),
        中位数价格=("订单金额", "median"),
        平均利润率=("毛利率", "mean"),
        订单量=("订单ID", "count"),
        亏损率=("是否亏损", lambda x: x.sum() / len(x) * 100),
    ).reindex(["青秀", "良庆", "江南", "西乡塘", "兴宁", "邕宁", "武鸣"]).reset_index()
    district_summary = district_summary.round(1)

    # Service summary
    service_summary = df.groupby("服务类型").agg(
        平均价格=("订单金额", "mean"),
        中位数价格=("订单金额", "median"),
        平均利润率=("毛利率", "mean"),
        订单量=("订单ID", "count"),
        亏损率=("是否亏损", lambda x: x.sum() / len(x) * 100),
    ).reset_index().round(1)

    # Season summary
    season_summary = df.groupby("旺季等级").agg(
        平均价格=("订单金额", "mean"),
        平均利润率=("毛利率", "mean"),
        订单量=("订单ID", "count"),
    ).reset_index().round(1)

    # Orders row-level data (for drill-down table)
    orders_detail = df[["订单ID", "下单时间", "城区", "小区", "服务类型", "服务等级",
                        "服务时长", "订单金额", "标准价格", "毛利润", "毛利率", "客户评分",
                        "订单来源", "小区档次", "是否周末", "是否三月三", "是否回南天",
                        "是否春节", "旺季等级", "月份标签", "隐含时薪"]].copy()
    orders_detail["下单时间"] = orders_detail["下单时间"].dt.strftime("%Y-%m-%d")
    orders_detail = orders_detail.round(2)

    # Influence factors for heatmap
    influence_factors = []
    # From ANOVA
    for r in corr_data["anova_results"]:
        influence_factors.append({
            "factor": r["variable"],
            "eta_squared": r["eta_squared"],
            "significant": r["significant"],
            "p_value": r["p_value"],
        })
    # From flag tests
    for r in corr_data["flag_tests"]:
        influence_factors.append({
            "factor": r["variable"],
            "diff_pct": r["diff_pct"],
            "significant": r["significant"],
            "p_value": r["p_value"],
        })

    # Build final payload
    payload = {
        "kpi": kpi,
        "district_summary": district_summary.to_dict(orient="records"),
        "service_summary": service_summary.to_dict(orient="records"),
        "season_summary": season_summary.to_dict(orient="records"),
        "correlation": {
            "matrix": corr_data["spearman_matrix"],
            "labels": corr_data["numeric_labels"],
        },
        "influence_factors": influence_factors,
        "seasonal": seasonal_data,
        "supply_demand": sd_data,
        "loss_analysis": loss_data,
        "price_sensitivity": sensitivity_data,
        "skill_analysis": skill_data,
        "channel_analysis": channel_data,
        "orders_detail": orders_detail.to_dict(orient="records"),
    }

    # Convert numpy types to native Python for JSON serialization
    def convert_numpy(obj):
        if isinstance(obj, (np.integer,)):
            return int(obj)
        elif isinstance(obj, (np.floating,)):
            return float(obj)
        elif isinstance(obj, (np.bool_,)):
            return bool(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, dict):
            return {k: convert_numpy(v) for k, v in obj.items()}
        elif isinstance(obj, (list, tuple)):
            return [convert_numpy(item) for item in obj]
        return obj

    payload = convert_numpy(payload)
    js_path = os.path.join(OUTPUT_DIR, "analysis_data.js")
    json_str = json.dumps(payload, ensure_ascii=False, indent=2)
    with open(js_path, "w", encoding="utf-8") as f:
        f.write("const ANALYSIS_DATA = ")
        f.write(json_str)
        f.write(";\n")
    print(f"\n[OK] Dashboard data written to {js_path}")
    print(f"     File size: {len(json_str):,} chars")

    return payload


# ============================================================
# 6. Main
# ============================================================

def print_summary(df, loss_data):
    """Print analysis summary to stdout."""
    print("\n" + "=" * 60)
    print("  南宁家政市场统计建模分析 — 摘要")
    print("=" * 60)
    print(f"  总订单数:       {len(df)}")
    print(f"  平均客单价:     {df['订单金额'].mean():.1f} 元")
    print(f"  中位数客单价:   {df['订单金额'].median():.1f} 元")
    print(f"  平均毛利率:     {df['毛利率'].mean():.1f}%")
    print(f"  亏损率:         {loss_data['loss_rate']:.1f}% ({loss_data['loss_count']}/{loss_data['total_orders']})")
    print(f"  数据周期:       {df['下单时间'].min().strftime('%Y-%m-%d')} 至 {df['下单时间'].max().strftime('%Y-%m-%d')}")

    # Top findings
    print("\n  [关键发现]")
    dist_margin = df.groupby("城区")["毛利率"].mean().sort_values()
    print(f"  利润率最低城区: {dist_margin.index[0]} ({dist_margin.iloc[0]:.1f}%)")
    print(f"  利润率最高城区: {dist_margin.index[-1]} ({dist_margin.iloc[-1]:.1f}%)")

    svc_margin = df.groupby("服务类型")["毛利率"].mean().sort_values()
    print(f"  利润率最低服务: {svc_margin.index[0]} ({svc_margin.iloc[0]:.1f}%)")
    print(f"  利润率最高服务: {svc_margin.index[-1]} ({svc_margin.iloc[-1]:.1f}%)")

    # Nanning-specific
    sanyuesan = df[df["是否三月三"]]
    if len(sanyuesan) > 0:
        print(f"  三月三期间均价: {sanyuesan['订单金额'].mean():.1f} 元 (vs 全期 {df['订单金额'].mean():.1f} 元)")
    huinan = df[df["是否回南天"]]
    if len(huinan) > 0:
        print(f"  回南天深度清洁均价: {huinan['订单金额'].mean():.1f} 元 (vs 全期深度清洁 {df[df['服务类型']=='深度清洁']['订单金额'].mean():.1f} 元)")

    print("=" * 60 + "\n")


def main():
    print("[1/6] Loading data...")
    config = load_config()
    orders = load_orders()
    cost_lookup = load_cost_benchmark()
    community_lookup, district_tier = load_area_economic()
    holidays = load_holidays()
    supply_demand = load_supply_demand()
    competitive = load_competitive()
    print(f"      Orders: {len(orders)} | Cost benchmarks: {len(cost_lookup)} | Communities: {len(community_lookup)}")
    print(f"      Supply-demand rows: {len(supply_demand)} | Competitive prices: {len(competitive)}")

    print("[2/6] Enriching orders with cost, margin, and season flags...")
    df = enrich_orders(orders, config, cost_lookup, community_lookup, district_tier)
    loss_count = df["是否亏损"].sum()
    print(f"      Enriched: {len(df)} orders | Loss orders: {loss_count} ({loss_count/len(df)*100:.1f}%)")

    print("[3/6] Running statistical analyses...")
    corr_data = analyze_correlation(df)
    seasonal_data = analyze_seasonal(df)
    sd_data = analyze_supply_demand(df, supply_demand)
    loss_data = analyze_loss_orders(df)
    sensitivity_data = analyze_price_sensitivity(df)
    skill_data = analyze_skill_impact(df)
    channel_data = analyze_channel_impact(df)
    print(f"      ANOVA factors: {len(corr_data['anova_results'])} | Seasonal months: {len(seasonal_data['monthly'])}")

    print("[4/6] Generating figures...")
    fig_correlation_heatmap(corr_data)
    fig_district_price_margin(df)
    fig_service_type_analysis(df)
    fig_seasonal_trend(seasonal_data)
    fig_loss_order_distribution(df)
    fig_supply_demand_heatmap(sd_data)
    fig_price_vs_rating(df)
    fig_margin_distribution(df)

    print("[5/6] Exporting dashboard data...")
    export_dashboard_data(df, corr_data, seasonal_data, sd_data, loss_data,
                          sensitivity_data, skill_data, channel_data)

    print("[6/6] Summary")
    print_summary(df, loss_data)
    print("Done! All Phase 2 deliverables generated.")


if __name__ == "__main__":
    main()
