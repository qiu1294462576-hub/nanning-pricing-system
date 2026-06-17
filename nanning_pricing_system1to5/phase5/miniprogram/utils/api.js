// 南宁家政定价系统 — 小程序 API 客户端
var apiBase = function() {
  var app = getApp();
  return app.globalData.apiBase || 'http://localhost:8000';
};

function request(method, path, data) {
  return new Promise(function(resolve, reject) {
    wx.request({
      url: apiBase() + path,
      method: method,
      header: { 'Content-Type': 'application/json' },
      data: data,
      success: function(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          var app = getApp();
          app.globalData.apiOnline = true;
          resolve(res.data);
        } else {
          reject(new Error('HTTP ' + res.statusCode));
        }
      },
      fail: function(err) {
        var app = getApp();
        app.globalData.apiOnline = false;
        reject(new Error(err.errMsg || '网络请求失败'));
      }
    });
  });
}

module.exports = {
  get: function(path) { return request('GET', path); },
  post: function(path, data) { return request('POST', path, data); },
  put: function(path, data) { return request('PUT', path, data); }
};
