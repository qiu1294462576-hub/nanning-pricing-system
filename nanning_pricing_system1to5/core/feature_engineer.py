"""
南宁家政 AI 定价 — 特征工程模块
==================================
从原始 CSV 数据构造 XGBoost 训练/推理特征。
复用 core/cost_calculator.py 计算保本价作为成本特征。
"""

import os
import sys
from datetime import datetime, date
from typing import Optional, Dict, List, Tuple

import numpy as np
import pandas as pd

# 确保能找到 core 模块
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from core.cost_calculator import CostCalculator


class FeatureEngineer:
    """特征工程：从原始 CSV 构造模型特征矩阵"""

    # 城区有序编码（按经济发展水平）
    DISTRICT_ORDER = ["武鸣", "邕宁", "兴宁", "西乡塘", "江南", "良庆", "青秀"]
    # 服务等级有序编码
    SKILL_ORDER = {"新手": 0, "熟练": 1, "金牌": 2}
    # 档次标签有序编码
    TIER_ORDER = {"低端": 0, "中低端": 1, "中端": 2, "中高端": 3, "高端": 4}
    # 旺季等级有序编码
    SEASON_ORDER = {"平季": 0, "普通旺季": 1, "超级旺季": 2}

    def __init__(self):
        self.cc = CostCalculator()
        self._feature_names: List[str] = []
        self._is_fitted = False
        self._district_premium_cache: Optional[Dict[str, float]] = None

        # 加载辅助数据
        self.area_df = self._load_area_data()
        self.holiday_df = self._load_holiday_data()

        # 从 holiday_season_data.csv 构建节假日查找表
        self._holiday_lookup = self._build_holiday_lookup()

    # ----------------------------------------------------------
    # 辅助数据加载
    # ----------------------------------------------------------

    def _load_area_data(self) -> pd.DataFrame:
        path = os.path.join(BASE_DIR, "data", "nanning", "area_economic_data.csv")
        return pd.read_csv(path)

    def _load_holiday_data(self) -> pd.DataFrame:
        path = os.path.join(BASE_DIR, "data", "nanning", "holiday_season_data.csv")
        df = pd.read_csv(path)
        df["日期"] = pd.to_datetime(df["日期"]).dt.date
        return df

    def _build_holiday_lookup(self) -> Dict:
        """构造 {日期: {节日名称, 旺季等级, 需求增幅}} 查找表"""
        lookup = {}
        for _, row in self.holiday_df.iterrows():
            d = row["日期"]
            if hasattr(d, "date"):
                d = d.date() if not isinstance(d, date) else d
            # 解析 "预估需求增幅"：去掉 + 和 %，转为 float（如 "+50%" -> 0.5）
            raw = str(row.get("预估需求增幅", "0")).replace("+", "").replace("%", "")
            try:
                boost = float(raw) / 100.0
            except (ValueError, TypeError):
                boost = 0.0
            lookup[d] = {
                "name": row["节日名称"],
                "level": row["旺季等级"],
                "demand_boost": boost,
            }
        return lookup

    def _get_community_tier(self, district: str, community: str) -> Tuple[str, float]:
        """查询小区的档次标签和加价系数"""
        if self.area_df.empty:
            return "中端", 1.0
        match = self.area_df[(self.area_df["城区"] == district) &
                             (self.area_df["小区名称"] == community)]
        if match.empty:
            return "中端", 1.0
        row = match.iloc[0]
        return str(row["档次标签"]), float(row["加价系数"])

    # ----------------------------------------------------------
    # 节假日标记（复用 statistical_analysis.py 逻辑）
    # ----------------------------------------------------------

    @staticmethod
    def _is_sanyuesan(dt: datetime) -> bool:
        """判断是否三月三期间（广西法定节日，农历三月初三前后各7天）"""
        try:
            from chinese_calendar import LunarDate
            d = dt.date() if hasattr(dt, "date") else dt
            year = d.year
            # 农历三月初三
            sanyuesan = LunarDate(year, 3, 3).to_solar_date()
            start = sanyuesan - pd.Timedelta(days=7)
            end = sanyuesan + pd.Timedelta(days=7)
            return start <= d <= end
        except ImportError:
            # Fallback: use holiday lookup or approximate
            m = dt.month
            return m == 4  # approximate

    @staticmethod
    def _is_huinantian(dt: datetime, service_type: str) -> bool:
        """判断是否回南天期间（3-4月 + 深度清洁）"""
        m = dt.month if hasattr(dt, "month") else 0
        return m in (3, 4) and service_type == "深度清洁"

    @staticmethod
    def _is_spring_festival(dt: datetime) -> bool:
        """判断是否春节前（农历正月初一前14天）"""
        try:
            from chinese_calendar import LunarDate
            d = dt.date() if hasattr(dt, "date") else dt
            year = d.year
            # 农历正月初一
            cny = LunarDate(year, 1, 1).to_solar_date()
            # 如果当前日期已过春节，取下一年的春节
            if d > cny + pd.Timedelta(days=15):
                cny = LunarDate(year + 1, 1, 1).to_solar_date()
            start = cny - pd.Timedelta(days=14)
            return start <= d < cny
        except ImportError:
            return dt.month == 1

    @staticmethod
    def _get_season_level(dt: datetime) -> str:
        """判断旺季等级（基于实际节假日检测）"""
        if FeatureEngineer._is_spring_festival(dt):
            return "超级旺季"
        if FeatureEngineer._is_sanyuesan(dt):
            return "超级旺季"
        m = dt.month if hasattr(dt, "month") else 0
        if m in (3, 4):
            return "超级旺季"
        if m == 2:
            return "普通旺季"
        return "平季"

    # ----------------------------------------------------------
    # 供需数据关联
    # ----------------------------------------------------------

    @staticmethod
    def _load_supply_demand() -> pd.DataFrame:
        path = os.path.join(BASE_DIR, "data", "nanning", "supply_demand_data.csv")
        df = pd.read_csv(path)
        df["year"] = df["年月"].astype(str).str[:4].astype(int)
        df["month"] = df["年月"].astype(str).str[5:7].astype(int)
        return df

    def _get_supply_demand_ratio(self, district: str, dt: datetime,
                                 sd_df: pd.DataFrame) -> float:
        """获取指定城区、月份的供需比"""
        m = dt.month
        y = dt.year
        match = sd_df[(sd_df["城区"] == district) &
                       (sd_df["year"] == y) &
                       (sd_df["month"] == m)]
        if match.empty:
            return 1.0
        return float(match.iloc[0]["供需比"])

    # ----------------------------------------------------------
    # 特征构建（核心）
    # ----------------------------------------------------------

    def build_features(
        self,
        orders_df: pd.DataFrame,
        sd_df: Optional[pd.DataFrame] = None,
        include_target: bool = True,
    ) -> pd.DataFrame:
        """
        从订单数据构造特征矩阵。

        Args:
            orders_df: sample_orders.csv 的 DataFrame，必须包含列：
               订单ID, 下单时间, 城区, 小区, 服务类型, 服务等级, 服务时长, 订单金额
            sd_df: 可选，supply_demand_data.csv 的 DataFrame，为 None 时自动加载
            include_target: 是否包含目标变量 最优定价倍率

        Returns:
            特征矩阵 DataFrame，每行对应一条订单
        """
        df = orders_df.copy()
        df["下单时间"] = pd.to_datetime(df["下单时间"])
        df["月份"] = df["下单时间"].dt.month
        df["星期"] = df["下单时间"].dt.dayofweek

        if sd_df is None:
            sd_df = self._load_supply_demand()

        feature_cols = []
        rows = []

        for idx, row in df.iterrows():
            dt = row["下单时间"]
            dist = row["城区"]
            community = row.get("小区", "")
            service_type = row["服务类型"]
            skill = row["服务等级"]
            duration = float(row["服务时长"])
            apartment_type = row.get("户型", "3室")

            # 用 CostCalculator 计算成本
            try:
                cost = self.cc.calculate_cost(
                    service_type, skill, dist, duration,
                    apartment_type=apartment_type,
                    time_period="工作日",
                )
                break_even = cost.break_even_price
                labor_ratio = cost.labor_cost / cost.total_cost if cost.total_cost > 0 else 0
            except Exception:
                break_even = 0.0
                labor_ratio = 0.6

            # 社区档次
            tier, premium = self._get_community_tier(dist, community)
            tier_code = self.TIER_ORDER.get(tier, 2)

            # 供需比
            sd_ratio = self._get_supply_demand_ratio(dist, dt, sd_df)

            # 节假日标记（优先从 holiday_lookup 查，fallback 到动态计算）
            d_date = dt.date() if hasattr(dt, "date") else dt
            if d_date in self._holiday_lookup:
                h_info = self._holiday_lookup[d_date]
                is_sys = 1 if "三月三" in h_info.get("name", "") else self._is_sanyuesan(dt)
                is_hn = 1 if "回南天" in h_info.get("name", "") else self._is_huinantian(dt, service_type)
                is_sf = 1 if "春节" in h_info.get("name", "") else self._is_spring_festival(dt)
                season = h_info.get("level", self._get_season_level(dt))
            else:
                is_sys = 1 if self._is_sanyuesan(dt) else 0
                is_hn = 1 if self._is_huinantian(dt, service_type) else 0
                is_sf = 1 if self._is_spring_festival(dt) else 0
                season = self._get_season_level(dt)
            is_weekend = 1 if dt.weekday() >= 5 else 0
            season_code = self.SEASON_ORDER.get(season, 0)

            # 目标变量
            actual_price = float(row["订单金额"])
            price_multiple = actual_price / break_even if break_even > 0 else 1.0

            features = {
                # 订单特征
                "service_type_日常保洁": 1 if service_type == "日常保洁" else 0,
                "service_type_深度清洁": 1 if service_type == "深度清洁" else 0,
                "service_type_开荒保洁": 1 if service_type == "开荒保洁" else 0,
                "service_type_家电清洗": 1 if service_type == "家电清洗" else 0,
                "duration": duration,
                "skill_level": self.SKILL_ORDER.get(skill, 1),

                # 城区特征（one-hot + ordinal）
                "district_青秀": 1 if dist == "青秀" else 0,
                "district_良庆": 1 if dist == "良庆" else 0,
                "district_江南": 1 if dist == "江南" else 0,
                "district_西乡塘": 1 if dist == "西乡塘" else 0,
                "district_兴宁": 1 if dist == "兴宁" else 0,
                "district_邕宁": 1 if dist == "邕宁" else 0,
                "district_武鸣": 1 if dist == "武鸣" else 0,
                "district_ordinal": self.DISTRICT_ORDER.index(dist) if dist in self.DISTRICT_ORDER else 3,

                # 社区特征
                "community_tier": tier_code,
                "community_premium": premium,

                # 时间特征
                "month": dt.month,
                "is_weekend": is_weekend,
                "is_sanyuesan": 1 if is_sys else 0,
                "is_huinantian": 1 if is_hn else 0,
                "is_spring_festival": 1 if is_sf else 0,
                "season_level": season_code,

                # 供需特征
                "supply_demand_ratio": sd_ratio,

                # 成本特征
                "break_even_price": break_even,
                "labor_cost_ratio": round(labor_ratio, 4),
            }

            if include_target:
                features["price_multiple"] = round(price_multiple, 4)

            rows.append(features)

        result = pd.DataFrame(rows)
        self._feature_names = [c for c in result.columns if c != "price_multiple"]
        self._is_fitted = True
        return result

    def get_feature_names(self) -> List[str]:
        """返回特征名称列表"""
        if not self._is_fitted:
            raise RuntimeError("请先调用 build_features() 生成特征")
        return self._feature_names

    def get_holiday_info(self, dt: datetime, service_type: str = "") -> Dict:
        """查询指定日期+服务类型的节假日信息"""
        d = dt.date() if hasattr(dt, "date") else dt
        if hasattr(d, "date") and callable(d.date):
            d = d.date()
        if d in self._holiday_lookup:
            info = self._holiday_lookup[d]
            applicable = str(info.get("applicable", ""))
            if not applicable or service_type in applicable:
                return {
                    "name": info.get("name", ""),
                    "level": info.get("level", ""),
                    "demand_boost": info.get("demand_boost", 0),
                }
        # Fallback to static methods
        if self._is_sanyuesan(dt):
            return {"name": "三月三", "level": "超级旺季", "demand_boost": 2.0}
        if self._is_huinantian(dt, service_type):
            return {"name": "回南天", "level": "超级旺季", "demand_boost": 1.5}
        if self._is_spring_festival(dt):
            return {"name": "春节前", "level": "超级旺季", "demand_boost": 3.0}
        month = dt.month
        d_weekday = dt.weekday()
        if month == 2:
            return {"name": "普通旺季", "level": "普通旺季", "demand_boost": 0.2}
        if d_weekday >= 5:
            return {"name": "周末", "level": "普通旺季", "demand_boost": 0.1}
        return {}

    def _get_district_premium(self, district: str) -> float:
        """获取城区加价系数（带缓存，避免每次读 config.yaml）"""
        if self._district_premium_cache is None:
            self._district_premium_cache = {}
            try:
                import yaml
                config_path = os.path.join(BASE_DIR, "config.yaml")
                with open(config_path, "r", encoding="utf-8") as f:
                    config = yaml.safe_load(f)
                for d in config.get("districts", []):
                    self._district_premium_cache[d["name"]] = float(d.get("premium", 1.0))
            except Exception:
                pass
        return self._district_premium_cache.get(district, 1.0)

    def build_single_features(
        self,
        service_type: str,
        skill_level: str,
        district: str,
        duration: float,
        apartment_type: str = "3室",
        time_period: str = "工作日",
        order_date: Optional[datetime] = None,
    ) -> Dict:
        """为单次定价请求构造特征字典（用于在线推理）"""
        dt = order_date if order_date is not None else datetime.now()

        # 成本计算
        try:
            cost = self.cc.calculate_cost(
                service_type, skill_level, district, duration,
                apartment_type, time_period,
            )
            break_even = cost.break_even_price
            labor_ratio = cost.labor_cost / cost.total_cost if cost.total_cost > 0 else 0.6
        except Exception:
            break_even = 0.0
            labor_ratio = 0.6

        # 供需比
        sd_df = self._load_supply_demand()
        sd_ratio = self._get_supply_demand_ratio(district, dt, sd_df)

        # 节假日
        is_sys = 1 if self._is_sanyuesan(dt) else 0
        is_hn = 1 if self._is_huinantian(dt, service_type) else 0
        is_sf = 1 if self._is_spring_festival(dt) else 0
        is_weekend = 1 if dt.weekday() >= 5 else 0
        season = self._get_season_level(dt)
        season_code = self.SEASON_ORDER.get(season, 0)

        # 社区档次和加价系数（使用缓存）
        tier_code = self.TIER_ORDER.get("中端", 2)
        premium = self._get_district_premium(district)

        features = {
            "service_type_日常保洁": 1 if service_type == "日常保洁" else 0,
            "service_type_深度清洁": 1 if service_type == "深度清洁" else 0,
            "service_type_开荒保洁": 1 if service_type == "开荒保洁" else 0,
            "service_type_家电清洗": 1 if service_type == "家电清洗" else 0,
            "duration": duration,
            "skill_level": self.SKILL_ORDER.get(skill_level, 1),
            "district_青秀": 1 if district == "青秀" else 0,
            "district_良庆": 1 if district == "良庆" else 0,
            "district_江南": 1 if district == "江南" else 0,
            "district_西乡塘": 1 if district == "西乡塘" else 0,
            "district_兴宁": 1 if district == "兴宁" else 0,
            "district_邕宁": 1 if district == "邕宁" else 0,
            "district_武鸣": 1 if district == "武鸣" else 0,
            "district_ordinal": self.DISTRICT_ORDER.index(district) if district in self.DISTRICT_ORDER else 3,
            "community_tier": tier_code,
            "community_premium": premium,
            "month": dt.month,
            "is_weekend": is_weekend,
            "is_sanyuesan": is_sys,
            "is_huinantian": is_hn,
            "is_spring_festival": is_sf,
            "season_level": season_code,
            "supply_demand_ratio": sd_ratio,
            "break_even_price": break_even,
            "labor_cost_ratio": round(labor_ratio, 4),
        }
        return features

    @staticmethod
    def get_target_name() -> str:
        """返回目标变量名称"""
        return "price_multiple"
