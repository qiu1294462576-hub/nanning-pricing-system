// 南宁家政定价系统 — 格式化工具
module.exports = {
  yuan: function(n) {
    if (n == null || isNaN(n)) return '--';
    return '¥' + Number(n).toFixed(0);
  },
  yuanDecimal: function(n) {
    if (n == null || isNaN(n)) return '--';
    return '¥' + Number(n).toFixed(2);
  },
  percent: function(n) {
    if (n == null || isNaN(n)) return '--';
    return Number(n).toFixed(1) + '%';
  }
};
