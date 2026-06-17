"""
南宁家政 AI 动态定价引擎 — 四层混合模型
=========================================
1. 成本兜底层：CostCalculator 保本价 x 1.1 安全边际
2. 市场锚定层：竞品价格区间
3. AI 动态调价层：XGBoost 预测最优倍率
4. 规则校验层：区域/季节/供需规则
"""

import os
import sys
import json
import yaml
from datetime import datetime
from typing import Optional, Dict, List, Tuple, Any

import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from core.cost_calculator import CostCalculator, CostDetail
from core.feature_engineer import FeatureEngineer
from core.ml_pricing_model import MLPricingModel


class PricingEngine:
    """四层混合定价引擎"""

    # 默认模型路径
    DEFAULT_MODEL_PATH = os.path.join(BASE_DIR, "output", "models", "pricing_model")

    # 市场锚定乘数（竞品均价 × 此系数 = 价格软上限）
    # 竞品listing价天然低于实际成交价（listing用标准时长/非旺季，
    # 实际订单含加项和旺季溢价），1.3x反映这一差距
    MARKET_ANCHOR_MULTIPLIER = 1.3

    # 各服务类型目标毛利率（软约束 — 作为规则层参考，不硬性覆盖市场锚定）
    # 日常保洁: 市场竞争激烈，实际毛利率仅~0.4%，为引流型产品
    # 深度清洁/家电清洗: 技术溢价高
    # 开荒保洁: 按面积计价，中等毛利
    TARGET_MARGIN_RATES = {
        "日常保洁": 0.00,    # 仅靠floor_price保本，不设额外毛利目标
        "深度清洁": 0.15,
        "开荒保洁": 0.10,
        "家电清洗": 0.15,
    }

    def __init__(self, config_path: Optional[str] = None,
                 model_path: Optional[str] = None):
        """
        Args:
            config_path: config.yaml 路径
            model_path: 预训练模型路径（不含扩展名）
        """
        if config_path is None:
            config_path = os.path.join(BASE_DIR, "config.yaml")

        # 加载配置
        with open(config_path, "r", encoding="utf-8") as f:
            self.config = yaml.safe_load(f)

        # 初始化各层
        self.cost_calculator = CostCalculator()
        self.feature_engineer = FeatureEngineer()
        self.ml_model = MLPricingModel()

        # 加载竞品数据作为市场锚定
        self._competition_data = self._load_competition_data()

        # 尝试加载预训练模型
        self._model_loaded = False
        model_path = model_path or self.DEFAULT_MODEL_PATH
        try:
            self.ml_model.load(model_path)
            self._model_loaded = True
        except (FileNotFoundError, Exception):
            pass

        # 构建城区 premium 查找表
        self._district_premium = {}
        for d in self.config.get("districts", []):
            self._district_premium[d["name"]] = float(d.get("premium", 1.0))

    # ----------------------------------------------------------
    # 市场数据加载
    # ----------------------------------------------------------

    def _load_competition_data(self) -> Dict:
        """加载竞品数据，构建 (城区, 服务类型, 服务等级) -> 价格区间 查找表"""
        path = os.path.join(BASE_DIR, "data", "nanning", "competitive_prices.csv")
        if not os.path.exists(path):
            return {}

        df = pd.read_csv(path)
        # 解析服务等级（部分行可能包含 "-" 如 "家电清洗-挂机空调"）
        df["服务类型_简"] = df["服务类型"].apply(lambda x: x.split("-")[0] if "-" in str(x) else x)
        df["服务等级_简"] = df["服务等级"].apply(lambda x: x.split("-")[0] if "-" in str(x) else x)

        lookup = {}
        for (dist, svc, sl), group in df.groupby(["城区", "服务类型_简", "服务等级_简"]):
            prices = group["总价(元)"].dropna()
            if not prices.empty:
                key = (dist, svc, sl)
                lookup[key] = {
                    "mean": float(prices.mean()),
                    "p25": float(prices.quantile(0.25)),
                    "p75": float(prices.quantile(0.75)),
                    "count": len(prices),
                }

        # 构建服务类型级别后备
        svc_fallback = {}
        for (svc, sl), group in df.groupby(["服务类型_简", "服务等级_简"]):
            prices = group["总价(元)"].dropna()
            if not prices.empty:
                svc_fallback[(svc, sl)] = {
                    "mean": float(prices.mean()),
                    "p25": float(prices.quantile(0.25)),
                    "p75": float(prices.quantile(0.75)),
                }

        return {"detail": lookup, "fallback": svc_fallback}

    # 竞品数据最小样本量 — 低于此值用市级后备
    MIN_COMPETITION_SAMPLES = 5

    def _get_market_range(self, district: str, service_type: str,
                          skill_level: str) -> Tuple[float, float, float]:
        """
        获取市场参考价区间。（样本量不足时自动降级到市级后备）

        Returns:
            (均价, P25, P75)
        """
        # 先查精确匹配（需满足最小样本量）
        key = (district, service_type, skill_level)
        detail = self._competition_data.get("detail", {})
        if key in detail and detail[key].get("count", 0) >= self.MIN_COMPETITION_SAMPLES:
            info = detail[key]
            return info["mean"], info["p25"], info["p75"]

        # 服务类型级别后备
        fb_key = (service_type, skill_level)
        if fb_key in self._competition_data.get("fallback", {}):
            info = self._competition_data["fallback"][fb_key]
            return info["mean"], info["p25"], info["p75"]

        # 无竞品数据
        return 0.0, 0.0, 0.0

    # ----------------------------------------------------------
    # 规则层（第四层）
    # ----------------------------------------------------------

    def _apply_rules(self, service_type: str, skill_level: str,
                     district: str, duration: float,
                     apartment_type: str, time_period: str,
                     break_even: float,
                     order_date: Optional[datetime] = None) -> Tuple[float, List[Dict]]:
        """
        应用规则校验，计算规则定价。

        Returns:
            (rule_price, factors_list)
        """
        factors = []
        base_price = break_even * 1.1  # 安全边际起点
        multipliers = []

        # 1. 区域加价（日常保洁不适用——该品类充分竞争，区域溢价已体现在基础价格中）
        premium = self._district_premium.get(district, 1.0)
        if premium > 1.0 and service_type != "日常保洁":
            pct = round((premium - 1.0) * 100)
            multipliers.append(premium)
            factors.append({"factor": f"{district}区域加价", "impact": f"+{pct}%", "impact_pct": pct})

        # 2. 季节加价（基于订单日期，使用 holiday_season_data.csv 精确匹配）
        season = self.config.get("season_multipliers", {})
        dt = order_date if order_date is not None else datetime.now()

        # 检查是否在精确节假日范围内（使用 FeatureEngineer 的 holiday lookup）
        holiday_info = self.feature_engineer.get_holiday_info(dt, service_type)

        if holiday_info:
            holiday_name = holiday_info.get("name", "")
            holiday_level = holiday_info.get("level", "")
            demand_boost = holiday_info.get("demand_boost", 0)

            # 查找对应的 season_multiplier
            for s in season.get("super_peak", []):
                if s.get("name", "") in holiday_name or holiday_name in s.get("name", ""):
                    mult = float(s.get("multiplier", 1.0))
                    multipliers.append(mult)
                    factors.append({"factor": holiday_name, "impact": f"+{round((mult-1)*100)}%",
                                    "impact_pct": round((mult-1)*100)})
                    break
            else:
                for s in season.get("normal_peak", []):
                    if s.get("name", "") in holiday_name or holiday_name in s.get("name", ""):
                        mult = float(s.get("multiplier", 1.0))
                        multipliers.append(mult)
                        factors.append({"factor": holiday_name, "impact": f"+{round((mult-1)*100)}%",
                                        "impact_pct": round((mult-1)*100)})
                        break

        # 3. 时间段加价（从 cost_parameters.csv 来）
        time_mult = self.cost_calculator.get_param("时间段加价", time_period, 1.0)
        if time_mult > 1.0:
            multipliers.append(time_mult)
            pct = round((time_mult - 1.0) * 100)
            factors.append({"factor": f"{time_period}加价", "impact": f"+{pct}%", "impact_pct": pct})

        # 4. 供需加价（使用订单日期匹配供需数据）
        sd_df = self._load_supply_demand_summary()
        sd_ratio = self._get_district_sd_ratio(district, sd_df, dt)
        if sd_ratio > 2.0:
            multipliers.append(1.2)
            factors.append({"factor": "供需比超高", "impact": "+20%", "impact_pct": 20})
        elif sd_ratio > 1.5:
            multipliers.append(1.1)
            factors.append({"factor": "供需比较高", "impact": "+10%", "impact_pct": 10})

        # 5. 目标毛利率约束（按服务类型差异化）
        target_margin = self.TARGET_MARGIN_RATES.get(service_type, 0.10)

        # 合成规则价格
        if multipliers:
            rule_mult = np.prod(multipliers)
            rule_price = base_price * rule_mult
        else:
            rule_price = base_price

        # 确保规则价达到目标毛利率
        if target_margin > 0:
            min_price = break_even / (1 - target_margin)
            if rule_price < min_price:
                rule_price = min_price

        if not factors:
            factors.append({"factor": "基础保本价", "impact": "基准", "impact_pct": 0})

        return round(rule_price, 2), factors

    @staticmethod
    def _load_supply_demand_summary() -> pd.DataFrame:
        """加载供需数据摘要"""
        path = os.path.join(BASE_DIR, "data", "nanning", "supply_demand_data.csv")
        if os.path.exists(path):
            df = pd.read_csv(path)
            df["year"] = df["年月"].astype(str).str[:4].astype(int)
            df["month"] = df["年月"].astype(str).str[5:7].astype(int)
            return df
        return pd.DataFrame()

    @staticmethod
    def _get_district_sd_ratio(district: str, sd_df: pd.DataFrame,
                                dt: Optional[datetime] = None) -> float:
        """获取指定城区、月份的供需比（默认取最新）"""
        if sd_df.empty:
            return 1.0
        if dt is not None:
            match = sd_df[(sd_df["城区"] == district) &
                           (sd_df["year"] == dt.year) &
                           (sd_df["month"] == dt.month)]
            if not match.empty:
                return float(match.iloc[0]["供需比"])
        recent = sd_df[sd_df["城区"] == district].sort_values("年月", ascending=False)
        if recent.empty:
            return 1.0
        return float(recent.iloc[0]["供需比"])

    # ----------------------------------------------------------
    # AI 调价层（第三层）
    # ----------------------------------------------------------

    def _apply_ai(self, service_type: str, skill_level: str,
                  district: str, duration: float,
                  apartment_type: str, time_period: str,
                  break_even: float,
                  order_date: Optional[datetime] = None) -> Tuple[float, float]:
        """
        应用 AI 模型预测建议价。

        Returns:
            (ai_price, ai_multiple)
        """
        if not self._model_loaded:
            return 0.0, 0.0

        dt = order_date if order_date is not None else datetime.now()

        # 使用 FeatureEngineer 构建单样本特征
        try:
            features = self.feature_engineer.build_single_features(
                service_type, skill_level, district, duration,
                apartment_type, time_period, dt,
            )
        except Exception:
            return 0.0, 0.0

        try:
            multiple = self.ml_model.predict_single(features)
            ai_price = break_even * max(multiple, 1.1)  # 确保不低于安全边际
            return round(ai_price, 2), round(multiple, 4)
        except Exception:
            return 0.0, 0.0

    # ----------------------------------------------------------
    # 主入口
    # ----------------------------------------------------------

    def get_price(
        self,
        service_type: str,
        skill_level: str,
        district: str,
        duration: float,
        apartment_type: str = "3室",
        time_period: str = "工作日",
        mode: str = "ai",
        order_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        计算最终定价。

        Args:
            service_type: 服务类型
            skill_level: 师傅等级
            district: 城区
            duration: 服务时长(h)
            apartment_type: 户型
            time_period: 时间段
            mode: 'ai' 四层全量 | 'rule' 仅规则（跳过AI）
            order_date: 订单日期（用于季节/节假日判断），默认当前时间

        Returns:
            dict: {
                final_price, break_even_price, ai_price, rule_price,
                cost_detail, margin_factors, mode_used
            }
        """
        # ---- 第一层：成本兜底 ----
        cost = self.cost_calculator.calculate_cost(
            service_type, skill_level, district, duration,
            apartment_type, time_period,
        )
        break_even = cost.break_even_price
        floor_price = break_even * 1.1  # 10% 安全边际

        # 成本明细
        cost_detail = {
            "labor_cost": round(cost.labor_cost, 2),
            "material_cost": round(cost.material_cost, 2),
            "transport_cost": round(cost.transport_cost, 2),
            "management_cost": round(cost.management_cost, 2),
            "risk_buffer": round(cost.risk_buffer, 2),
            "total_cost": round(cost.total_cost, 2),
            "break_even_price": round(break_even, 2),
        }

        # ---- 第四层：规则校验（先算，AI 可能不可用） ----
        rule_price, rule_factors = self._apply_rules(
            service_type, skill_level, district, duration,
            apartment_type, time_period, break_even, order_date,
        )

        # ---- 第三层：AI 动态调价 ----
        ai_price = 0.0
        ai_multiple = 0.0
        ai_factors = []
        if mode == "ai" and self._model_loaded:
            ai_price, ai_multiple = self._apply_ai(
                service_type, skill_level, district, duration,
                apartment_type, time_period, break_even, order_date,
            )
            if ai_price > 0:
                ai_factors.append({
                    "factor": "AI模型动态调价",
                    "impact": f"x{ai_multiple:.2f}倍(保本价)",
                    "impact_pct": round((ai_multiple - 1.0) * 100),
                })

        # ---- 合成最终价格 ----
        if mode == "ai":
            candidates = [floor_price, rule_price]
            if ai_price > 0:
                candidates.append(ai_price)
            final_price = max(candidates)

            # 收集所有加价原因
            margin_factors = list(rule_factors)
            for f in ai_factors:
                if f not in margin_factors:
                    margin_factors.append(f)
            margin_factors.insert(0, {
                "factor": "保本价安全边际",
                "impact": f"¥{break_even:.0f} x 1.1 = ¥{floor_price:.0f}",
                "impact_pct": 10,
            })
        else:
            # 纯规则模式
            final_price = max(floor_price, rule_price)
            margin_factors = rule_factors
            margin_factors.insert(0, {
                "factor": "保本价安全边际",
                "impact": f"¥{break_even:.0f} x 1.1 = ¥{floor_price:.0f}",
                "impact_pct": 10,
            })

        # ---- 第二层：市场锚定软上限 ----
        # 竞品均价 x 1.3 作为价格上限。这是软约束：
        # - 如果 floor_price > market_cap（成本高于市场价），floor 优先
        # - 如果 AI/规则价 > market_cap，被锚定拉回
        market_mean, _, _ = self._get_market_range(district, service_type, skill_level)
        if market_mean > 0:
            market_cap = market_mean * self.MARKET_ANCHOR_MULTIPLIER
            if final_price > market_cap:
                final_price = market_cap
                margin_factors.append({
                    "factor": f"市场锚定上限(竞品均价x{self.MARKET_ANCHOR_MULTIPLIER})",
                    "impact": "限制", "impact_pct": 0,
                })

        # 最终兜底：安全底价是绝对硬下限
        if final_price < floor_price:
            final_price = floor_price

        # 按 impact_pct 从高到低排序
        margin_factors = sorted(margin_factors, key=lambda f: -f.get("impact_pct", 0))
        # 排序后清理内部字段
        for f in margin_factors:
            f.pop("impact_pct", None)

        # ---- 毛利率计算 ----
        gross_margin = (final_price - break_even) / final_price * 100 if final_price > 0 else 0

        return {
            "final_price": round(final_price, 2),
            "break_even_price": round(break_even, 2),
            "floor_price": round(floor_price, 2),
            "ai_price": round(ai_price, 2) if ai_price > 0 else None,
            "rule_price": round(rule_price, 2),
            "ai_multiple": ai_multiple if ai_multiple > 0 else None,
            "gross_margin_pct": round(gross_margin, 2),
            "cost_detail": cost_detail,
            "margin_factors": margin_factors,
            "mode_used": mode,
            "model_loaded": self._model_loaded,
        }

    def batch_get_price(self, orders_df: pd.DataFrame,
                        mode: str = "ai") -> List[Dict]:
        """批量定价"""
        results = []
        for _, row in orders_df.iterrows():
            order_date = None
            if "下单时间" in row:
                try:
                    order_date = pd.to_datetime(row["下单时间"]).to_pydatetime()
                except Exception:
                    pass
            result = self.get_price(
                service_type=row.get("服务类型", "日常保洁"),
                skill_level=row.get("服务等级", "熟练"),
                district=row.get("城区", "青秀"),
                duration=float(row.get("服务时长", 3)),
                apartment_type=row.get("户型", "3室"),
                time_period=row.get("时间段", "工作日"),
                mode=mode,
                order_date=order_date,
            )
            results.append(result)
        return results

    def get_model_info(self) -> Dict:
        """获取模型信息"""
        base_info = self.ml_model.get_model_info() if self._model_loaded else {
            "model_type": "XGBoost",
            "status": "not_trained",
        }
        base_info["engine_version"] = "4.0"
        base_info["layers"] = ["cost_floor", "market_anchor", "ai_dynamic", "rule_validation"]
        base_info["model_loaded"] = self._model_loaded
        return base_info


# ============================================================
# 快捷入口
# ============================================================

def create_engine(config_path: Optional[str] = None) -> PricingEngine:
    """创建定价引擎实例"""
    return PricingEngine(config_path=config_path)


def demo_price():
    """演示：定价一个典型场景"""
    engine = PricingEngine()
    result = engine.get_price(
        service_type="日常保洁",
        skill_level="熟练",
        district="青秀",
        duration=3,
        apartment_type="3室",
        time_period="工作日",
        mode="ai",
    )
    print("=" * 50)
    print("  南宁家政 AI 动态定价演示")
    print("=" * 50)
    print(f"  服务: {result['cost_detail']['break_even_price']:.0f}")
    print(f"  保本价: ¥{result['break_even_price']:.0f}")
    print(f"  安全底价: ¥{result['floor_price']:.0f}")
    if result["ai_price"]:
        print(f"  AI建议价: ¥{result['ai_price']:.0f} (x{result['ai_multiple']:.2f})")
    print(f"  规则价: ¥{result['rule_price']:.0f}")
    print(f"  最终定价: ¥{result['final_price']:.0f}")
    print(f"  毛利率: {result['gross_margin_pct']:.1f}%")
    print(f"  定价模式: {result['mode_used']}")
    print(f"  模型已加载: {result['model_loaded']}")
    print(f"\n  加价原因:")
    for f in result["margin_factors"]:
        print(f"    - {f['factor']}: {f['impact']}")
    print("=" * 50)
    return engine


if __name__ == "__main__":
    demo_price()
