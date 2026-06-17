// 南宁家政定价系统 — 格式化工具
var Format = {
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
  },

  percentSigned: function(n) {
    if (n == null || isNaN(n)) return '--';
    var v = Number(n);
    return (v >= 0 ? '+' : '') + v.toFixed(1) + '%';
  },

  date: function(isoStr) {
    if (!isoStr) return '--';
    return isoStr.replace('T', ' ').substring(0, 16);
  },

  number: function(n, decimals) {
    decimals = decimals || 0;
    if (n == null || isNaN(n)) return '--';
    return Number(n).toFixed(decimals);
  },

  wanYuan: function(n) {
    if (n == null || isNaN(n)) return '--';
    return (Number(n) / 10000).toFixed(1) + '万';
  }
};
