"""
南宁家政 AI 定价 — 模型训练脚本
=================================
从 sample_orders.csv 加载数据，构造特征，训练 XGBoost 模型，
输出特征重要性图和模型文件。
"""

import os
import sys
import warnings

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

warnings.filterwarnings("ignore")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from core.feature_engineer import FeatureEngineer
from core.ml_pricing_model import MLPricingModel


def setup_chinese_font():
    """Set up CJK-capable font (reuse from statistical_analysis.py)."""
    import matplotlib.font_manager as fm
    want_fonts = ["SimHei", "Microsoft YaHei", "Noto Sans CJK SC",
                  "WenQuanYi Micro Hei", "PingFang SC", "Heiti SC"]
    available = {f.name for f in fm.fontManager.ttflist}
    for name in want_fonts:
        if name in available:
            plt.rcParams["font.sans-serif"] = [name, "DejaVu Sans"]
            plt.rcParams["axes.unicode_minus"] = False
            return name
    cjk = [f.name for f in fm.fontManager.ttflist
           if any(k in f.name for k in ["Hei", "Song", "CJK"])]
    if cjk:
        plt.rcParams["font.sans-serif"] = cjk + ["DejaVu Sans"]
        plt.rcParams["axes.unicode_minus"] = False
        return cjk[0]
    return "DejaVu Sans"


def load_data() -> pd.DataFrame:
    """加载 sample_orders.csv"""
    path = os.path.join(BASE_DIR, "data", "nanning", "sample_orders.csv")
    if not os.path.exists(path):
        raise FileNotFoundError(f"订单数据未找到: {path}")
    df = pd.read_csv(path)
    df["下单时间"] = pd.to_datetime(df["下单时间"])
    print(f"  数据加载完成: {len(df)} 条订单")
    return df


def split_by_time(df: pd.DataFrame, split_date: str = "2026-01-01"):
    """按时间划分训练集/验证集"""
    split_dt = pd.to_datetime(split_date)
    train = df[df["下单时间"] < split_dt].copy()
    val = df[df["下单时间"] >= split_dt].copy()
    print(f"  训练集: {len(train)} 条 ({split_date} 之前)")
    print(f"  验证集: {len(val)} 条 ({split_date} 及之后)")
    return train, val


def plot_feature_importance(importance: dict, output_path: str):
    """绘制特征重要性图"""
    items = sorted(importance.items(), key=lambda x: x[1], reverse=True)
    names = [it[0] for it in items[:15]]
    values = [it[1] for it in items[:15]]

    fig, ax = plt.subplots(figsize=(10, 6))
    bars = ax.barh(range(len(names)), values, color="#2563eb")
    ax.set_yticks(range(len(names)))
    ax.set_yticklabels(names)
    ax.set_xlabel("特征重要性 (%)")
    ax.set_title("AI 定价模型特征重要性 (Top 15)")
    ax.invert_yaxis()

    for bar, v in zip(bars, values):
        ax.text(bar.get_width() + 0.5, bar.get_y() + bar.get_height() / 2,
                f"{v:.1f}%", va="center", fontsize=9)

    plt.tight_layout()
    fig.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  [OK] 特征重要性图已保存: {output_path}")


def main():
    print("=" * 60)
    print("  南宁家政 AI 动态定价 — 模型训练")
    print("=" * 60)

    # 字体设置
    font_name = setup_chinese_font()
    print(f"  [INFO] 使用字体: {font_name}")

    # 1. 加载数据
    print("\n[1/5] 加载数据...")
    df = load_data()
    train_df, val_df = split_by_time(df)

    # 2. 特征工程
    print("\n[2/5] 特征工程...")
    fe = FeatureEngineer()
    train_features = fe.build_features(train_df, include_target=True)
    val_features = fe.build_features(val_df, include_target=True)

    feature_cols = [c for c in train_features.columns if c != "price_multiple"]
    X_train = train_features[feature_cols]
    y_train = train_features["price_multiple"]
    X_val = val_features[feature_cols]
    y_val = val_features["price_multiple"]

    print(f"  特征维度: {len(feature_cols)}")
    print(f"  目标变量: 最优定价倍率 (price_multiple)")
    print(f"  目标均值: {y_train.mean():.3f} (训练集) / {y_val.mean():.3f} (验证集)")

    # 3. 训练模型
    print("\n[3/5] 训练 XGBoost 模型...")
    model = MLPricingModel()
    score = model.train(X_train, y_train, eval_set=[(X_val, y_val)])

    print(f"  训练集 R²:  {score.get('train_R2', 'N/A')}")
    print(f"  训练集 MAE: {score.get('train_MAE', 'N/A')}")
    print(f"  训练集 RMSE: {score.get('train_RMSE', 'N/A')}")
    print(f"  验证集 MAE: {score.get('val_MAE', 'N/A')}")
    print(f"  验证集 RMSE: {score.get('val_RMSE', 'N/A')}")
    print(f"  验证集 MAPE: {score.get('val_MAPE(%)', 'N/A')}%")

    # 4. 保存模型
    print("\n[4/5] 保存模型...")
    output_dir = os.path.join(BASE_DIR, "output", "models")
    os.makedirs(output_dir, exist_ok=True)
    model_path = os.path.join(output_dir, "pricing_model")
    model.save(model_path)

    # 5. 特征重要性图
    print("\n[5/5] 输出特征重要性图...")
    importance = model.get_feature_importance()
    fig_path = os.path.join(BASE_DIR, "output", "figures", "feature_importance.png")
    plot_feature_importance(importance, fig_path)

    # 打印 Top 10 特征
    print("\n  Top 10 特征:")
    for i, (name, val) in enumerate(sorted(importance.items(),
                                            key=lambda x: x[1], reverse=True)[:10], 1):
        print(f"    {i}. {name}: {val:.1f}%")

    print(f"\n{'=' * 60}")
    print(f"  训练完成!")
    print(f"  模型: {model_path}.json")
    print(f"  特征重要性: {fig_path}")
    print(f"{'=' * 60}")

    return model


if __name__ == "__main__":
    main()
