var api = require('../../utils/api');
var fmt = require('../../utils/format');
var defs = require('../../utils/defaults');

Page({
  data: {
    serviceTypes: defs.SERVICE_TYPES, skillLevels: defs.SKILL_LEVELS,
    districts: defs.DISTRICTS, aptTypes: defs.APARTMENT_TYPES, timePeriods: defs.TIME_PERIODS,
    stIndex: 0, slIndex: 1, distIndex: 0, tpIndex: 0, aptIndex: 2,
    duration: '3', targetMargin: 30,
    result: null, costItems: []
  },

  onSTChange(e) { this.setData({ stIndex: e.detail.value }); this._calc(); },
  onSLChange(e) { this.setData({ slIndex: e.detail.value }); this._calc(); },
  onDistChange(e) { this.setData({ distIndex: e.detail.value }); this._calc(); },
  onTPChange(e) { this.setData({ tpIndex: e.detail.value }); this._calc(); },
  onAptChange(e) { this.setData({ aptIndex: e.detail.value }); this._calc(); },
  onDurInput(e) { this.setData({ duration: e.detail.value }); this._calc(); },
  onMarginChange(e) { this.setData({ targetMargin: e.detail.value }); this._calc(); },

  onLoad: function() {
    api.get('/api/cost-params').then(function(data) {
      getApp().globalData.costParams = data.lookups;
    }).catch(function() {});
  },

  _getL: function() {
    var app = getApp();
    var cached = app.globalData.costParams;
    if (cached) return cached;
    return {
      '师傅到手时薪': { '新手': 20, '熟练': 28, '金牌': 38 },
      '社保系数': { '通用': 1.20 },
      '耗材费率': { '日常保洁': 5, '深度清洁': 12, '开荒保洁': 3, '家电清洗': 15 },
      '交通加价': { '青秀': 5, '良庆': 8, '江南': 10, '西乡塘': 8, '兴宁': 12, '邕宁': 18, '武鸣': 25 },
      '管理费率': { '通用': 0.06 }, '风险裕量': { '通用': 0.10 },
      '时间段加价': { '工作日': 1.0, '周末': 1.10, '节假日': 1.20, '旺季': 1.30 },
      '开荒保洁生产率': { '新手': 18, '熟练': 15, '金牌': 12 },
      '家电清洗台数折算': { '通用': 1.5 }
    };
  },

  _calc: function() {
    var L = this._getL();
    var st = this.data.serviceTypes[this.data.stIndex];
    var sl = this.data.skillLevels[this.data.slIndex];
    var dist = this.data.districts[this.data.distIndex];
    var dur = parseFloat(this.data.duration) || 3;
    var tp = this.data.timePeriods[this.data.tpIndex];
    var apt = this.data.aptTypes[this.data.aptIndex];
    var margin = this.data.targetMargin / 100;

    if (dur <= 0) return;

    // Labor
    var laborCost = (L['师傅到手时薪'][sl] || 0) * (L['社保系数']['通用'] || 1.0) * dur * (L['时间段加价'][tp] || 1.0);

    // Material
    var baseMat = L['耗材费率'][st] || 0;
    var matCost;
    if (st === '开荒保洁') {
      matCost = baseMat * dur * (L['开荒保洁生产率'][sl] || 15);
    } else if (st === '家电清洗') {
      matCost = baseMat * Math.max(1, Math.round(dur / 1.5));
    } else {
      matCost = baseMat * ({ '1室':0.6,'2室':0.8,'3室':1.0,'4室+':1.3,'别墅':1.8 })[apt] || 1.0;
    }

    // Transport
    var transCost = L['交通加价'][dist] || 0;

    var totalDirect = laborCost + matCost + transCost;
    var riskBuffer = totalDirect * (L['风险裕量']['通用'] || 0.10);
    var mgmtRate = L['管理费率']['通用'] || 0.06;
    var breakEven = (totalDirect + riskBuffer) / (1 - mgmtRate);
    var targetPrice = breakEven / (1 - margin);

    this.setData({
      result: {
        totalCost: fmt.yuanDecimal(totalDirect + riskBuffer + breakEven * mgmtRate),
        breakEven: fmt.yuanDecimal(breakEven),
        targetPrice: fmt.yuanDecimal(targetPrice)
      },
      costItems: [
        { name: '人力成本', value: fmt.yuanDecimal(laborCost), color: '#2563eb' },
        { name: '耗材成本', value: fmt.yuanDecimal(matCost), color: '#16a34a' },
        { name: '交通成本', value: fmt.yuanDecimal(transCost), color: '#f59e0b' },
        { name: '管理成本', value: fmt.yuanDecimal(breakEven * mgmtRate), color: '#8b5cf6' },
        { name: '风险裕量', value: fmt.yuanDecimal(riskBuffer), color: '#ef4444' }
      ]
    });
  },

  verifyServer: function() {
    var dur = parseFloat(this.data.duration) || 3;
    var data = {
      service_type: this.data.serviceTypes[this.data.stIndex],
      skill_level: this.data.skillLevels[this.data.slIndex],
      district: this.data.districts[this.data.distIndex],
      duration: dur,
      apartment_type: this.data.aptTypes[this.data.aptIndex],
      time_period: this.data.timePeriods[this.data.tpIndex],
      mode: 'rule'
    };
    var self = this;
    api.post('/api/price', data).then(function(resp) {
      var be = resp.result.break_even_price;
      wx.showToast({ title: '后端保本价: ¥' + be.toFixed(0), icon: 'none' });
    }).catch(function(err) {
      wx.showToast({ title: err.message, icon: 'none' });
    });
  }
});
