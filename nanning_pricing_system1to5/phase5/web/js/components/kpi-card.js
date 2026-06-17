// 南宁家政定价系统 — KPI 卡片组件
var KpiCard = {
  render: function(container, cards) {
    // cards: [{label, value, delta, color}] — color is 'blue'|'green'|'red'|'purple'
    if (!container) return;
    var html = '<div class="kpi-grid">';
    cards.forEach(function(c) {
      var colorClass = c.color || 'blue';
      html += '<div class="kpi-card ' + colorClass + '">' +
        '<div class="kpi-label">' + (c.label || '') + '</div>' +
        '<div class="kpi-value">' + (c.value != null ? c.value : '--') + '</div>' +
        (c.delta ? '<div class="kpi-delta">' + c.delta + '</div>' : '') +
      '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }
};
