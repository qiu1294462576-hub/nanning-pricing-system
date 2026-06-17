// 南宁家政定价系统 — ECharts 工具
var Charts = {
  instances: {},

  defaultColors: ['#2563eb', '#16a34a', '#f59e0b', '#8b5cf6', '#ef4444'],

  init: function(dom) {
    if (!dom) return null;
    var instance = echarts.init(dom);
    return instance;
  },

  register: function(key, instance) {
    if (Charts.instances[key]) {
      Charts.instances[key].dispose();
    }
    Charts.instances[key] = instance;
  },

  disposeAll: function() {
    Object.keys(Charts.instances).forEach(function(key) {
      try { Charts.instances[key].dispose(); } catch(e) {}
      delete Charts.instances[key];
    });
  },

  dispose: function(key) {
    if (Charts.instances[key]) {
      Charts.instances[key].dispose();
      delete Charts.instances[key];
    }
  },

  resizeAll: function() {
    Object.keys(Charts.instances).forEach(function(key) {
      try { Charts.instances[key].resize(); } catch(e) {}
    });
  },

  makePie: function(dom, data, colors) {
    colors = colors || Charts.defaultColors;
    var instance = Charts.init(dom);
    if (!instance) return null;
    instance.setOption({
      tooltip: { trigger: 'item', formatter: function(p) { return p.name + ': ¥' + p.value.toFixed(1); } },
      color: colors,
      series: [{
        type: 'pie', radius: ['35%', '65%'],
        data: data,
        label: { fontSize: 11, formatter: function(p) { return p.name + '\n' + p.percent + '%'; } }
      }]
    });
    return instance;
  },

  makeBar: function(dom, categories, values, options) {
    options = options || {};
    var instance = Charts.init(dom);
    if (!instance) return null;
    instance.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '8%', top: '5%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value', axisLabel: { fontSize: 10 } },
      yAxis: { type: 'category', data: categories.reverse(), axisLabel: { fontSize: 10 } },
      series: [{
        type: 'bar',
        data: values.slice().reverse(),
        itemStyle: { color: options.color || '#2563eb', borderRadius: [0, 4, 4, 0] },
        barWidth: '60%'
      }]
    });
    return instance;
  },

  makeLine: function(dom, xData, series, options) {
    options = options || {};
    var instance = Charts.init(dom);
    if (!instance) return null;
    var yAxis = [{ type: 'value', name: options.yName || '', axisLabel: { fontSize: 10 } }];
    if (options.y2Name) {
      yAxis.push({ type: 'value', name: options.y2Name, axisLabel: { fontSize: 10 } });
    }
    instance.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: series.map(function(s) { return s.name; }), bottom: 0, textStyle: { fontSize: 10 } },
      grid: { left: '3%', right: options.y2Name ? '8%' : '4%', top: '5%', bottom: '12%', containLabel: true },
      xAxis: { type: 'category', data: xData, axisLabel: { fontSize: 9, rotate: 30 } },
      yAxis: yAxis,
      series: series.map(function(s, i) {
        return {
          name: s.name, type: 'line', data: s.data,
          yAxisIndex: s.yAxisIndex || 0,
          smooth: true,
          itemStyle: { color: Charts.defaultColors[i] }
        };
      })
    });
    return instance;
  }
};

// window resize handler
window.addEventListener('resize', function() {
  clearTimeout(Charts._resizeTimer);
  Charts._resizeTimer = setTimeout(function() {
    Charts.resizeAll();
  }, 200);
});
