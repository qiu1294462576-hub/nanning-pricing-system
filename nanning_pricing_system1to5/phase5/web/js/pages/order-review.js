// 南宁家政定价系统 — 历史订单复盘页面
var PageOrderReview = {
  _container: null,
  _page: 1,
  _pageSize: 20,
  _totalPages: 1,
  _filters: { district: '全部', service_type: '全部', skill_level: '全部', time_period: '全部', is_loss_only: false },

  init: function(container) {
    this._container = container;
    this._render();
    this._bindEvents();
    this._loadData();
  },

  destroy: function() {
    this._container = null;
  },

  // ============================================================
  // Render
  // ============================================================

  _render: function() {
    this._container.innerHTML =
      // Filter
      '<div class="card">' +
        '<h2>筛选条件</h2>' +
        '<div class="filter-bar">' +
          '<select id="rfilterDistrict">' +
            '<option value="全部">全部城区</option>' +
            DEFAULTS.DISTRICTS.map(function(d) { return '<option value="' + d + '">' + d + '</option>'; }).join('') +
          '</select>' +
          '<select id="rfilterService">' +
            '<option value="全部">全部服务</option>' +
            DEFAULTS.SERVICE_TYPES.map(function(s) { return '<option value="' + s + '">' + s + '</option>'; }).join('') +
          '</select>' +
          '<select id="rfilterSkill">' +
            '<option value="全部">全部等级</option>' +
            DEFAULTS.SKILL_LEVELS.map(function(s) { return '<option value="' + s + '">' + s + '</option>'; }).join('') +
          '</select>' +
        '</div>' +
        '<div class="filter-bar">' +
          '<select id="rfilterPeriod" style="max-width:120px;">' +
            '<option value="全部">全部时段</option>' +
            DEFAULTS.TIME_PERIODS.map(function(t) { return '<option value="' + t + '">' + t + '</option>'; }).join('') +
          '</select>' +
          '<button class="filter-toggle" id="rfilterLoss">仅看亏损</button>' +
          '<button class="btn btn-primary btn-sm" id="rqueryBtn" style="flex:0 0 auto;">查询</button>' +
        '</div>' +
      '</div>' +

      // Summary KPI
      '<div class="card" id="rsummaryCard" style="display:none;">' +
        '<h2>复盘概览</h2>' +
        '<div class="kpi-grid" id="rsummaryGrid"></div>' +
        '<div class="agg-tabs" id="raggTabs"></div>' +
        '<div id="raggContent"></div>' +
      '</div>' +

      // Orders Table
      '<div class="card" id="rtableCard" style="display:none;">' +
        '<h2>订单明细</h2>' +
        '<div class="table-wrap">' +
          '<table>' +
            '<thead><tr>' +
              '<th>订单ID</th><th>时间</th><th>城区</th><th>服务</th><th>等级</th>' +
              '<th>时长</th><th>金额</th><th>新成本</th><th>利润率</th><th>盈亏</th>' +
            '</tr></thead>' +
            '<tbody id="rtableBody"></tbody>' +
          '</table>' +
        '</div>' +
        '<div class="pagination" id="rpagination"></div>' +
        '<button class="btn btn-outline btn-sm mt-8" id="rexportBtn">📥 导出筛选结果为 CSV</button>' +
      '</div>' +

      // Loading
      '<div class="page-loading" id="rloading"><div class="spinner"></div><p>加载订单数据...</p></div>';
  },

  // ============================================================
  // Events
  // ============================================================

  _bindEvents: function() {
    var self = this;

    this._container.querySelector('#rqueryBtn').addEventListener('click', function() {
      self._page = 1;
      self._readFilters();
      self._loadData();
    });

    var lossBtn = this._container.querySelector('#rfilterLoss');
    lossBtn.addEventListener('click', function() {
      self._filters.is_loss_only = !self._filters.is_loss_only;
      lossBtn.classList.toggle('active', self._filters.is_loss_only);
      self._page = 1;
      self._loadData();
    });

    this._container.querySelector('#rexportBtn').addEventListener('click', function() { self._exportCSV(); });
  },

  _readFilters: function() {
    this._filters.district = this._container.querySelector('#rfilterDistrict').value;
    this._filters.service_type = this._container.querySelector('#rfilterService').value;
    this._filters.skill_level = this._container.querySelector('#rfilterSkill').value;
    this._filters.time_period = this._container.querySelector('#rfilterPeriod').value;
  },

  // ============================================================
  // Data Loading
  // ============================================================

  _loadData: async function() {
    var loading = this._container.querySelector('#rloading');
    if (loading) loading.style.display = 'block';

    try {
      var resp = await Api.post('/api/order-review', {
        district: this._filters.district,
        service_type: this._filters.service_type,
        skill_level: this._filters.skill_level,
        time_period: this._filters.time_period,
        is_loss_only: this._filters.is_loss_only,
        page: this._page,
        page_size: this._pageSize
      });

      if (loading) loading.style.display = 'none';
      this._displayResult(resp);
    } catch (e) {
      if (loading) loading.style.display = 'none';
      Toast.error('数据加载失败: ' + e.message);
    }
  },

  _displayResult: function(data) {
    // Summary
    var s = data.summary;
    var summaryCard = this._container.querySelector('#rsummaryCard');
    if (summaryCard) summaryCard.style.display = 'block';

    KpiCard.render(this._container.querySelector('#rsummaryGrid'), [
      { label: '订单总数', value: Format.number(s.total_orders), color: 'blue' },
      { label: '亏损订单', value: Format.number(s.loss_count), color: 'red' },
      { label: '亏损率', value: Format.percent(s.loss_rate), color: 'red' },
      { label: '亏损总额', value: Format.yuanDecimal(s.total_loss_amount), color: 'red' }
    ]);

    // Aggregation tabs
    this._renderAggregations(data.aggregations);

    // Table
    var tableCard = this._container.querySelector('#rtableCard');
    if (tableCard) tableCard.style.display = 'block';
    this._renderTable(data.orders);

    // Pagination
    this._totalPages = data.pagination.total_pages || 1;
    this._renderPagination(data.pagination);

    // Store for export
    this._lastResult = data;
  },

  // ============================================================
  // Aggregation Tabs
  // ============================================================

  _renderAggregations: function(agg) {
    var tabsEl = this._container.querySelector('#raggTabs');
    var contentEl = this._container.querySelector('#raggContent');
    if (!tabsEl || !contentEl) return;

    var self = this;
    var tabDefs = [
      { key: 'by_district', label: '按城区' },
      { key: 'by_service_type', label: '按服务' },
      { key: 'by_skill_level', label: '按等级' }
    ];

    tabsEl.innerHTML = '';
    tabDefs.forEach(function(t, i) {
      var span = document.createElement('span');
      span.className = 'agg-tab' + (i === 0 ? ' active' : '');
      span.textContent = t.label;
      span.dataset.key = t.key;
      span.addEventListener('click', function() {
        tabsEl.querySelectorAll('.agg-tab').forEach(function(s) { s.classList.remove('active'); });
        this.classList.add('active');
        contentEl.querySelectorAll('.agg-content').forEach(function(c) { c.classList.remove('active'); });
        contentEl.querySelector('#agg-' + this.dataset.key).classList.add('active');
      });
      tabsEl.appendChild(span);
    });

    contentEl.innerHTML = '';
    tabDefs.forEach(function(t, i) {
      var items = agg[t.key] || [];
      var div = document.createElement('div');
      div.className = 'agg-content' + (i === 0 ? ' active' : '');
      div.id = 'agg-' + t.key;
      var html = '<div class="table-wrap"><table>' +
        '<thead><tr><th>名称</th><th>订单数</th><th>亏损数</th><th>亏损率</th><th>亏损金额</th></tr></thead><tbody>';
      items.forEach(function(item) {
        html += '<tr>' +
          '<td>' + item.name + '</td>' +
          '<td>' + item.total + '</td>' +
          '<td style="color:var(--danger)">' + item.loss + '</td>' +
          '<td>' + Format.percent(item.loss_rate) + '</td>' +
          '<td>' + Format.yuanDecimal(item.loss_amount) + '</td>' +
        '</tr>';
      });
      html += '</tbody></table></div>';
      div.innerHTML = html;
      contentEl.appendChild(div);
    });
  },

  // ============================================================
  // Table
  // ============================================================

  _renderTable: function(orders) {
    var tbody = this._container.querySelector('#rtableBody');
    if (!tbody) return;

    var html = '';
    orders.forEach(function(o) {
      var isLoss = o['新模型_是否亏损'] === '是';
      var rowClass = isLoss ? 'row-danger' : '';
      html += '<tr class="' + rowClass + '" data-order-id="' + (o['订单ID'] || '') + '">' +
        '<td title="' + (o['订单ID'] || '') + '">' + (o['订单ID'] || '').substring(0, 12) + '...</td>' +
        '<td>' + Format.date(o['下单时间']) + '</td>' +
        '<td>' + o['城区'] + '</td>' +
        '<td>' + o['服务类型'] + '</td>' +
        '<td>' + o['服务等级'] + '</td>' +
        '<td>' + o['服务时长'] + 'h</td>' +
        '<td>' + Format.yuan(o['订单金额']) + '</td>' +
        '<td>' + Format.yuan(o['新模型_总成本']) + '</td>' +
        '<td style="color:' + (o['新模型_实际利润率(%)'] >= 0 ? 'var(--success)' : 'var(--danger)') + '">' + Format.percentSigned(o['新模型_实际利润率(%)']) + '</td>' +
        '<td>' + (isLoss ? '<span style="color:var(--danger);font-weight:600;">亏损</span>' : '<span style="color:var(--success);">盈利</span>') + '</td>' +
      '</tr>';
    });

    if (orders.length === 0) {
      html = '<tr><td colspan="10" style="color:var(--gray-500);padding:20px;">暂无数据</td></tr>';
    }

    tbody.innerHTML = html;
  },

  // ============================================================
  // Pagination
  // ============================================================

  _renderPagination: function(pg) {
    var el = this._container.querySelector('#rpagination');
    if (!el) return;

    var self = this;
    el.innerHTML =
      '<button' + (this._page <= 1 ? ' disabled' : '') + ' id="rprevBtn">上一页</button>' +
      '<span class="page-info">第 <input type="number" id="rpageInput" value="' + this._page + '" min="1" max="' + this._totalPages + '" style="width:50px;"> / ' + this._totalPages + ' 页</span>' +
      '<button' + (this._page >= this._totalPages ? ' disabled' : '') + ' id="rnextBtn">下一页</button>';

    el.querySelector('#rprevBtn').addEventListener('click', function() {
      if (self._page > 1) { self._page--; self._loadData(); }
    });
    el.querySelector('#rnextBtn').addEventListener('click', function() {
      if (self._page < self._totalPages) { self._page++; self._loadData(); }
    });
    el.querySelector('#rpageInput').addEventListener('change', function() {
      var p = parseInt(this.value) || 1;
      if (p >= 1 && p <= self._totalPages) { self._page = p; self._loadData(); }
    });
  },

  // ============================================================
  // Export
  // ============================================================

  _exportCSV: async function() {
    Toast.info('正在导出全部筛选结果...');
    try {
      // Fetch ALL filtered data (not just current page)
      var resp = await Api.post('/api/order-review', {
        district: this._filters.district,
        service_type: this._filters.service_type,
        skill_level: this._filters.skill_level,
        time_period: this._filters.time_period,
        is_loss_only: this._filters.is_loss_only,
        page: 1,
        page_size: 200  // Max from backend
      });

      var orders = resp.orders || [];
      var bom = '﻿';
      var csv = bom + '订单ID,下单时间,城区,服务类型,服务等级,服务时长,订单金额,新模型_总成本,新模型_保本价,新模型_实际利润率(%),新模型_是否亏损,新模型_亏损额\n';
      orders.forEach(function(o) {
        csv += [
          o['订单ID'], o['下单时间'], o['城区'], o['服务类型'], o['服务等级'],
          o['服务时长'], o['订单金额'], o['新模型_总成本'], o['新模型_保本价'],
          o['新模型_实际利润率(%)'], o['新模型_是否亏损'], o['新模型_亏损额']
        ].join(',') + '\n';
      });

      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = '订单复盘_' + new Date().toISOString().substring(0, 10) + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      Toast.success('已导出 ' + orders.length + ' 条记录');
    } catch (e) {
      Toast.error('导出失败: ' + e.message);
    }
  }
};
