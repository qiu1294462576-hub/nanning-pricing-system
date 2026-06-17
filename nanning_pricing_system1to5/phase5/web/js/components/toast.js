// 南宁家政定价系统 — Toast 通知组件
var Toast = {
  _timer: null,
  _el: null,

  show: function(msg, type) {
    type = type || 'info';
    if (this._el) {
      clearTimeout(this._timer);
      this._el.parentNode && this._el.parentNode.removeChild(this._el);
    }

    var el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.textContent = msg;
    document.body.appendChild(el);

    requestAnimationFrame(function() {
      el.classList.add('show');
    });

    this._el = el;
    this._timer = setTimeout(function() {
      el.classList.remove('show');
      setTimeout(function() {
        el.parentNode && el.parentNode.removeChild(el);
      }, 300);
    }, 3000);
  },

  error: function(msg) { this.show(msg, 'error'); },
  success: function(msg) { this.show(msg, 'success'); },
  info: function(msg) { this.show(msg, 'info'); }
};
