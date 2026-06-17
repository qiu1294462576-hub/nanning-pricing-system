// 南宁家政定价系统 — 顶部导航栏
var Header = {
  _container: null,

  init: function(container) {
    if (!container) return;
    this._container = container;
    this.render();
    Store.on('changed:apiOnline', this._updateStatus.bind(this));
    Store.on('changed:modelLoaded', this._updateStatus.bind(this));
  },

  render: function() {
    var online = Store.get('apiOnline');
    var modelLoaded = Store.get('modelLoaded');
    var html =
      '<div class="header">' +
        '<h1>南宁家政智能定价系统</h1>' +
        '<div class="header-sub">四层混合定价模型 | 成本兜底+市场锚定+AI调价+规则校验</div>' +
        '<div class="header-badges">' +
          '<span class="header-badge ' + (online ? 'online' : 'offline') + '" id="statusBadge">' +
            (online ? '● 在线' : '○ 离线') +
          '</span>' +
          '<span class="header-badge ' + (modelLoaded ? 'online' : 'offline') + '" id="modelBadge">' +
            '模型: ' + (modelLoaded ? '已加载' : '未训练') +
          '</span>' +
        '</div>' +
      '</div>';

    this._container.innerHTML = html;
  },

  _updateStatus: function() {
    if (!this._container) return;
    this.render();
  },

  destroy: function() {
    Store.off('changed:apiOnline', this._updateStatus.bind(this));
    Store.off('changed:modelLoaded', this._updateStatus.bind(this));
  }
};
