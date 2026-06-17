var api = require('../../utils/api');
var fmt = require('../../utils/format');
var defs = require('../../utils/defaults');

Page({
  data: {
    districtOptions: ['全部'].concat(defs.DISTRICTS),
    serviceOptions: ['全部'].concat(defs.SERVICE_TYPES),
    filterIdx: { district: 0, service: 0 },
    lossOnly: false,
    loading: false,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    summary: null,
    orders: []
  },

  onLoad: function() {
    this.loadData();
  },

  onFilterChange: function(e) {
    var key = e.currentTarget.dataset.key;
    var val = e.detail.value;
    var idx = this.data.filterIdx;
    idx[key] = val;
    this.setData({ filterIdx: idx });
  },

  toggleLossOnly: function() {
    this.setData({ lossOnly: !this.data.lossOnly, page: 1 });
    this.loadData();
  },

  prevPage: function() {
    if (this.data.page > 1) { this.setData({ page: this.data.page - 1 }); this.loadData(); }
  },

  nextPage: function() {
    if (this.data.page < this.data.totalPages) { this.setData({ page: this.data.page + 1 }); this.loadData(); }
  },

  loadData: function() {
    var self = this;
    this.setData({ loading: true });

    api.post('/api/order-review', {
      district: this.data.districtOptions[this.data.filterIdx.district],
      service_type: this.data.serviceOptions[this.data.filterIdx.service],
      is_loss_only: this.data.lossOnly,
      page: this.data.page,
      page_size: this.data.pageSize
    }).then(function(data) {
      var orders = (data.orders || []).map(function(o) {
        var isLoss = o['新模型_是否亏损'] === '是';
        return {
          id: o['订单ID'],
          district: o['城区'],
          serviceType: o['服务类型'],
          amount: '¥' + (o['订单金额'] || 0).toFixed(0),
          profitRate: (o['新模型_实际利润率(%)'] || 0).toFixed(1) + '%',
          profitColor: isLoss ? '#dc2626' : '#16a34a',
          rowClass: 'table-row' + (isLoss ? ' danger' : '')
        };
      });

      self.setData({
        summary: data.summary,
        orders: orders,
        totalPages: data.pagination ? data.pagination.total_pages : 1,
        loading: false
      });
    }).catch(function(err) {
      wx.showToast({ title: err.message, icon: 'none' });
      self.setData({ loading: false });
    });
  }
});
