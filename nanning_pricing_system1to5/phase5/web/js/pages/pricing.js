// 南宁家政定价系统 — 智能定价页面
var PagePricing = {
  _container: null,
  _mode: 'ai',
  _pieChart: null,
  _featureChart: null,
  _boundGetPrice: null,
  _boundBatch: null,
  _boundSaveParams: null,

  init: function(container) {
    this._container = container;
    this._mode = Store.get('formDefaults').pricingMode || 'ai';
    this._render();
    this._loadSavedParams();
    this._bindEvents();
    this._checkAndLoadModelInfo();
    // Re-render pie chart on resize
    var self = this;
    this._resizeHandler = function() {
      if (self._pieChart) self._pieChart.resize();
      if (self._featureChart) self._featureChart.resize();
    };
    window.addEventListener('resize', this._resizeHandler);
  },

  destroy: function() {
    this._unbindEvents();
    if (this._pieChart) { this._pieChart.dispose(); this._pieChart = null; }
    if (this._featureChart) { this._featureChart.dispose(); this._featureChart = null; }
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }
    this._container = null;
  },

  // ============================================================
  // Render
  // ============================================================

  _render: function() {
    var defaults = Store.get('formDefaults');
    var html =
      // API Status
      '<div class="card" id="pricingStatusCard">' +
        '<div class="status-bar offline" id="pricingApiStatus">' +
          '<span class="status-dot"></span>' +
          '<span>后端状态: <span id="pricingStatusText">检查中...</span></span>' +
        '</div>' +
      '</div>' +

      // Input Form
      '<div class="card">' +
        '<h2>服务信息</h2>' +
        '<div class="form-row">' +
          '<div class="form-group"><label>服务类型</label><select id="pserviceType">' +
            DEFAULTS.SERVICE_TYPES.map(function(s) { return '<option value="' + s + '">' + s + '</option>'; }).join('') +
          '</select></div>' +
          '<div class="form-group"><label>师傅等级</label><select id="pskillLevel">' +
            DEFAULTS.SKILL_LEVELS.map(function(s) { return '<option value="' + s + '">' + s + '</option>'; }).join('') +
          '</select></div>' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="form-group"><label>城区</label><select id="pdistrict">' +
            DEFAULTS.DISTRICTS.map(function(s) { return '<option value="' + s + '">' + s + '</option>'; }).join('') +
          '</select></div>' +
          '<div class="form-group"><label>时间段</label><select id="ptimePeriod">' +
            DEFAULTS.TIME_PERIODS.map(function(s) { return '<option value="' + s + '">' + s + '</option>'; }).join('') +
          '</select></div>' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="form-group"><label>服务时长（小时）</label><input type="number" id="pduration" value="' + defaults.duration + '" min="0.5" max="24" step="0.5"></div>' +
          '<div class="form-group"><label>户型</label><select id="papartmentType">' +
            DEFAULTS.APARTMENT_TYPES.map(function(s) { return '<option value="' + s + '">' + s + '</option>'; }).join('') +
          '</select></div>' +
        '</div>' +

        // Mode Toggle
        '<div class="mode-toggle">' +
          '<div class="mode-btn' + (this._mode === 'ai' ? ' active' : '') + '" data-mode="ai">' +
            '<span class="mode-icon">🤖</span> AI 定价</div>' +
          '<div class="mode-btn' + (this._mode === 'rule' ? ' active' : '') + '" data-mode="rule">' +
            '<span class="mode-icon">📐</span> 纯规则</div>' +
          '<div class="mode-btn' + (this._mode === 'compare' ? ' active' : '') + '" data-mode="compare">' +
            '<span class="mode-icon">⚖️</span> 对比模式</div>' +
        '</div>' +

        '<button class="btn btn-primary" id="pricingSubmitBtn">🚀 获取定价</button>' +
      '</div>' +

      // Result (single mode)
      '<div class="card" id="pricingResultCard" style="display:none;">' +
        '<h2>定价结果</h2>' +
        '<div id="pricingSingleMode">' +
          '<div class="output-grid">' +
            '<div class="output-card blue"><div class="card-label">最终定价</div><div class="card-value" id="pfinalPrice">--</div></div>' +
            '<div class="output-card green"><div class="card-label">保本价</div><div class="card-value" id="pbreakEven">--</div></div>' +
            '<div class="output-card red"><div class="card-label">毛利率</div><div class="card-value" id="pmarginPct">--</div></div>' +
          '</div>' +
          '<div class="output-grid">' +
            '<div class="output-card purple"><div class="card-label">AI 建议价</div><div class="card-value" id="paiPrice">--</div></div>' +
            '<div class="output-card green"><div class="card-label">规则定价值</div><div class="card-value" id="prulePrice">--</div></div>' +
            '<div class="output-card blue"><div class="card-label">安全底价</div><div class="card-value" id="pfloorPrice">--</div></div>' +
          '</div>' +
        '</div>' +
        // Comparison mode
        '<div id="pricingCompareMode" style="display:none;">' +
          '<div class="comparison-grid">' +
            '<div class="comp-card ai"><div class="card-label">🤖 AI 定价</div><div class="card-value" id="pcompAiPrice">--</div><div class="text-muted" id="pcompAiMargin"></div></div>' +
            '<div class="comp-card rule"><div class="card-label">📐 规则定价</div><div class="card-value" id="pcompRulePrice">--</div><div class="text-muted" id="pcompRuleMargin"></div></div>' +
          '</div>' +
          '<div class="text-center"><span style="font-size:13px;font-weight:600;">保本价: <span id="pcompBreakEven" style="color:var(--danger);">--</span></span></div>' +
        '</div>' +

        '<div class="card-section-title">加价原因</div>' +
        '<div class="factor-list" id="pfactorList"></div>' +

        '<div class="card-section-title">成本构成</div>' +
        '<div class="cost-list">' +
          '<div class="cost-item"><span class="cost-name"><span class="cost-dot" style="background:#2563eb"></span>人力成本</span><span class="cost-amount" id="plaborCost">--</span></div>' +
          '<div class="cost-item"><span class="cost-name"><span class="cost-dot" style="background:#16a34a"></span>耗材成本</span><span class="cost-amount" id="pmaterialCost">--</span></div>' +
          '<div class="cost-item"><span class="cost-name"><span class="cost-dot" style="background:#f59e0b"></span>交通成本</span><span class="cost-amount" id="ptransportCost">--</span></div>' +
          '<div class="cost-item"><span class="cost-name"><span class="cost-dot" style="background:#8b5cf6"></span>管理成本</span><span class="cost-amount" id="pmanagementCost">--</span></div>' +
          '<div class="cost-item"><span class="cost-name"><span class="cost-dot" style="background:#ef4444"></span>风险裕量</span><span class="cost-amount" id="priskBuffer">--</span></div>' +
        '</div>' +

        '<div class="chart-box mt-12" id="pPieChart"></div>' +
      '</div>' +

      // Feature Importance
      '<div class="card" id="pricingFeatureCard">' +
        '<h2>特征重要性 <span class="tag">模型解读</span></h2>' +
        '<div class="chart-box h300" id="pFeatureChart"></div>' +
        '<div class="text-muted mt-8" id="pfeatureCount">加载中...</div>' +
      '</div>' +

      // Batch Pricing
      '<div class="card">' +
        '<h2>批量试算</h2>' +
        '<p class="text-muted mb-8">输入多组参数（每行一组），快速对比定价结果</p>' +
        '<textarea id="pbatchInput" rows="4" style="width:100%;padding:8px;border:1px solid var(--gray-300);border-radius:6px;font-size:12px;font-family:monospace;">日常保洁,熟练,青秀,3,3室,工作日\n深度清洁,金牌,邕宁,5,别墅,周末\n开荒保洁,新手,武鸣,6,3室,工作日\n家电清洗,熟练,江南,2,3室,工作日</textarea>' +
        '<button class="btn btn-primary mt-8" id="pricingBatchBtn">批量测算</button>' +
        '<div id="pbatchResult" style="margin-top:10px;display:none;">' +
          '<div class="table-wrap"><table class="batch-table">' +
            '<thead><tr><th>服务</th><th>等级</th><th>城区</th><th>AI价</th><th>保本价</th><th>规则价</th><th>模式</th></tr></thead>' +
            '<tbody id="pbatchBody"></tbody>' +
          '</table></div>' +
        '</div>' +
      '</div>' +

      // Footer
      '<div class="text-muted text-center" style="padding:8px 0;" id="pricingFooter">加载模型信息...</div>';

    this._container.innerHTML = html;
  },

  // ============================================================
  // Events
  // ============================================================

  _bindEvents: function() {
    var self = this;

    // Mode toggle
    var modeBtns = this._container.querySelectorAll('.mode-btn');
    modeBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        self._setMode(this.dataset.mode);
      });
    });

    // Submit
    this._boundGetPrice = function() { self._getPrice(); };
    this._container.querySelector('#pricingSubmitBtn').addEventListener('click', this._boundGetPrice);

    // Batch
    this._boundBatch = function() { self._batchPricing(); };
    this._container.querySelector('#pricingBatchBtn').addEventListener('click', this._boundBatch);

    // Save params on change
    this._boundSaveParams = function() { self._saveParams(); };
    var inputs = this._container.querySelectorAll('input, select');
    inputs.forEach(function(el) {
      el.addEventListener('change', self._boundSaveParams);
      el.addEventListener('input', self._boundSaveParams);
    });

    // Batch input
    var batchInput = this._container.querySelector('#pbatchInput');
    if (batchInput) batchInput.addEventListener('input', self._boundSaveParams);

    // Health check on API status change
    Store.on('changed:apiOnline', function() { self._updateStatusBar(); });
    Store.on('changed:modelLoaded', function() { self._updateStatusBar(); });
  },

  _unbindEvents: function() {
    if (this._boundGetPrice) {
      var btn = this._container && this._container.querySelector('#pricingSubmitBtn');
      if (btn) btn.removeEventListener('click', this._boundGetPrice);
    }
    if (this._boundBatch) {
      var bbtn = this._container && this._container.querySelector('#pricingBatchBtn');
      if (bbtn) bbtn.removeEventListener('click', this._boundBatch);
    }
    if (this._boundSaveParams) {
      var inputs = this._container && this._container.querySelectorAll('input, select');
      if (inputs) inputs.forEach(function(el) {
        el.removeEventListener('change', this._boundSaveParams);
        el.removeEventListener('input', this._boundSaveParams);
      }.bind(this));
    }
    // Store listeners removed in header
  },

  // ============================================================
  // Mode
  // ============================================================

  _setMode: function(mode) {
    this._mode = mode;
    var btns = this._container.querySelectorAll('.mode-btn');
    btns.forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    var singleMode = this._container.querySelector('#pricingSingleMode');
    var compareMode = this._container.querySelector('#pricingCompareMode');
    if (singleMode) singleMode.style.display = (mode === 'compare') ? 'none' : 'block';
    if (compareMode) compareMode.style.display = (mode === 'compare') ? 'block' : 'none';
    this._saveParams();
  },

  // ============================================================
  // Status Bar
  // ============================================================

  _updateStatusBar: function() {
    var bar = this._container && this._container.querySelector('#pricingApiStatus');
    var text = this._container && this._container.querySelector('#pricingStatusText');
    if (!bar || !text) return;

    var online = Store.get('apiOnline');
    var modelLoaded = Store.get('modelLoaded');

    if (online) {
      bar.className = 'status-bar online';
      text.textContent = '在线 · ' + (modelLoaded ? '模型已加载' : '模型未训练');
    } else {
      bar.className = 'status-bar offline';
      text.textContent = '无法连接后端 (localhost:8000)';
    }
  },

  _checkAndLoadModelInfo: async function() {
    this._updateStatusBar();

    // Feature importance
    try {
      var info = await Api.get('/api/model-info');
      var mi = info.model_info || {};
      var fi = mi.feature_importance;

      var footer = this._container && this._container.querySelector('#pricingFooter');
      if (footer) {
        footer.textContent = '模型版本: ' + (mi.train_date || '未训练') +
          ' | 特征数: ' + (mi.feature_count || 0) +
          ' | 架构: ' + ((mi.layers || []).join(' + ') || 'N/A');
      }

      if (fi) {
        this._renderFeatureChart(fi);
        var fc = this._container && this._container.querySelector('#pfeatureCount');
        if (fc) fc.textContent = '共 ' + Object.keys(fi).length + ' 个特征 | 模型版本: ' + (mi.train_date || '未知');
      } else {
        var fc2 = this._container && this._container.querySelector('#pfeatureCount');
        if (fc2) fc2.textContent = '模型未训练，暂无特征重要性数据';
      }
    } catch (e) {
      var footer2 = this._container && this._container.querySelector('#pricingFooter');
      if (footer2) footer2.textContent = '后端未连接，请启动: uvicorn backend.main:app --reload --port 8000';
    }
  },

  _renderFeatureChart: function(fi) {
    var dom = this._container && this._container.querySelector('#pFeatureChart');
    if (!dom) return;

    var items = Object.entries(fi).sort(function(a, b) { return b[1] - a[1]; });
    var names = items.slice(0, 12).map(function(i) { return i[0]; });
    var values = items.slice(0, 12).map(function(i) { return i[1]; });

    if (this._featureChart) this._featureChart.dispose();
    this._featureChart = echarts.init(dom);
    this._featureChart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '10%', top: '5%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value', name: '重要性 (%)', axisLabel: { fontSize: 10 } },
      yAxis: { type: 'category', data: names.reverse(), axisLabel: { fontSize: 10 } },
      series: [{
        type: 'bar', data: values.reverse(),
        itemStyle: { color: '#2563eb', borderRadius: [0, 4, 4, 0] },
        barWidth: '70%'
      }]
    });
  },

  // ============================================================
  // API Call — Single Price
  // ============================================================

  _getPrice: async function() {
    var dur = parseFloat(this._getElVal('pduration')) || 0;
    if (dur <= 0) { Toast.error('请输入有效的服务时长'); return; }

    var data = {
      service_type: this._getElVal('pserviceType'),
      skill_level: this._getElVal('pskillLevel'),
      district: this._getElVal('pdistrict'),
      duration: dur,
      apartment_type: this._getElVal('papartmentType'),
      time_period: this._getElVal('ptimePeriod'),
      mode: this._mode === 'compare' ? 'ai' : this._mode
    };

    try {
      var aiResult = null;
      var ruleResult = null;

      if (this._mode === 'compare') {
        var results = await Promise.all([
          Api.post('/api/price', data),
          Api.post('/api/price', Object.assign({}, data, { mode: 'rule' }))
        ]);
        aiResult = results[0].result;
        ruleResult = results[1].result;
      } else {
        var resp = await Api.post('/api/price', data);
        aiResult = resp.result;
      }

      this._displayResult(aiResult, ruleResult);
    } catch (e) {
      Toast.error('请求失败: ' + e.message);
    }
  },

  _displayResult: function(result, ruleResult) {
    var resultCard = this._container && this._container.querySelector('#pricingResultCard');
    if (resultCard) resultCard.style.display = 'block';

    if (this._mode !== 'compare') {
      this._setText('pfinalPrice', Format.yuan(result.final_price));
      this._setText('pbreakEven', Format.yuan(result.break_even_price));
      this._setText('pmarginPct', Format.percent(result.gross_margin_pct));
      this._setElColor('pmarginPct', result.gross_margin_pct >= 25 ? 'var(--success)' : 'var(--danger)');
      this._setText('paiPrice', result.ai_price ? Format.yuan(result.ai_price) : '--');
      this._setText('prulePrice', Format.yuan(result.rule_price));
      this._setText('pfloorPrice', Format.yuan(result.floor_price));
    } else {
      this._setText('pcompAiPrice', Format.yuan(result.final_price));
      this._setText('pcompAiMargin', '毛利率 ' + Format.percent(result.gross_margin_pct));
      if (ruleResult) {
        this._setText('pcompRulePrice', Format.yuan(ruleResult.final_price));
        this._setText('pcompRuleMargin', '毛利率 ' + Format.percent(ruleResult.gross_margin_pct));
      }
      this._setText('pcompBreakEven', Format.yuan(result.break_even_price));
    }

    // Factors
    var factorList = this._container && this._container.querySelector('#pfactorList');
    if (factorList) {
      factorList.innerHTML = '';
      (result.margin_factors || []).forEach(function(f) {
        var div = document.createElement('div');
        div.className = 'factor-item';
        div.innerHTML = '<span class="factor-name">' + f.factor + '</span><span class="factor-impact">' + f.impact + '</span>';
        factorList.appendChild(div);
      });
    }

    // Cost breakdown
    var c = result.cost_detail || {};
    this._setText('plaborCost', Format.yuanDecimal(c.labor_cost));
    this._setText('pmaterialCost', Format.yuanDecimal(c.material_cost));
    this._setText('ptransportCost', Format.yuanDecimal(c.transport_cost));
    this._setText('pmanagementCost', Format.yuanDecimal(c.management_cost));
    this._setText('priskBuffer', Format.yuanDecimal(c.risk_buffer));

    // Pie chart
    this._renderPie(c);
  },

  _renderPie: function(cost) {
    var dom = this._container && this._container.querySelector('#pPieChart');
    if (!dom) return;

    if (this._pieChart) this._pieChart.dispose();
    this._pieChart = echarts.init(dom);

    var data = [
      { name: '人力成本', value: cost.labor_cost || 0 },
      { name: '耗材成本', value: cost.material_cost || 0 },
      { name: '交通成本', value: cost.transport_cost || 0 },
      { name: '管理成本', value: cost.management_cost || 0 },
      { name: '风险裕量', value: cost.risk_buffer || 0 }
    ].filter(function(d) { return d.value > 0; });

    this._pieChart.setOption({
      tooltip: { trigger: 'item', formatter: function(p) { return p.name + ': ¥' + p.value.toFixed(1); } },
      color: ['#2563eb', '#16a34a', '#f59e0b', '#8b5cf6', '#ef4444'],
      series: [{
        type: 'pie', radius: ['35%', '65%'],
        data: data,
        label: { fontSize: 11, formatter: function(p) { return p.name + '\n' + p.percent + '%'; } }
      }]
    });
  },

  // ============================================================
  // API Call — Batch Pricing
  // ============================================================

  _batchPricing: async function() {
    var raw = this._getElVal('pbatchInput') || '';
    var lines = raw.trim().split('\n');
    var orders = [];

    lines.forEach(function(line) {
      var trimmed = line.trim();
      if (!trimmed) return;
      var parts = trimmed.split(',').map(function(p) { return p.trim(); });
      if (parts.length < 3) return;
      var dur = parseFloat(parts[3] || 3);
      if (isNaN(dur) || dur <= 0) return;
      orders.push({
        service_type: parts[0],
        skill_level: parts[1],
        district: parts[2],
        duration: dur,
        apartment_type: parts[4] || '3室',
        time_period: parts[5] || '工作日',
        mode: 'ai'
      });
    });

    if (orders.length === 0) { Toast.error('请输入有效的参数'); return; }

    try {
      var resp = await Api.post('/api/batch-price', { orders: orders });
      var tbody = this._container && this._container.querySelector('#pbatchBody');
      var resultDiv = this._container && this._container.querySelector('#pbatchResult');
      if (!tbody) return;

      tbody.innerHTML = '';
      if (resultDiv) resultDiv.style.display = 'block';

      if (!resp.results) { Toast.error('服务器返回异常'); return; }

      var html = '';
      resp.results.forEach(function(r) {
        if (r.error) {
          html += '<tr><td colspan="7" style="color:var(--danger)">' + r.error + '</td></tr>';
          return;
        }
        var inp = r.input;
        var res = r.result;
        html += '<tr>' +
          '<td>' + inp.service_type + '</td>' +
          '<td>' + inp.skill_level + '</td>' +
          '<td>' + inp.district + '</td>' +
          '<td style="font-weight:600;color:var(--primary)">' + Format.yuan(res.final_price) + '</td>' +
          '<td>' + Format.yuan(res.break_even_price) + '</td>' +
          '<td>' + Format.yuan(res.rule_price) + '</td>' +
          '<td>' + res.mode_used + '</td>' +
        '</tr>';
      });
      tbody.innerHTML = html;
    } catch (e) {
      Toast.error('批量请求失败: ' + e.message);
    }
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
  },

  _setElColor: function(id, color) {
    var el = this._container && this._container.querySelector('#' + id);
    if (el) el.style.color = color;
  },

  _saveParams: function() {
    var defaults = Store.get('formDefaults');
    defaults.serviceType = this._getElVal('pserviceType') || defaults.serviceType;
    defaults.skillLevel = this._getElVal('pskillLevel') || defaults.skillLevel;
    defaults.district = this._getElVal('pdistrict') || defaults.district;
    defaults.duration = parseFloat(this._getElVal('pduration')) || defaults.duration;
    defaults.apartmentType = this._getElVal('papartmentType') || defaults.apartmentType;
    defaults.timePeriod = this._getElVal('ptimePeriod') || defaults.timePeriod;
    defaults.pricingMode = this._mode;
    Store.set('formDefaults', defaults, true);
    Store.save();
  },

  _loadSavedParams: function() {
    var defaults = Store.get('formDefaults');
    this._setSelect('pserviceType', defaults.serviceType);
    this._setSelect('pskillLevel', defaults.skillLevel);
    this._setSelect('pdistrict', defaults.district);
    this._setSelect('papartmentType', defaults.apartmentType);
    this._setSelect('ptimePeriod', defaults.timePeriod);
    var durInput = this._container && this._container.querySelector('#pduration');
    if (durInput) durInput.value = defaults.duration;
    this._setMode(defaults.pricingMode);
  },

  _setSelect: function(id, value) {
    var el = this._container && this._container.querySelector('#' + id);
    if (el && value) el.value = value;
  }
};
