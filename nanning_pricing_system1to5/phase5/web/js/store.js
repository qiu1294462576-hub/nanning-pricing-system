// 南宁家政定价系统 — 集中状态管理 (EventEmitter)
var Store = {
  _data: {
    formDefaults: {
      serviceType: '日常保洁',
      skillLevel: '熟练',
      district: '青秀',
      duration: 3,
      apartmentType: '3室',
      timePeriod: '工作日',
      pricingMode: 'ai'
    },
    apiOnline: false,
    modelLoaded: false,
    costParams: null,
    dashboardCache: null,
    dashboardCacheTime: 0,
    apiBase: 'http://localhost:8000'
  },

  _listeners: {},

  get: function(key) {
    return this._data[key];
  },

  set: function(key, value, silent) {
    var old = this._data[key];
    this._data[key] = value;
    if (!silent && old !== value) {
      this.emit('changed:' + key, { old: old, new: value });
      this.emit('changed', { key: key, old: old, new: value });
    }
  },

  on: function(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  },

  off: function(event, callback) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(function(cb) { return cb !== callback; });
  },

  emit: function(event, data) {
    if (!this._listeners[event]) return;
    this._listeners[event].forEach(function(cb) {
      try { cb(data); } catch(e) { console.error('Store emit error:', e); }
    });
  },

  save: function() {
    try {
      localStorage.setItem('nanning_pricing_form', JSON.stringify(this._data.formDefaults));
      localStorage.setItem('nanning_pricing_prefs', JSON.stringify({
        pricingMode: this._data.formDefaults.pricingMode,
        apiBase: this._data.apiBase
      }));
    } catch(e) {}
  },

  load: function() {
    try {
      var form = localStorage.getItem('nanning_pricing_form');
      if (form) {
        var parsed = JSON.parse(form);
        Object.keys(parsed).forEach(function(k) {
          if (k in this._data.formDefaults) this._data.formDefaults[k] = parsed[k];
        }.bind(this));
      }
      var prefs = localStorage.getItem('nanning_pricing_prefs');
      if (prefs) {
        var p = JSON.parse(prefs);
        if (p.pricingMode) this._data.formDefaults.pricingMode = p.pricingMode;
        if (p.apiBase) this._data.apiBase = p.apiBase;
      }
    } catch(e) {}
  }
};
Store.load();
