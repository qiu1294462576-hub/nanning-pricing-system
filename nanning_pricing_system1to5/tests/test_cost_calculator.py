"""南宁家政成本核算模块 — 单元测试"""

import os
import sys
import pytest

# 将项目根目录加入 path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from core.cost_calculator import CostCalculator


@pytest.fixture
def cc():
    """测试用计算器实例"""
    return CostCalculator()


class TestCostCalculator:
    """成本计算器核心功能测试"""

    def test_initialization(self, cc):
        """初始化应正确加载所有参数类别"""
        assert len(cc.params) >= 8  # 至少 8 个参数类别
        assert cc.get_param("师傅到手时薪", "新手") == 20
        assert cc.get_param("师傅到手时薪", "熟练") == 28
        assert cc.get_param("师傅到手时薪", "金牌") == 38

    def test_basic_cost_structure(self, cc):
        """基础成本结构：日常保洁-新手-青秀 3h"""
        detail = cc.calculate_cost("日常保洁", "新手", "青秀", 3)
        # 人力 = 20 × 1.20 × 3 = 72
        assert detail.labor_cost == pytest.approx(72.0, rel=1e-2)
        # 耗材 = 5 × 1.0 = 5
        assert detail.material_cost == pytest.approx(5.0, rel=1e-2)
        # 交通 = 5
        assert detail.transport_cost == 5.0
        # 直接成本小计 = 72 + 5 + 5 = 82
        assert detail.total_direct_cost == pytest.approx(82.0, rel=1e-2)
        # 风险 = 82 × 0.10 = 8.2
        assert detail.risk_buffer == pytest.approx(8.2, rel=1e-2)
        # 保本价 = (82 + 8.2) / 0.94 = 95.957...
        assert detail.break_even_price == pytest.approx(95.96, rel=1e-2)

    def test_time_period_affects_cost(self, cc):
        """不同时间段应产生不同的人力成本"""
        weekday = cc.calculate_cost("日常保洁", "熟练", "青秀", 3, time_period="工作日")
        weekend = cc.calculate_cost("日常保洁", "熟练", "青秀", 3, time_period="周末")
        holiday = cc.calculate_cost("日常保洁", "熟练", "青秀", 3, time_period="节假日")
        peak = cc.calculate_cost("日常保洁", "熟练", "青秀", 3, time_period="旺季")

        # 周末 1.1x > 工作日 1.0x
        assert weekend.labor_cost > weekday.labor_cost
        assert weekend.labor_cost == pytest.approx(weekday.labor_cost * 1.1, rel=1e-2)
        # 节假日 1.2x
        assert holiday.labor_cost == pytest.approx(weekday.labor_cost * 1.2, rel=1e-2)
        # 旺季 1.3x
        assert peak.labor_cost == pytest.approx(weekday.labor_cost * 1.3, rel=1e-2)

    def test_apartment_type_affects_material(self, cc):
        """不同户型应产生不同的耗材成本"""
        small = cc.calculate_cost("日常保洁", "熟练", "青秀", 3, apartment_type="1室")
        large = cc.calculate_cost("日常保洁", "熟练", "青秀", 3, apartment_type="别墅")
        # 别墅耗材系数 1.8 > 1室 0.6
        assert large.material_cost > small.material_cost
        assert large.material_cost == pytest.approx(small.material_cost * (1.8 / 0.6), rel=1e-2)

    def test_district_transport_cost(self, cc):
        """不同城区应有不同的交通成本"""
        qingxiu = cc.calculate_cost("日常保洁", "熟练", "青秀", 3)
        wuming = cc.calculate_cost("日常保洁", "熟练", "武鸣", 3)
        assert wuming.transport_cost > qingxiu.transport_cost
        assert qingxiu.transport_cost == 5.0
        assert wuming.transport_cost == 25.0

    def test_skill_level_wage_differs(self, cc):
        """不同技能等级的人力成本应不同"""
        novice = cc.calculate_cost("日常保洁", "新手", "青秀", 3)
        gold = cc.calculate_cost("日常保洁", "金牌", "青秀", 3)
        assert gold.labor_cost > novice.labor_cost
        # 金牌 38元/h > 新手 20元/h
        assert gold.labor_cost / novice.labor_cost == pytest.approx(38 / 20, rel=1e-2)

    def test_service_type_pricing_differs(self, cc):
        """不同服务类型的成本结构应不同"""
        daily = cc.calculate_cost("日常保洁", "熟练", "青秀", 3)
        deep = cc.calculate_cost("深度清洁", "熟练", "青秀", 4)
        # 深度清洁耗材费率 12 > 日常保洁 5
        material_ratio = deep.material_cost / daily.material_cost if daily.material_cost else 0
        assert material_ratio > 1.0

    def test_break_even_less_than_target(self, cc):
        """保本价应低于目标售价"""
        detail = cc.calculate_cost("日常保洁", "新手", "青秀", 3)
        assert detail.break_even_price <= detail.target_price_25
        assert detail.target_price_25 <= detail.target_price_35

    def test_target_margin_calculation(self, cc):
        """目标售价应正确反映毛利率"""
        result = cc.calculate_break_even("日常保洁", "熟练", "青秀", 3, target_margin=0.30)
        margin = 1 - result["total_cost"] / result["target_price"]
        assert margin == pytest.approx(0.30, rel=1e-2)

    def test_all_scenarios_count(self, cc):
        """全场景矩阵应为 4×3×7 = 84 个"""
        scenarios = cc.calculate_all_scenarios()
        assert len(scenarios) == 84

    def test_full_scenarios_count(self, cc):
        """全维度场景矩阵应为 4×3×7×5×4 = 1680 个"""
        scenarios = cc.calculate_full_scenarios()
        assert len(scenarios) == 1680

    def test_negative_duration_returns_zero_or_error(self, cc):
        """服务时长 <= 0 应报错"""
        with pytest.raises(ValueError, match="服务时长必须大于 0"):
            cc.calculate_cost("日常保洁", "新手", "青秀", 0)

    def test_verify_frontend_data(self, cc):
        """前端验证数据应包含所有服务类型"""
        data = cc.verify_frontend()
        assert "verification_cases" in data
        assert len(data["verification_cases"]) >= 5
        # 每个验证用例都应有 input 和 output
        for case in data["verification_cases"]:
            assert "input" in case
            assert "output" in case


