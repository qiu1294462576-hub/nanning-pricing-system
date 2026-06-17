// 南宁家政定价系统 — SPA 路由和应用生命周期
var App = {
  _currentPage: null,
  _currentHash: null,
  _pageContainer: null,

  _pages: {
    '#pricing': null,     // loaded from PagePricing
    '#cost': null,        // loaded from PageCostQuery
    '#review': null,      // loaded from PageOrderReview
    '#params': null,      // loaded from PageParams
    '#dashboard': null    // loaded from PageDashboard
  },

  init: function() {
    var self = this;
    this._pageContainer = document.getElementById('page-container');

    // Init fixed components
    Header.init(document.getElementById('header'));
    Tabbar.init(document.getElementById('tabbar'));

    // Handle hash changes
    window.addEventListener('hashchange', function() {
      self._navigate();
    });

    // Initial navigation
    if (!window.location.hash) {
      window.location.hash = '#pricing';
    } else {
      this._navigate();
    }

    // Health check
    this._checkHealth();
  },

  _navigate: function() {
    var hash = window.location.hash || '#pricing';
    // Normalize: extract base hash if sub-hash exists
    var baseHash = hash;
    ['#pricing', '#cost', '#review', '#params', '#dashboard'].forEach(function(h) {
      if (hash.indexOf(h) === 0) baseHash = h;
    });

    if (baseHash === this._currentHash) return;

    // Destroy previous page
    if (this._currentPage && this._currentPage.destroy) {
      this._currentPage.destroy();
    }
    this._currentPage = null;

    // Clear container
    if (this._pageContainer) {
      this._pageContainer.innerHTML =
        '<div class="page-loading"><div class="spinner"></div><p>加载中...</p></div>';
    }

    // Get or instantiate page
    var page = this._getPage(baseHash);
    this._currentHash = baseHash;
    Tabbar.updateActive(baseHash);

    if (page && page.init) {
      this._currentPage = page;
      page.init(this._pageContainer);
    }
  },

  _getPage: function(hash) {
    var pageMap = {
      '#pricing': PagePricing,
      '#cost': PageCostQuery,
      '#review': PageOrderReview,
      '#params': PageParams,
      '#dashboard': PageDashboard
    };
    return pageMap[hash] || null;
  },

  _checkHealth: async function() {
    var result = await Api.checkHealth();
    if (result) {
      console.log('[App] Backend connected:', result);
    } else {
      console.log('[App] Backend not available');
    }
  }
};

// Boot when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  App.init();
});
