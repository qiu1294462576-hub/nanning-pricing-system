// 南宁家政定价系统 — 智能定价页
var api = require('../../utils/api');
var fmt = require('../../utils/format');
var defs = require('../../utils/defaults');

Page({
  data: {
    serviceTypes: defs.SERVICE_TYPES,
    skillLevels: defs.SKILL_LEVELS,
    districts: defs.DISTRICTS,
    apartmentTypes: defs.APARTMENT_TYPES,
    timePeriods: defs.TIME_PERIODS,

    serviceTypeIndex: 0,
    skillLevelIndex: 1,
    districtIndex: 0,
    timePeriodIndex: 0,
    apartmentTypeIndex: 2,
    duration: '3',

    mode: 'ai',
    priceLoading: false,
    result: null,
    costItems: []
  },

  onLoad: function() {
    this.setData({ format: fmt });
    var app = getApp();
    var defs2 = app.globalData.formDefaults;
    this.setData({
      serviceTypeIndex: defs.SERVICE_TYPES.indexOf(defs2.serviceType) || 0,
      skillLevelIndex: defs.SKILL_LEVELS.indexOf(defs2.skillLevel) || 1,
      districtIndex: defs.DISTRICTS.indexOf(defs2.district) || 0,
      timePeriodIndex: defs.TIME_PERIODS.indexOf(defs2.timePeriod) || 0,
      apartmentTypeIndex: defs.APARTMENT_TYPES.indexOf(defs2.apartmentType) || 2,
      duration: String(defs2.duration || 3),
      mode: defs2.pricingMode || 'ai'
    });
  },

  onServiceTypeChange: function(e) { this.setData({ serviceTypeIndex: e.detail.value }); },
  onSkillLevelChange: function(e) { this.setData({ skillLevelIndex: e.detail.value }); },
  onDistrictChange: function(e) { this.setData({ districtIndex: e.detail.value }); },
  onTimePeriodChange: function(e) { this.setData({ timePeriodIndex: e.detail.value }); },
  onApartmentTypeChange: function(e) { this.setData({ apartmentTypeIndex: e.detail.value }); },
  onDurationInput: function(e) { this.setData({ duration: e.detail.value }); },

  setMode: function(e) {
    this.setData({ mode: e.currentTarget.dataset.mode });
  },

  getPrice: function() {
    var self = this;
    var dur = parseFloat(this.data.duration) || 0;
    if (dur <= 0) {
      wx.showToast({ title: '请输入有效时长', icon: 'none' });
      return;
    }

    this.setData({ priceLoading: true });

    var data = {
      service_type: this.data.serviceTypes[this.data.serviceTypeIndex],
      skill_level: this.data.skillLevels[this.data.skillLevelIndex],
      district: this.data.districts[this.data.districtIndex],
      duration: dur,
      apartment_type: this.data.apartmentTypes[this.data.apartmentTypeIndex],
      time_period: this.data.timePeriods[this.data.timePeriodIndex],
      mode: this.data.mode === 'compare' ? 'ai' : this.data.mode
    };

    var p1 = api.post('/api/price', data);

    if (this.data.mode === 'compare') {
      var p2 = api.post('/api/price', Object.assign({}, data, { mode: 'rule' }));
      Promise.all([p1, p2]).then(function(results) {
        self._displayResult(results[0].result, results[1].result);
        self.setData({ priceLoading: false });
      }).catch(function(err) {
        wx.showToast({ title: err.message, icon: 'none' });
        self.setData({ priceLoading: false });
      });
    } else {
      p1.then(function(resp) {
        self._displayResult(resp.result, null);
        self.setData({ priceLoading: false });
      }).catch(function(err) {
        wx.showToast({ title: err.message, icon: 'none' });
        self.setData({ priceLoading: false });
      });
    }
  },

  _displayResult: function(result, ruleResult) {
    var cost = result.cost_detail || {};
    var costItems = [
      { name: '人力成本', value: fmt.yuanDecimal(cost.labor_cost), color: '#2563eb' },
      { name: '耗材成本', value: fmt.yuanDecimal(cost.material_cost), color: '#16a34a' },
      { name: '交通成本', value: fmt.yuanDecimal(cost.transport_cost), color: '#f59e0b' },
      { name: '管理成本', value: fmt.yuanDecimal(cost.management_cost), color: '#8b5cf6' },
      { name: '风险裕量', value: fmt.yuanDecimal(cost.risk_buffer), color: '#ef4444' }
    ];

    this.setData({ result: result, costItems: costItems });

    // Save defaults
    var app = getApp();
    var defs2 = app.globalData.formDefaults;
    defs2.serviceType = this.data.serviceTypes[this.data.serviceTypeIndex];
    defs2.skillLevel = this.data.skillLevels[this.data.skillLevelIndex];
    defs2.district = this.data.districts[this.data.districtIndex];
    defs2.duration = parseFloat(this.data.duration) || 3;
    defs2.apartmentType = this.data.apartmentTypes[this.data.apartmentTypeIndex];
    defs2.timePeriod = this.data.timePeriods[this.data.timePeriodIndex];
    defs2.pricingMode = this.data.mode;
    wx.setStorageSync('nanning_pricing_form', defs2);
  }
});
