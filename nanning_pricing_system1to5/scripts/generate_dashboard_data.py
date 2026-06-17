#!/usr/bin/env python3
"""将清洗后的CSV数据转为JS数据文件，供前端看板使用。"""
import csv, json, os

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "nanning")
OUTPUT = os.path.join(os.path.dirname(__file__), "..", "frontend", "data.js")

def read_csv(filename):
    path = os.path.join(DATA_DIR, filename)
    with open(path, "r", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))

def js_str(s):
    return json.dumps(s, ensure_ascii=False)

# === 竞品价格 ===
prices = read_csv("competitive_prices.csv")
price_rows = []
for r in prices:
    promo = r.get("促销价(元)", "").strip()
    price_rows.append({
        "date": r["日期"],
        "platform": r["平台"],
        "district": r["城区"],
        "community": r["小区"],
        "service": r["服务类型"],
        "level": r["服务等级"],
        "unit": r["计价方式"],
        "unitPrice": float(r["单价(元)"] or 0),
        "totalPrice": float(r["总价(元)"] or 0),
        "promoPrice": float(promo) if promo else None,
        "season": r["淡旺季"],
    })

# 服务大类映射（子类型 → 大类）
SERVICE_CATEGORY = {
    "日常保洁": "日常保洁",
    "深度清洁": "深度清洁",
    "开荒保洁": "开荒保洁",
    "家电清洗-洗衣机": "家电清洗",
    "家电清洗-油烟机": "家电清洗",
    "家电清洗-挂机空调": "家电清洗",
}

# === 供需数据 ===
sd = read_csv("supply_demand_data.csv")
supply_demand = []
for r in sd:
    supply_demand.append({
        "ym": r["年月"],
        "district": r["城区"],
        "demand": float(r["预估需求量"]),
        "supply": float(r["预估供给量"]),
        "ratio": float(r["供需比"]),
        "seasonLevel": r["旺季等级"],
    })

# === 城区经济数据 ===
area = read_csv("area_economic_data.csv")
area_data = []
for r in area:
    area_data.append({
        "district": r["城区"],
        "community": r["小区名称"],
        "avgPrice": float(r["城区均价"]),
        "refPrice": float(r["小区参考价"]),
        "tier": r["档次标签"],
        "year": int(r["建成年份"]),
        "premium": float(r["加价系数"]),
    })

# === 节假日/淡旺季 ===
holiday = read_csv("holiday_season_data.csv")
holiday_data = []
for r in holiday:
    holiday_data.append({
        "date": r["日期"],
        "name": r["节日名称"],
        "type": r["类型"],
        "seasonLevel": r["旺季等级"],
        "demandBoost": r["预估需求增幅"],
        "services": r["适用服务"],
    })

# === 成本基准 ===
cost = read_csv("cost_benchmark.csv")
cost_data = []
for r in cost:
    cost_data.append({
        "service": r["服务类型"],
        "unit": r["计价单位"],
        "level": r["服务等级"],
        "basePrice": float(r["基准价"]),
        "areaRate": r["区域加价率"],
        "finalPrice": float(r["含区域加价"]),
        "minOrder": r["最低起订"],
    })

# === 样本订单 ===
orders = read_csv("sample_orders.csv")
order_rows = []
for r in orders:
    order_rows.append({
        "id": r["订单ID"],
        "date": r["下单时间"],
        "district": r["城区"],
        "community": r["小区"],
        "service": r["服务类型"],
        "level": r["服务等级"],
        "hours": float(r["服务时长"]),
        "amount": float(r["订单金额"]),
        "rating": float(r["客户评分"]),
        "source": r["订单来源"],
    })

# === 生成JS ===
js = """// ============================================================
// 南宁家政市场数据 — 由清洗后CSV自动生成
// 生成时间: 2026-05-21
// ============================================================

// 服务大类映射
var SERVICE_CATEGORY = """ + json.dumps(SERVICE_CATEGORY, ensure_ascii=False, indent=2) + """;

// 服务大类列表
var SERVICE_NAMES = ["日常保洁","深度清洁","开荒保洁","家电清洗"];

// 城区列表（按档次排序）
var DISTRICTS = [
  {name:"青秀",  tier:"高端",   premium:1.15},
  {name:"良庆",  tier:"中高端", premium:1.10},
  {name:"江南",  tier:"中端",   premium:1.00},
  {name:"西乡塘",tier:"中端",   premium:1.00},
  {name:"兴宁",  tier:"中端",   premium:1.00},
  {name:"邕宁",  tier:"中低端", premium:1.10},
  {name:"武鸣",  tier:"低端",   premium:1.25}
];

// 平台列表
var PLATFORMS = ["美团家政","天鹅到家","58到家","壮家女","喜事连连"];

// 竞品价格数据
var COMPETITIVE_PRICES = """ + json.dumps(price_rows, ensure_ascii=False, indent=2) + """;

// 供需数据
var SUPPLY_DEMAND = """ + json.dumps(supply_demand, ensure_ascii=False, indent=2) + """;

// 城区经济数据
var AREA_DATA = """ + json.dumps(area_data, ensure_ascii=False, indent=2) + """;

// 节假日/淡旺季数据
var HOLIDAY_DATA = """ + json.dumps(holiday_data, ensure_ascii=False, indent=2) + """;

// 成本基准数据
var COST_DATA = """ + json.dumps(cost_data, ensure_ascii=False, indent=2) + """;

// 样本订单数据
var SAMPLE_ORDERS = """ + json.dumps(order_rows, ensure_ascii=False, indent=2) + """;
"""

with open(OUTPUT, "w", encoding="utf-8") as f:
    f.write(js)

print(f"OK → {OUTPUT}")
print(f"  竞品价格: {len(price_rows)} 条")
print(f"  供需数据: {len(supply_demand)} 条")
print(f"  城区经济: {len(area_data)} 条")
print(f"  节假日:   {len(holiday_data)} 条")
print(f"  成本基准: {len(cost_data)} 条")
print(f"  样本订单: {len(order_rows)} 条")
