// 南宁家政定价系统 — 统一 API 客户端
var Api = {
  _baseUrl: function() {
    return Store.get('apiBase') || 'http://localhost:8000';
  },

  setBaseUrl: function(url) {
    Store.set('apiBase', url);
    Store.save();
  },

  request: async function(method, path, body) {
    var url = this._baseUrl() + path;
    var options = {
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      var resp = await fetch(url, options);
      if (!resp.ok) {
        var errText = '';
        try { errText = await resp.text(); } catch(e) {}
        throw new Error('HTTP ' + resp.status + (errText ? ': ' + errText : ''));
      }
      var data = await resp.json();
      Store.set('apiOnline', true, true);
      return data;
    } catch (e) {
      if (e.message.indexOf('HTTP') !== 0) {
        Store.set('apiOnline', false, true);
      }
      throw e;
    }
  },

  get: function(path) { return this.request('GET', path); },
  post: function(path, body) { return this.request('POST', path, body); },
  put: function(path, body) { return this.request('PUT', path, body); },

  checkHealth: async function() {
    try {
      var data = await this.get('/');
      if (data && data.status === 'running') {
        Store.set('apiOnline', true);
        Store.set('modelLoaded', !!data.model_loaded);
        return data;
      }
      Store.set('apiOnline', false);
      return null;
    } catch(e) {
      Store.set('apiOnline', false);
      return null;
    }
  }
};
