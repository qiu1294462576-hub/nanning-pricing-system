// 南宁家政智能定价系统 — 小程序入口
App({
  globalData: {
    apiBase: 'http://localhost:8000',
    apiOnline: false,
    modelLoaded: false,
    formDefaults: {
      serviceType: '日常保洁',
      skillLevel: '熟练',
      district: '青秀',
      duration: 3,
      apartmentType: '3室',
      timePeriod: '工作日',
      pricingMode: 'ai'
    }
  },

  onLaunch: function() {
    // Load saved prefs
    var prefs = wx.getStorageSync('nanning_pricing_prefs');
    if (prefs) {
      if (prefs.apiBase) this.globalData.apiBase = prefs.apiBase;
    }
    var form = wx.getStorageSync('nanning_pricing_form');
    if (form) {
      Object.assign(this.globalData.formDefaults, form);
    }
    this.checkHealth();
  },

  checkHealth: function() {
    var self = this;
    wx.request({
      url: this.globalData.apiBase + '/',
      method: 'GET',
      success: function(res) {
        if (res.data && res.data.status === 'running') {
          self.globalData.apiOnline = true;
          self.globalData.modelLoaded = !!res.data.model_loaded;
        }
      },
      fail: function() {
        self.globalData.apiOnline = false;
      }
    });
  }
});
