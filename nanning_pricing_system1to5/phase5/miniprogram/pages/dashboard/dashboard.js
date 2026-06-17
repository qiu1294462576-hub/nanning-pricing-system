var api = require('../../utils/api');

Page({
  data: {
    kpi: null,
    districtBreakdown: null
  },

  onShow: function() { this.refresh(); },

  refresh: function() {
    var self = this;
    api.get('/api/dashboard/kpi').then(function(data) {
      var k = data.kpi || {};
      k.total_revenue_display = (k.total_revenue / 10000).toFixed(1) + '万';
      k.total_profit_display = (k.total_profit / 10000).toFixed(1) + '万';
      self.setData({
        kpi: k,
        districtBreakdown: data.district_breakdown || []
      });
    }).catch(function(err) {
      wx.showToast({ title: '加载失败: ' + (err.message || '网络错误'), icon: 'none' });
    });
  }
});
