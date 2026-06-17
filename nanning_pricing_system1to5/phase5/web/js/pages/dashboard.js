// 南宁家政定价系统 — 数据看板页面
var PageDashboard = {
  _container: null,
  _charts: {},

  init: function(container) {
    this._container = container;
    this._render();
    this._loadData();
    var self = this;
    this._resizeHandler = function() {
      Object.values(self._charts).forEach(function(c) { try { c.resize(); } catch(e) {} });
    };
    window.addEventListener('resize', this._resizeHandler);
  },

  destroy: function() {
    Object.values(this._charts).forEach(function(c) { try { c.dispose(); } catch(e) {} });
    this._charts = {};
    if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
    this._container = null;
  },

  // ============================================================
  // Render
  // ============================================================

  _render: function() {
    this._container.innerHTML =
      // KPI Cards
      '<div class="card">' +
        '<h2>运营概览</h2>' +
        '<div class="kpi-grid" id="dkpiGrid"></div>' +
      '</div>' +

      // Chart 1: Monthly Trend
      '<div class="card">' +
        '<h2>月度趋势</h2>' +
        '<div class="chart-box h300" id="dchart1"></div>' +
      '</div>' +

      // Chart 2 & 3 grid
      '<div class="dashboard-grid">' +
        '<div class="card">' +
          '<h2>城区分布</h2>' +
          '<div class="chart-box h280" id="dchart2"></div>' +
        '</div>' +
        '<div class="card">' +
          '<h2>服务类型分布</h2>' +
          '<div class="chart-box h250" id="dchart3"></div>' +
        '</div>' +
      '</div>' +

      // Chart 4: AI vs Legacy
      '<div class="card">' +
        '<h2>AI vs 传统定价对比</h2>' +
        '<div class="chart-box h220" id="dchart4"></div>' +
      '</div>' +

      // Refresh + Footer
      '<div class="text-center mt-12">' +
        '<button class="btn btn-outline btn-sm" id="drefreshBtn">🔄 刷新数据</button>' +
      '</div>' +
      '<div class="text-muted text-center" style="padding:8px 0;" id="dfooter">加载中...</div>' +

      '<div class="page-loading" id="dloading"><div class="spinner"></div><p>加载看板数据...</p></div>';
  },

  _bindEvents: function() {
    var self = this;
    this._container.querySelector('#drefreshBtn').addEventListener('click', function() {
      Store.set('dashboardCache', null);
      self._loadData();
    });
  },

  // ============================================================
  // Data Loading
  // ============================================================

  _loadData: async function() {
    // Check cache (5 minute TTL)
    var cache = Store.get('dashboardCache');
    var cacheTime = Store.get('dashboardCacheTime');
    if (cache && cacheTime && (Date.now() - cacheTime < 300000)) {
      this._renderCharts(cache);
      return;
    }

    var loading = this._container.querySelector('#dloading');
    if (loading) loading.style.display = 'block';

    try {
      var data = await Api.get('/api/dashboard/kpi');
      if (loading) loading.style.display = 'none';
      Store.set('dashboardCache', data);
      Store.set('dashboardCacheTime', Date.now());
      this._renderCharts(data);
    } catch (e) {
      if (loading) loading.style.display = 'none';
      Toast.error('加载看板数据失败: ' + e.message);
      this._renderEmpty();
    }
  },

  // ============================================================
  // Charts
  // ============================================================

  _renderCharts: function(data) {
    var self = this;

    // KPI Cards
    var kpi = data.kpi || {};
    KpiCard.render(this._container.querySelector('#dkpiGrid'), [
      { label: '总订单数', value: Format.number(kpi.total_orders), color: 'blue' },
      { label: '平均客单价', value: Format.yuan(kpi.avg_price), color: 'blue' },
      { label: '平均毛利率', value: Format.percent(kpi.avg_margin_pct), color: 'green' },
      { label: '亏损率(AI)', value: Format.percent(kpi.loss_rate_pct), color: 'red' },
      { label: '总收入', value: Format.wanYuan(kpi.total_revenue), color: 'purple' },
      { label: '总利润', value: Format.wanYuan(kpi.total_profit), color: 'green' }
    ]);

    // Chart 1: Monthly Trend
    var trend = data.trend || {};
    this._renderChart('dchart1', function(dom) {
      var inst = echarts.init(dom);
      self._charts.chart1 = inst;
      inst.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: ['平均客单价', '订单数'], bottom: 0, textStyle: { fontSize: 10 } },
        grid: { left: '3%', right: '8%', top: '5%', bottom: '15%', containLabel: true },
        xAxis: { type: 'category', data: trend.months || [], axisLabel: { fontSize: 9, rotate: 30 } },
        yAxis: [
          { type: 'value', name: '元', axisLabel: { fontSize: 10 } },
          { type: 'value', name: '单', axisLabel: { fontSize: 10 } }
        ],
        series: [
          { name: '平均客单价', type: 'line', data: trend.avg_price || [], smooth: true, itemStyle: { color: '#2563eb' } },
          { name: '订单数', type: 'line', yAxisIndex: 1, data: trend.order_count || [], smooth: true, itemStyle: { color: '#16a34a' } }
        ]
      });
    });

    // Chart 2: District Breakdown
    var districts = data.district_breakdown || [];
    var distNames = districts.map(function(d) { return d.district; });
    var distPrices = districts.map(function(d) { return d.avg_price; });
    this._renderChart('dchart2', function(dom) {
      var inst = echarts.init(dom);
      self._charts.chart2 = inst;
      inst.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '8%', top: '5%', bottom: '3%', containLabel: true },
        xAxis: { type: 'value', name: '元', axisLabel: { fontSize: 10 } },
        yAxis: { type: 'category', data: distNames.slice().reverse(), axisLabel: { fontSize: 10 } },
        series: [{
          type: 'bar', data: distPrices.slice().reverse(),
          itemStyle: { color: '#2563eb', borderRadius: [0, 4, 4, 0] }, barWidth: '60%'
        }]
      });
    });

    // Chart 3: Service Distribution (donut)
    var services = data.service_breakdown || [];
    var svcData = services.map(function(s) { return { name: s.service, value: s.orders }; });
    this._renderChart('dchart3', function(dom) {
      var inst = echarts.init(dom);
      self._charts.chart3 = inst;
      inst.setOption({
        tooltip: { trigger: 'item', formatter: function(p) { return p.name + ': ' + p.value + ' 单 (' + p.percent + '%)'; } },
        color: ['#2563eb', '#16a34a', '#f59e0b', '#8b5cf6'],
        series: [{
          type: 'pie', radius: ['40%', '70%'], data: svcData,
          label: { fontSize: 11, formatter: function(p) { return p.name + '\n' + p.percent + '%'; } }
        }]
      });
    });

    // Chart 4: AI vs Legacy
    var avl = data.ai_vs_legacy || {};
    var aiLossRate = parseFloat(avl.ai_loss_rate) || 0;
    var legacyLossRate = parseFloat(avl.legacy_loss_rate) || 0;
    this._renderChart('dchart4', function(dom) {
      var inst = echarts.init(dom);
      self._charts.chart4 = inst;
      inst.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '5%', top: '8%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: ['亏损率 (%)', '平均毛利率 (%)'] },
        yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
        series: [
          { name: 'AI 定价', type: 'bar', data: [aiLossRate, parseFloat(avl.ai_avg_margin) || 0], itemStyle: { color: '#2563eb', borderRadius: [4, 4, 0, 0] }, barWidth: '35%' },
          { name: '传统定价', type: 'bar', data: [legacyLossRate, parseFloat(avl.legacy_avg_margin) || 0], itemStyle: { color: '#ef4444', borderRadius: [4, 4, 0, 0] }, barWidth: '35%' }
        ],
        legend: { data: ['AI 定价', '传统定价'], bottom: 0, textStyle: { fontSize: 10 } }
      });
    });

    // Footer
    var footer = this._container.querySelector('#dfooter');
    if (footer) {
      footer.textContent = '模型: ' + (data.model_loaded ? '已加载' : '未训练') +
        ' | 数据更新: ' + new Date().toLocaleTimeString();
    }
  },

  _renderEmpty: function() {
    KpiCard.render(this._container.querySelector('#dkpiGrid'), [
      { label: '总订单数', value: '--', color: 'blue' },
      { label: '平均客单价', value: '--', color: 'blue' },
      { label: '平均毛利率', value: '--', color: 'green' },
      { label: '亏损率(AI)', value: '--', color: 'red' },
      { label: '总收入', value: '--', color: 'purple' },
      { label: '总利润', value: '--', color: 'green' }
    ]);
    var footer = this._container.querySelector('#dfooter');
    if (footer) footer.textContent = '无法连接后端，请启动 API 服务后刷新';
  },

  _renderChart: function(id, renderFn) {
    var dom = this._container.querySelector('#' + id);
    if (!dom) return;
    // Dispose existing
    Object.keys(this._charts).forEach(function(k) {
      if (this._charts[k] && this._charts[k]._dom === dom) {
        this._charts[k].dispose();
        delete this._charts[k];
      }
    }.bind(this));
    renderFn(dom);
  }
};
