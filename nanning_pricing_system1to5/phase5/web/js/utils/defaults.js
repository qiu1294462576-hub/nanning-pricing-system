// 南宁家政定价系统 — 静态选项列表
var DEFAULTS = {
  SERVICE_TYPES: ['日常保洁', '深度清洁', '开荒保洁', '家电清洗'],
  SKILL_LEVELS: ['新手', '熟练', '金牌'],
  DISTRICTS: ['青秀', '良庆', '江南', '西乡塘', '兴宁', '邕宁', '武鸣'],
  APARTMENT_TYPES: ['1室', '2室', '3室', '4室+', '别墅'],
  TIME_PERIODS: ['工作日', '周末', '节假日', '旺季'],
  PRICING_MODES: ['ai', 'rule'],

  // 户型耗材系数（与 Python cost_calculator.py 一致）
  APARTMENT_MATERIAL_COEFF: { '1室': 0.6, '2室': 0.8, '3室': 1.0, '4室+': 1.3, '别墅': 1.8 },

  // 各服务类型默认时长
  DEFAULT_DURATIONS: { '日常保洁': 3, '深度清洁': 4, '开荒保洁': 6, '家电清洗': 2 },

  // 区域加价系数（来自 config.yaml）
  DISTRICT_PREMIUM: { '青秀': 1.15, '良庆': 1.10, '江南': 1.00, '西乡塘': 1.00, '兴宁': 1.00, '邕宁': 1.10, '武鸣': 1.25 },

  // 开荒保洁生产率 (㎡/h)
  CLEANING_PRODUCTIVITY: { '新手': 18, '熟练': 15, '金牌': 12 },

  // 家电清洗台数折算 (h/台)
  APPLIANCE_HOURS_PER_UNIT: 1.5,

  // 目标毛利率范围
  TARGET_MARGIN_MIN: 0.25,
  TARGET_MARGIN_MAX: 0.35,

  // API 基础 URL
  API_BASE: 'http://localhost:8000',
};
