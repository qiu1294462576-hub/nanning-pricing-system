// 南宁家政定价系统 — 成本查询页面
var PageCostQuery = {
  _container: null,
  _pieChart: null,
  _paramsLoaded: false,
  _calcTimer: null,

  init: function(container) {
    this._container = container;
    this._render();
    this._loadCostParams();
    this._bindEvents();
    var self = this;
    this._resizeHandler = function() { if (self._pieChart) self._pieChart.resize(); };
    window.addEventListener('resize', this._resizeHandler);
  },

  destroy: function() {
    if (this._calcTimer) clearTimeout(this._calcTimer);
    if (this._pieChart) { this._pieChart.dispose(); this._pieChart = null; }
    if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
    this._container = null;
  },

  // ============================================================
  // Render
  // ============================================================

  _render: function() {
    var defaults = Store.get('formDefaults');
    this._container.innerHTML =
      '<div class="card">' +
        '<h2>成本查询</h2>' +
        '<div class="form-row">' +
          '<div class="form-group"><label>服务类型</label><select id="cserviceType">' +
            DEFAULTS.SERVICE_TYPES.map(function(s) { return '<option value="' + s + '">' + s + '</option>'; }).join('') +
          '</select></div>' +
          '<div class="form-group"><label>师傅等级</label><select id="cskillLevel">' +
            DEFAULTS.SKILL_LEVELS.map(function(s) { return '<option value="' + s + '">' + s + '</option>'; }).join('') +
          '</select></div>' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="form-group"><label>城区</label><select id="cdistrict">' +
            DEFAULTS.DISTRICTS.map(function(s) { return '<option value="' + s + '">' + s + '</option>'; }).join('') +
          '</select></div>' +
          '<div class="form-group"><label>时间段</label><select id="ctimePeriod">' +
            DEFAULTS.TIME_PERIODS.map(function(s) { return '<option value="' + s + '">' + s + '</option>'; }).join('') +
          '</select></div>' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="form-group"><label>服务时长（小时）</label><input type="number" id="cduration" value="' + defaults.duration + '" min="0.5" max="24" step="0.5"></div>' +
          '<div class="form-group"><label>户型</label><select id="capartmentType">' +
            DEFAULTS.APARTMENT_TYPES.map(function(s) { return '<option value="' + s + '">' + s + '</option>'; }).join('') +
          '</select></div>' +
        '</div>' +

        // Target margin slider
        '<div class="form-group full mb-12">' +
          '<label>目标毛利率</label>' +
          '<div class="slider-wrap">' +
            '<input type="range" id="ctargetMargin" min="0" max="45" value="30" step="1">' +
            '<span class="slider-value" id="ctargetMarginVal">30%</span>' +
          '</div>' +
        '</div>' +

        '<button class="btn btn-outline btn-sm" id="cverifyBtn">校对后端</button>' +
      '</div>' +

      // Results
      '<div class="card" id="costResultCard">' +
        '<h2>成本明细</h2>' +
        '<div class="output-grid">' +
          '<div class="output-card red"><div class="card-label">总成本</div><div class="card-value" id="ctotalCost">--</div></div>' +
          '<div class="output-card blue"><div class="card-label">保本价</div><div class="card-value" id="cbreakEven">--</div></div>' +
          '<div class="output-card green"><div class="card-label">目标售价</div><div class="card-value" id="ctargetPrice">--</div></div>' +
        '</div>' +

        '<div class="card-section-title">成本构成</div>' +
        '<div class="cost-list">' +
          '<div class="cost-item"><span class="cost-name"><span class="cost-dot" style="background:#2563eb"></span>人力成本（含社保）</span><span class="cost-amount" id="claborCost">--</span></div>' +
          '<div class="cost-item"><span class="cost-name"><span class="cost-dot" style="background:#16a34a"></span>耗材成本</span><span class="cost-amount" id="cmaterialCost">--</span></div>' +
          '<div class="cost-item"><span class="cost-name"><span class="cost-dot" style="background:#f59e0b"></span>交通成本</span><span class="cost-amount" id="ctransportCost">--</span></div>' +
          '<div class="cost-item"><span class="cost-name"><span class="cost-dot" style="background:#8b5cf6"></span>管理成本</span><span class="cost-amount" id="cmanagementCost">--</span></div>' +
          '<div class="cost-item"><span class="cost-name"><span class="cost-dot" style="background:#ef4444"></span>风险裕量</span><span class="cost-amount" id="criskBuffer">--</span></div>' +
        '</div>' +

        '<div class="chart-box mt-12" id="cPieChart"></div>' +

        '<div class="card-section-title">目标售价参考</div>' +
        '<div class="whatif-grid">' +
          '<div class="whatif-item"><div class="whatif-label">25% 毛利率</div><div class="whatif-value" id="cprice25">--</div></div>' +
          '<div class="whatif-item"><div class="whatif-label">35% 毛利率</div><div class="whatif-value" id="cprice35">--</div></div>' +
        '</div>' +

        '<div class="btn-group mt-12">' +
          '<button class="btn btn-outline btn-sm" id="ccopyBtn">📋 复制明细</button>' +
          '<button class="btn btn-outline btn-sm" id="cexportBtn">📥 导出CSV</button>' +
        '</div>' +

        '<div class="text-muted mt-8" id="cverifyMsg"></div>' +
      '</div>';
  },

  // ============================================================
  // Events
  // ============================================================

  _bindEvents: function() {
    var self = this;

    var inputs = this._container.querySelectorAll('input, select');
    inputs.forEach(function(el) {
      el.addEventListener('input', function() { self._scheduleCalc(); });
      el.addEventListener('change', function() { self._scheduleCalc(); });
    });

    this._container.querySelector('#cverifyBtn').addEventListener('click', function() { self._verifyWithServer(); });
    this._container.querySelector('#ccopyBtn').addEventListener('click', function() { self._copyDetail(); });
    this._container.querySelector('#cexportBtn').addEventListener('click', function() { self._exportCSV(); });

    Store.on('changed:costParams', function() {
      self._paramsLoaded = false;
      self._loadCostParams();
    });
  },

  // ============================================================
  // Cost Params Loading
  // ============================================================

  _loadCostParams: function() {
    var self = this;
    var cached = Store.get('costParams');
    if (cached) {
      this._paramsLoaded = true;
      this._scheduleCalc();
      return;
    }

    Api.get('/api/cost-params').then(function(data) {
      Store.set('costParams', data.lookups);
      self._paramsLoaded = true;
      self._scheduleCalc();
    }).catch(function() {
      // Use embedded defaults if API unavailable
      self._paramsLoaded = true;
      self._scheduleCalc();
    });
  },

  _getLookups: function() {
    var cached = Store.get('costParams');
    if (cached) return cached;

    // Fallback defaults (from cost_parameters.csv snapshot)
    return {
      '师傅到手时薪': { '新手': 20, '熟练': 28, '金牌': 38 },
      '社保系数': { '通用': 1.20 },
      '耗材费率': { '日常保洁': 5, '深度清洁': 12, '开荒保洁': 3, '家电清洗': 15 },
      '交通加价': { '青秀': 5, '良庆': 8, '江南': 10, '西乡塘': 8, '兴宁': 12, '邕宁': 18, '武鸣': 25 },
      '管理费率': { '通用': 0.06 },
      '风险裕量': { '通用': 0.10 },
      '时间段加价': { '工作日': 1.0, '周末': 1.10, '节假日': 1.20, '旺季': 1.30 },
      '开荒保洁生产率': { '新手': 18, '熟练': 15, '金牌': 12 },
      '家电清洗台数折算': { '通用': 1.5 }
    };
  },

  // ============================================================
  // Client-Side Calculation (mirrors Python CostCalculator)
  // ============================================================

  _scheduleCalc: function() {
    if (this._calcTimer) clearTimeout(this._calcTimer);
    var self = this;
    this._calcTimer = setTimeout(function() { self._calculate(); }, 300);
  },

  _calculate: function() {
    if (!this._paramsLoaded) return;

    var L = this._getLookups();
    var st = this._getElVal('cserviceType');
    var sl = this._getElVal('cskillLevel');
    var dist = this._getElVal('cdistrict');
    var dur = parseFloat(this._getElVal('cduration')) || 3;
    var apt = this._getElVal('capartmentType');
    var tp = this._getElVal('ctimePeriod');
    var margin = parseFloat(this._getElVal('ctargetMargin')) / 100 || 0.30;

    if (dur <= 0) { Toast.error('服务时长必须大于0'); return; }

    // 1. Labor
    var hourlyWage = (L['师傅到手时薪'] || {})[sl] || 0;
    var socialIns = (L['社保系数'] || {})['通用'] || 1.0;
    var timeMult = (L['时间段加价'] || {})[tp] || 1.0;
    var laborCost = hourlyWage * socialIns * dur * timeMult;

    // 2. Material
    var baseMaterial = (L['耗材费率'] || {})[st] || 0;
    var aptCoeff = DEFAULTS.APARTMENT_MATERIAL_COEFF[apt] || 1.0;
    var materialCost;

    if (st === '开荒保洁') {
      var productivity = (L['开荒保洁生产率'] || {})[sl] || 15;
      var area = dur * productivity;
      materialCost = baseMaterial * area;
    } else if (st === '家电清洗') {
      var hoursPerUnit = (L['家电清洗台数折算'] || {})['通用'] || 1.5;
      var units = Math.max(1, Math.round(dur / hoursPerUnit));
      materialCost = baseMaterial * units;
    } else {
      materialCost = baseMaterial * aptCoeff;
    }

    // 3. Transport
    var transportCost = (L['交通加价'] || {})[dist] || 0;

    // 4. Direct total
    var totalDirect = laborCost + materialCost + transportCost;

    // 5. Risk buffer
    var riskRate = (L['风险裕量'] || {})['通用'] || 0.10;
    var riskBuffer = totalDirect * riskRate;

    // 6. Management (solving: break_even = (direct + risk) / (1 - mgmt_rate))
    var mgmtRate = (L['管理费率'] || {})['通用'] || 0.06;
    var baseBeforeMgmt = totalDirect + riskBuffer;
    var breakEven = baseBeforeMgmt / (1 - mgmtRate);
    var managementCost = breakEven * mgmtRate;
    var totalCost = breakEven;

    // 7. Target price
    var targetPrice = breakEven / (1 - margin);
    var price25 = breakEven / (1 - 0.25);
    var price35 = breakEven / (1 - 0.35);

    // Display
    this._setText('ctotalCost', Format.yuanDecimal(totalCost));
    this._setText('cbreakEven', Format.yuanDecimal(breakEven));
    this._setText('ctargetPrice', Format.yuanDecimal(targetPrice));

    this._setText('claborCost', Format.yuanDecimal(laborCost) + ' (' + Format.percent(laborCost / totalCost * 100) + ')');
    this._setText('cmaterialCost', Format.yuanDecimal(materialCost) + ' (' + Format.percent(materialCost / totalCost * 100) + ')');
    this._setText('ctransportCost', Format.yuanDecimal(transportCost) + ' (' + Format.percent(transportCost / totalCost * 100) + ')');
    this._setText('cmanagementCost', Format.yuanDecimal(managementCost) + ' (' + Format.percent(managementCost / totalCost * 100) + ')');
    this._setText('criskBuffer', Format.yuanDecimal(riskBuffer) + ' (' + Format.percent(riskBuffer / totalCost * 100) + ')');

    this._setText('cprice25', Format.yuanDecimal(price25));
    this._setText('cprice35', Format.yuanDecimal(price35));

    // Pie
    this._renderPie([
      { name: '人力成本', value: laborCost },
      { name: '耗材成本', value: materialCost },
      { name: '交通成本', value: transportCost },
      { name: '管理成本', value: managementCost },
      { name: '风险裕量', value: riskBuffer }
    ]);

    this._lastResult = {
      serviceType: st, skillLevel: sl, district: dist, duration: dur,
      apartmentType: apt, timePeriod: tp, targetMargin: margin,
      laborCost: laborCost, materialCost: materialCost, transportCost: transportCost,
      managementCost: managementCost, riskBuffer: riskBuffer,
      totalCost: totalCost, breakEven: breakEven, targetPrice: targetPrice,
      price25: price25, price35: price35
    };
  },

  _renderPie: function(data) {
    var dom = this._container && this._container.querySelector('#cPieChart');
    if (!dom) return;

    var filtered = data.filter(function(d) { return d.value > 0; });
    if (this._pieChart) this._pieChart.dispose();
    this._pieChart = echarts.init(dom);
    this._pieChart.setOption({
      tooltip: { trigger: 'item', formatter: function(p) { return p.name + ': ¥' + p.value.toFixed(1); } },
      color: ['#2563eb', '#16a34a', '#f59e0b', '#8b5cf6', '#ef4444'],
      series: [{
        type: 'pie', radius: ['35%', '65%'], data: filtered,
        label: { fontSize: 11, formatter: function(p) { return p.name + '\n' + p.percent + '%'; } }
      }]
    });
  },

  // ============================================================
  // Verify with Server
  // ============================================================

  _verifyWithServer: async function() {
    var dur = parseFloat(this._getElVal('cduration')) || 3;
    if (dur <= 0) { Toast.error('请输入有效的服务时长'); return; }

    var data = {
      service_type: this._getElVal('cserviceType'),
      skill_level: this._getElVal('cskillLevel'),
      district: this._getElVal('cdistrict'),
      duration: dur,
      apartment_type: this._getElVal('capartmentType'),
      time_period: this._getElVal('ctimePeriod'),
      mode: 'rule'
    };

    try {
      var resp = await Api.post('/api/price', data);
      var cost = resp.result.cost_detail || {};
      var be = resp.result.break_even_price;

      // Compare
      var localBE = this._lastResult ? this._lastResult.breakEven : 0;
      var diff = localBE > 0 ? Math.abs(be - localBE) : 0;
      var msgEl = this._container && this._container.querySelector('#cverifyMsg');
      if (msgEl) {
        if (diff < 0.5) {
          msgEl.textContent = '✅ 与后端一致（差异 < ¥0.5）';
          msgEl.style.color = 'var(--success)';
        } else {
          msgEl.textContent = '⚠️ 与后端有差异: 后端保本价 ' + Format.yuanDecimal(be) + '，本地 ' + Format.yuanDecimal(localBE) + '（差异 ¥' + diff.toFixed(2) + '）';
          msgEl.style.color = 'var(--warning)';
        }
      }
    } catch (e) {
      Toast.error('校对失败: ' + e.message);
    }
  },

  // ============================================================
  // Copy & Export
  // ============================================================

  _copyDetail: function() {
    if (!this._lastResult) { Toast.error('请先输入参数'); return; }
    var r = this._lastResult;
    var text =
      '服务: ' + r.serviceType + ' | 等级: ' + r.skillLevel + ' | 城区: ' + r.district + ' | 时长: ' + r.duration + 'h\n' +
      '人力成本: ' + Format.yuanDecimal(r.laborCost) + '\n' +
      '耗材成本: ' + Format.yuanDecimal(r.materialCost) + '\n' +
      '交通成本: ' + Format.yuanDecimal(r.transportCost) + '\n' +
      '管理成本: ' + Format.yuanDecimal(r.managementCost) + '\n' +
      '风险裕量: ' + Format.yuanDecimal(r.riskBuffer) + '\n' +
      '总成本/保本价: ' + Format.yuanDecimal(r.totalCost) + '\n' +
      '目标售价(' + Format.percent(r.targetMargin * 100) + '): ' + Format.yuanDecimal(r.targetPrice);

    navigator.clipboard.writeText(text).then(function() {
      Toast.success('已复制到剪贴板');
    }).catch(function() {
      Toast.error('复制失败，请手动复制');
    });
  },

  _exportCSV: function() {
    if (!this._lastResult) { Toast.error('请先输入参数'); return; }
    var r = this._lastResult;
    var bom = '﻿';
    var csv = bom + '项目,金额(元)\n' +
      '人力成本,' + r.laborCost.toFixed(2) + '\n' +
      '耗材成本,' + r.materialCost.toFixed(2) + '\n' +
      '交通成本,' + r.transportCost.toFixed(2) + '\n' +
      '管理成本,' + r.managementCost.toFixed(2) + '\n' +
      '风险裕量,' + r.riskBuffer.toFixed(2) + '\n' +
      '总成本,' + r.totalCost.toFixed(2) + '\n' +
      '保本价,' + r.breakEven.toFixed(2) + '\n' +
      '目标售价(25%毛利),' + r.price25.toFixed(2) + '\n' +
      '目标售价(35%毛利),' + r.price35.toFixed(2);

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = '成本明细_' + r.serviceType + '_' + r.district + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    Toast.success('CSV 已下载');
  },

  // ============================================================
  // Helpers
  // ============================================================

  _getElVal: function(id) {
    var el = this._container && this._container.querySelector('#' + id);
    return el ? el.value : null;
  },

  _setText: function(id, text) {
    var el = this._container && this._container.querySelector('#' + id);
    if (el) el.textContent = text;
  }
};
