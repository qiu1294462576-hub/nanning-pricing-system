var api = require('../../utils/api');
var defs = require('../../utils/defaults');

Page({
  data: {
    districts: defs.DISTRICTS,
    sections: [{ open: true }, { open: false }],
    params: {},
    _original: {},
    saving: false
  },

  onLoad: function() {
    this.loadParams();
  },

  loadParams: function() {
    var self = this;
    api.get('/api/cost-params').then(function(data) {
      self.setData({ params: data.lookups, _original: JSON.parse(JSON.stringify(data.lookups)) });
    }).catch(function() {});
  },

  toggleSection: function(e) {
    var id = parseInt(e.currentTarget.dataset.id);
    var sections = this.data.sections;
    sections[id].open = !sections[id].open;
    this.setData({ sections: sections });
  },

  onParamInput: function(e) {
    var cat = e.currentTarget.dataset.cat;
    var sub = e.currentTarget.dataset.sub;
    var val = parseFloat(e.detail.value);
    var params = this.data.params;
    if (!params[cat]) params[cat] = {};
    params[cat][sub] = isNaN(val) ? e.detail.value : val;
    this.setData({ params: params });
  },

  saveParams: function() {
    var self = this;
    wx.showModal({
      title: '确认保存',
      content: '修改成本参数将影响所有后续定价计算，确定继续？',
      success: function(res) {
        if (!res.confirm) return;
        self.setData({ saving: true });

        var updates = [];
        var params = self.data.params;
        var orig = self.data._original;
        Object.keys(params).forEach(function(cat) {
          Object.keys(params[cat]).forEach(function(sub) {
            var newVal = parseFloat(params[cat][sub]);
            if (!isNaN(newVal) && (!orig[cat] || orig[cat][sub] !== newVal)) {
              updates.push({ category: cat, subcategory: sub, value: newVal });
            }
          });
        });

        if (updates.length === 0) {
          wx.showToast({ title: '没有需要保存的修改', icon: 'none' });
          self.setData({ saving: false });
          return;
        }

        api.put('/api/cost-params', { updates: updates }).then(function(resp) {
          wx.showToast({ title: '保存成功', icon: 'success' });
          self.setData({ saving: false, _original: JSON.parse(JSON.stringify(self.data.params)) });
        }).catch(function(err) {
          wx.showToast({ title: err.message, icon: 'none' });
          self.setData({ saving: false });
        });
      }
    });
  },

  resetAll: function() {
    var self = this;
    wx.showModal({
      title: '确认重置',
      content: '将恢复为服务器当前值，未保存的修改将丢失。',
      success: function(res) { if (res.confirm) self.loadParams(); }
    });
  }
});
