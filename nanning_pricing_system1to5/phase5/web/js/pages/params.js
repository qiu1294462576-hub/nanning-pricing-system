// 南宁家政定价系统 — 参数设置页面
var PageParams = {
  _container: null,
  _originalParams: null,
  _sections: [
    { id: 'sec_wages', title: '师傅到手时薪（元/小时）', cat: '师傅到手时薪', keys: ['新手', '熟练', '金牌'], unit: '元/小时', valid: [10, 100] },
    { id: 'sec_rates', title: '社保与管理费率', cat: null, custom: [
      { cat: '社保系数', sub: '通用', label: '社保系数', unit: '', valid: [0.01, 2] },
      { cat: '管理费率', sub: '通用', label: '管理费率', unit: '', valid: [0, 2] },
      { cat: '风险裕量', sub: '通用', label: '风险裕量', unit: '', valid: [0, 2] }
    ]},
    { id: 'sec_materials', title: '耗材费率（按服务类型）', cat: '耗材费率', keys: ['日常保洁', '深度清洁', '开荒保洁', '家电清洗'], unit: '元', valid: [0, 100] },
    { id: 'sec_transport', title: '交通加价（按城区）', cat: '交通加价', keys: ['青秀', '良庆', '江南', '西乡塘', '兴宁', '邕宁', '武鸣'], unit: '元/次', valid: [0, 100] },
    { id: 'sec_timeperiod', title: '时间段加价系数', cat: '时间段加价', keys: ['工作日', '周末', '节假日', '旺季'], unit: '', valid: [0.5, 3] },
    { id: 'sec_productivity', title: '开荒保洁生产率（㎡/小时）', cat: '开荒保洁生产率', keys: ['新手', '熟练', '金牌'], unit: '㎡/h', valid: [5, 50] }
  ],

  init: function(container) {
    this._container = container;
    this._render();
    this._bindEvents();
    this._loadParams();
  },

  destroy: function() {
    this._container = null;
  },

  // ============================================================
  // Render
  // ============================================================

  _render: function() {
    this._container.innerHTML =
      '<div class="card">' +
        '<h2>价格参数设置</h2>' +
        '<p class="text-muted mb-12">修改成本参数将影响所有后续定价计算，请谨慎操作。</p>' +
        '<div id="paramsSections">' +
          '<div class="page-loading"><div class="spinner"></div><p>加载参数...</p></div>' +
        '</div>' +
        '<div class="btn-group mt-12">' +
          '<button class="btn btn-outline" id="paramsResetAll">全部重置</button>' +
          '<button class="btn btn-primary" id="paramsSave">保存修改</button>' +
        '</div>' +
      '</div>' +
      '<div class="text-muted text-center" style="padding:8px 0;">修改后自动备份原文件 · 保存后即时生效</div>';
  },

  _renderSections: function(lookups) {
    var container = this._container.querySelector('#paramsSections');
    if (!container) return;

    var html = '';
    this._sections.forEach(function(sec) {
      html += '<div class="collapse-section">' +
        '<div class="collapse-header" id="' + sec.id + '_header">' +
          '<span>' + sec.title + '</span>' +
          '<span class="collapse-arrow">▼</span>' +
        '</div>' +
        '<div class="collapse-body" id="' + sec.id + '_body">';

      if (sec.custom) {
        sec.custom.forEach(function(c) {
          var val = (lookups[c.cat] || {})[c.sub];
          html += PageParams._paramRow(c.cat + '|' + c.sub, c.label, val, c.unit, c.valid);
        });
      } else {
        sec.keys.forEach(function(key) {
          var val = (lookups[sec.cat] || {})[key];
          html += PageParams._paramRow(sec.cat + '|' + key, key, val, sec.unit, sec.valid);
        });
      }

      html += '</div></div>';
    });

    container.innerHTML = html;

    // Bind collapse toggles
    var self = this;
    this._sections.forEach(function(sec) {
      var header = container.querySelector('#' + sec.id + '_header');
      if (header) {
        header.addEventListener('click', function() {
          var body = container.querySelector('#' + sec.id + '_body');
          var isOpen = body.classList.contains('open');
          body.classList.toggle('open', !isOpen);
          header.classList.toggle('open', !isOpen);
        });
      }
    });

    // Open first section by default
    var firstBody = container.querySelector('#' + this._sections[0].id + '_body');
    var firstHeader = container.querySelector('#' + this._sections[0].id + '_header');
    if (firstBody) firstBody.classList.add('open');
    if (firstHeader) firstHeader.classList.add('open');
  },

  _paramRow: function(id, label, value, unit, validRange) {
    var val = (value != null) ? value : 0;
    return '<div class="param-row">' +
      '<span class="param-label">' + label + '</span>' +
      '<input class="param-input" id="param_' + id.replace(/\|/g, '_') + '" type="number" value="' + val + '" step="any" data-valid-min="' + (validRange ? validRange[0] : '') + '" data-valid-max="' + (validRange ? validRange[1] : '') + '">' +
      '<span class="param-unit">' + (unit || '') + '</span>' +
      '<button class="param-reset" data-id="' + id + '" data-default="' + val + '">重置</button>' +
    '</div>';
  },

  // ============================================================
  // Events
  // ============================================================

  _bindEvents: function() {
    var self = this;

    this._container.querySelector('#paramsResetAll').addEventListener('click', function() {
      Modal.show('确认重置', '将全部参数恢复为服务器当前值，未保存的修改将丢失。', function() {
        self._loadParams();
        Toast.info('已重置为服务器值');
      });
    });

    this._container.querySelector('#paramsSave').addEventListener('click', function() {
      self._saveParams();
    });

    // Delegated events for reset buttons and validation
    this._container.addEventListener('click', function(e) {
      var resetBtn = e.target.closest('.param-reset');
      if (resetBtn) {
        var inputId = resetBtn.dataset.id.replace(/\|/g, '_');
        var input = self._container.querySelector('#param_' + inputId);
        var defaultValue = parseFloat(resetBtn.dataset.default);
        if (input && !isNaN(defaultValue)) {
          input.value = defaultValue;
          input.classList.remove('invalid');
        }
      }
    });

    this._container.addEventListener('input', function(e) {
      if (e.target.classList.contains('param-input')) {
        var min = parseFloat(e.target.dataset.validMin);
        var max = parseFloat(e.target.dataset.validMax);
        var val = parseFloat(e.target.value);
        if (!isNaN(min) && !isNaN(max)) {
          e.target.classList.toggle('invalid', isNaN(val) || val < min || val > max);
        }
      }
    });
  },

  // ============================================================
  // Load & Save
  // ============================================================

  _loadParams: async function() {
    try {
      var data = await Api.get('/api/cost-params');
      this._originalParams = data.lookups;
      Store.set('costParams', data.lookups);
      this._renderSections(data.lookups);
    } catch (e) {
      Toast.error('加载参数失败: ' + e.message);
      // Fallback: use store cache
      var cached = Store.get('costParams');
      if (cached) {
        this._originalParams = cached;
        this._renderSections(cached);
      }
    }
  },

  _saveParams: async function() {
    var updates = [];
    var invalidCount = 0;
    var inputs = this._container.querySelectorAll('.param-input');

    inputs.forEach(function(input) {
      var id = input.id.replace('param_', '').replace(/_/g, '|');
      var parts = id.split('|');
      if (parts.length < 2) return;
      var cat = parts[0];
      var sub = parts.slice(1).join('|');
      var val = parseFloat(input.value);
      var min = parseFloat(input.dataset.validMin);
      var max = parseFloat(input.dataset.validMax);

      if (isNaN(val)) {
        input.classList.add('invalid');
        invalidCount++;
        return;
      }
      if (!isNaN(min) && (val < min || val > max)) {
        input.classList.add('invalid');
        invalidCount++;
        return;
      }
      input.classList.remove('invalid');
      updates.push({ category: cat, subcategory: sub, value: val });
    });

    if (invalidCount > 0) {
      Toast.error('有 ' + invalidCount + ' 个参数值不合法，请修正后重试');
      return;
    }

    if (updates.length === 0) {
      Toast.info('没有需要保存的修改');
      return;
    }

    var self = this;
    Modal.show('确认保存', '将更新 ' + updates.length + ' 个成本参数，所有后续定价将使用新参数。确定继续？', async function() {
      try {
        var resp = await Api.put('/api/cost-params', { updates: updates });
        Toast.success(resp.detail || '参数保存成功');
        // Reload to sync
        await self._loadParams();
        // Notify other pages
        Store.emit('params-updated', {});
      } catch (e) {
        Toast.error('保存失败: ' + (e.message || '未知错误'));
      }
    });
  }
};
