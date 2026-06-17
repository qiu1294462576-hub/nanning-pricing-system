#!/usr/bin/env python3
"""
从CSV数据重新生成前端 data.js
读取最新的清洗后CSV，输出 frontend/data.js
"""
import os, csv, json, random
from datetime import datetime

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE, "data", "nanning")
FRONTEND_DIR = os.path.join(BASE, "frontend")


def read_csv(filename):
    path = os.path.join(DATA_DIR, filename)
    with open(path, "r", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def js_val(v):
    """Python value -> JS literal"""
    if v is None or v == "":
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, int):
        return str(v)
    if isinstance(v, float):
        return str(v)
    # string
    escaped = str(v).replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n")
    return f"'{escaped}'"


def rows_to_js_array(rows, field_map=None):
    """Convert list of dicts to JS array of objects"""
    parts = ["["]
    for row in rows:
        if field_map:
            mapped = {}
            for js_key, csv_key in field_map.items():
                val = row.get(csv_key, "")
                mapped[js_key] = val
            row = mapped
        items = ", ".join(f"{k}: {js_val(v)}" for k, v in row.items())
        parts.append(f"  {{{items}}},")
    parts.append("]")
    return "\n".join(parts)


def main():
    # Read CSVs
    print("[1] 读取 CSVs...")
    orders = read_csv("sample_orders.csv")
    comp = read_csv("competitive_prices.csv")
    sd = read_csv("supply_demand_data.csv")
    holiday = read_csv("holiday_season_data.csv")
    print(f"     orders: {len(orders)}, competitive: {len(comp)}, supply_demand: {len(sd)}, holiday: {len(holiday)}")

    # --- COMPETITIVE_PRICES ---
    print("[2] 转换竞品价格数据...")
    comp_field_map = {
        "date": "日期",
        "platform": "平台",
        "district": "城区",
        "community": "小区",
        "service": "服务类型",
        "level": "服务等级",
        "unit": "计价方式",
        "unitPrice": "单价(元)",
        "totalPrice": "总价(元)",
        "promoPrice": "促销价(元)",
        "season": "淡旺季",
    }
    comp_rows = []
    for r in comp:
        cr = {}
        for js_key, csv_key in comp_field_map.items():
            cr[js_key] = r.get(csv_key, "")
        # Convert numeric fields
        try:
            cr["unitPrice"] = float(cr["unitPrice"]) if cr["unitPrice"] else 0
        except:
            cr["unitPrice"] = 0
        try:
            cr["totalPrice"] = int(float(cr["totalPrice"])) if cr["totalPrice"] else 0
        except:
            cr["totalPrice"] = 0
        if cr["promoPrice"] and str(cr["promoPrice"]).strip():
            try:
                cr["promoPrice"] = int(float(str(cr["promoPrice"])))
            except:
                cr["promoPrice"] = None
        else:
            cr["promoPrice"] = None
        comp_rows.append(cr)

    # --- SUPPLY_DEMAND ---
    print("[3] 转换供需数据...")
    sd_rows = []
    for r in sd:
        sd_rows.append({
            "ym": r.get("年月", ""),
            "demand": int(float(r.get("预估需求量", 0))),
            "supply": int(float(r.get("预估供给量", 0))),
        })

    # --- HOLIDAY_DATA ---
    print("[4] 转换节假日数据...")
    holiday_rows = []
    for r in holiday:
        dt_str = r.get("日期", "")
        # Get month from date for 淡旺季月度 type
        if dt_str and len(dt_str) >= 7:
            ym = dt_str[:7]  # "2026-01"
        else:
            ym = ""
        # Map 旺季等级 to a numeric demand boost
        level = r.get("旺季等级", "")
        boost = r.get("预估需求增幅", "+0%")
        holiday_rows.append({
            "date": ym if r.get("类型") == "法定节假日" else ym,
            "name": r.get("节日名称", ""),
            "type": r.get("类型", ""),
            "demandBoost": boost,
        })

    # Add 淡旺季月度 rows
    month_boosts = {
        1: ("春节前1个月", "超级旺季", "+300%"),
        2: ("春节+寒假", "普通旺季", "+50%"),
        3: ("回南天", "超级旺季", "+150%"),
        4: ("三月三+回南天", "超级旺季", "+150%"),
        5: ("常规", "平季", "+0%"),
        6: ("常规", "平季", "+0%"),
        7: ("暑假", "普通旺季", "+50%"),
        8: ("暑假", "普通旺季", "+50%"),
        9: ("常规", "平季", "+0%"),
        10: ("国庆+重阳", "普通旺季", "+30%"),
        11: ("常规", "平季", "+0%"),
        12: ("春节前预热", "普通旺季", "+50%"),
    }
    # 2025
    for m, (name, level, boost) in month_boosts.items():
        holiday_rows.append({
            "date": f"2025-{m:02d}",
            "name": name,
            "type": "淡旺季月度",
            "demandBoost": boost,
        })
    # 2026
    for m, (name, level, boost) in month_boosts.items():
        holiday_rows.append({
            "date": f"2026-{m:02d}",
            "name": name,
            "type": "淡旺季月度",
            "demandBoost": boost,
        })

    # --- SAMPLE_ORDERS (include a small real sample) ---
    sample_size = min(50, len(orders))
    sample = random.sample(orders, sample_size)
    sample_parts = ["["]
    for row in sample:
        items = ", ".join(f"{k}: {js_val(v)}" for k, v in row.items())
        sample_parts.append(f"  {{{items}}},")
    sample_parts.append("]")
    sample_orders_js = (
        f"var SAMPLE_ORDERS = {{\n"
        f"  length: {len(orders)},\n"
        f"  sample: {''.join(sample_parts)}\n"
        f"}}"
    )

    # --- Static config ---
    districts = [
        "{name:'青秀',tier:'高端',premium:1.15}",
        "{name:'良庆',tier:'中高端',premium:1.10}",
        "{name:'江南',tier:'中端',premium:1.00}",
        "{name:'西乡塘',tier:'中端',premium:1.00}",
        "{name:'兴宁',tier:'中端',premium:1.00}",
        "{name:'邕宁',tier:'中低端',premium:1.10}",
        "{name:'武鸣',tier:'低端',premium:1.25}",
    ]

    # --- Generate JS ---
    print("[5] 生成 data.js...")

    lines = []
    lines.append("// ============================================================")
    lines.append("// 南宁家政市场数据 — 由清洗后CSV自动生成")
    lines.append(f"// 生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append(f"// 数据: 竞品价格 {len(comp_rows)}条, 供需 {len(sd_rows)}条, 节假日 {len(holiday_rows)}条, 订单 {len(orders)}条")
    lines.append("// ============================================================")
    lines.append("")
    lines.append("// 服务大类映射")
    lines.append("var SERVICE_CATEGORY = {")
    lines.append('  "日常保洁": "日常保洁",')
    lines.append('  "深度清洁": "深度清洁",')
    lines.append('  "开荒保洁": "开荒保洁",')
    lines.append('  "家电清洗-洗衣机": "家电清洗",')
    lines.append('  "家电清洗-油烟机": "家电清洗",')
    lines.append('  "家电清洗-挂机空调": "家电清洗",')
    lines.append('  "家电清洗-冰箱": "家电清洗",')
    lines.append('  "家电清洗-热水器": "家电清洗",')
    lines.append('  "家电清洗-柜机空调": "家电清洗",')
    lines.append("};")
    lines.append("")
    lines.append('var SERVICE_NAMES = ["日常保洁","深度清洁","开荒保洁","家电清洗"];')
    lines.append("")
    lines.append("var DISTRICTS = [" + ",".join(districts) + "];")
    lines.append("")
    lines.append('var PLATFORMS = ["美团家政","天鹅到家","58到家"];')
    lines.append("")

    # COMPETITIVE_PRICES
    lines.append("var COMPETITIVE_PRICES = [")
    for r in comp_rows:
        items = []
        for k in ["date","platform","district","community","service","level","unit","unitPrice","totalPrice","promoPrice","season"]:
            v = r[k]
            items.append(f"{k}: {js_val(v)}")
        lines.append(f"  {{{', '.join(items)}}},")
    lines.append("];")
    lines.append("")

    # SUPPLY_DEMAND
    lines.append("var SUPPLY_DEMAND = [")
    for r in sd_rows:
        lines.append(f"  {{ym: '{r['ym']}', demand: {r['demand']}, supply: {r['supply']}}},")
    lines.append("];")
    lines.append("")

    # HOLIDAY_DATA
    lines.append("var HOLIDAY_DATA = [")
    for r in holiday_rows:
        items = f"date: '{r['date']}', name: '{r['name']}', type: '{r['type']}', demandBoost: '{r['demandBoost']}'"
        lines.append(f"  {{{items}}},")
    lines.append("];")
    lines.append("")

    # SAMPLE_ORDERS
    lines.append(sample_orders_js + ";")
    lines.append("")

    js_content = "\n".join(lines)

    out_path = os.path.join(FRONTEND_DIR, "data.js")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(js_content)

    file_size_kb = len(js_content.encode("utf-8")) / 1024
    print(f"\n[完成] data.js 已生成: {out_path}")
    print(f"      大小: {file_size_kb:.0f} KB")
    print(f"      竞品价格: {len(comp_rows)} 条")
    print(f"      供需数据: {len(sd_rows)} 条")
    print(f"      节假日:   {len(holiday_rows)} 条")
    print(f"      订单数:   {len(orders)} 条")


if __name__ == "__main__":
    main()