class TestCostParameters:
    """成本参数加载与校验测试"""

    def test_invalid_param_path(self):
        """无效路径应抛出异常"""
        with pytest.raises(FileNotFoundError):
            CostCalculator(params_path="/nonexistent/path.csv")

    def test_all_params_loaded(self, cc):
        """应加载所有关键参数"""
        required_cats = ["师傅到手时薪", "社保系数", "耗材费率", "交通加价", "管理费率", "风险裕量"]
        for cat in required_cats:
            assert cat in cc.params, f"缺少参数类别: {cat}"
            assert len(cc.params[cat]) > 0, f"参数类别为空: {cat}"

    def test_param_values_reasonable(self, cc):
        """参数值应在合理范围内"""
        assert 15 <= cc.get_param("师傅到手时薪", "新手") <= 30
        assert 25 <= cc.get_param("师傅到手时薪", "熟练") <= 40
        assert 30 <= cc.get_param("师傅到手时薪", "金牌") <= 50
        assert 1.0 <= cc.get_param("社保系数", "通用") <= 1.5
        assert 0.01 <= cc.get_param("管理费率", "通用") <= 0.20
        assert 0.01 <= cc.get_param("风险裕量", "通用") <= 0.30


class TestHistoricalReview:
    """历史订单复盘测试"""

    def test_review_returns_correct_structure(self, cc):
        """复盘应返回正确的数据结构"""
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        orders_csv = os.path.join(base, "data", "nanning", "sample_orders.csv")
        if not os.path.exists(orders_csv):
            pytest.skip("历史订单文件不存在")

        review, loss_rows, summary = cc.review_historical_orders(orders_csv)
        assert len(review) > 0
        assert "总订单数" in summary
        assert "亏损订单数" in summary
        assert summary["总订单数"] == len(review)
        assert len(loss_rows) == summary["亏损订单数"]

    def test_loss_rate_is_reasonable(self, cc):
        """亏损率应在合理范围内"""
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        orders_csv = os.path.join(base, "data", "nanning", "sample_orders.csv")
        if not os.path.exists(orders_csv):
            pytest.skip("历史订单文件不存在")

        _, _, summary = cc.review_historical_orders(orders_csv)
        loss_rate = summary["亏损率(%)"]
        # 5%-30% 为合理亏损范围
        assert 5 <= loss_rate <= 30, f"亏损率 {loss_rate}% 超出预期范围"

    def test_loss_summary_has_all_keys(self, cc):
        """亏损汇总应包含所有分析维度"""
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        orders_csv = os.path.join(base, "data", "nanning", "sample_orders.csv")
        if not os.path.exists(orders_csv):
            pytest.skip("历史订单文件不存在")

        _, _, summary = cc.review_historical_orders(orders_csv)
        assert "按城区亏损" in summary
        assert "按服务类型亏损" in summary
        assert "按服务等级亏损" in summary
        assert "亏损金额TOP20" in summary
        assert "亏损时长分布" in summary


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
