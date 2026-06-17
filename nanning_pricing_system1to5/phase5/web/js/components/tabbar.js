// 南宁家政定价系统 — 底部 5 标签导航栏
var Tabbar = {
  _container: null,
  _tabs: [
    { hash: '#pricing', label: '智能定价', icon: '💰' },
    { hash: '#cost', label: '成本查询', icon: '📊' },
    { hash: '#review', label: '订单复盘', icon: '📋' },
    { hash: '#params', label: '参数设置', icon: '⚙️' },
    { hash: '#dashboard', label: '数据看板', icon: '📈' }
  ],

  init: function(container) {
    if (!container) return;
    this._container = container;
    this.render();
  },

  render: function() {
    var current = window.location.hash || '#pricing';
    var html = '<div class="tabbar">';
    this._tabs.forEach(function(tab) {
      var active = (current.indexOf(tab.hash) === 0) ? ' active' : '';
      html +=
        '<a class="tab-item' + active + '" href="' + tab.hash + '">' +
          '<span class="tab-icon">' + tab.icon + '</span>' +
          '<span class="tab-label">' + tab.label + '</span>' +
        '</a>';
    });
    html += '</div>';
    this._container.innerHTML = html;
  },

  updateActive: function(hash) {
    if (!this._container) return;
    var items = this._container.querySelectorAll('.tab-item');
    items.forEach(function(item) {
      item.classList.toggle('active', item.getAttribute('href') === hash);
    });
  },

  destroy: function() {
    this._container = null;
  }
};
