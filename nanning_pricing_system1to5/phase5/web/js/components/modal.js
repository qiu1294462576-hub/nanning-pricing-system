// 南宁家政定价系统 — Modal 确认对话框
var Modal = {
  _el: null,

  show: function(title, message, onConfirm, onCancel) {
    if (this._el) this.close();

    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML =
      '<div class="modal-box">' +
        '<div class="modal-title">' + (title || '确认操作') + '</div>' +
        '<div class="modal-message">' + (message || '') + '</div>' +
        '<div class="modal-actions">' +
          '<button class="modal-btn modal-btn-cancel">取消</button>' +
          '<button class="modal-btn modal-btn-confirm">确定</button>' +
        '</div>' +
      '</div>';

    overlay.querySelector('.modal-btn-cancel').addEventListener('click', function() {
      this.close();
      if (onCancel) onCancel();
    }.bind(this));

    overlay.querySelector('.modal-btn-confirm').addEventListener('click', function() {
      this.close();
      if (onConfirm) onConfirm();
    }.bind(this));

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) { this.close(); if (onCancel) onCancel(); }
    }.bind(this));

    document.body.appendChild(overlay);
    this._el = overlay;
  },

  close: function() {
    if (this._el) {
      this._el.parentNode && this._el.parentNode.removeChild(this._el);
      this._el = null;
    }
  }
};
