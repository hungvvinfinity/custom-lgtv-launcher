/**
 * App Module - Main Application Orchestrator & Lifecycle Manager
 */

// HomeRow Renderer
window.HomeRow = (function () {
  const container = document.getElementById('home-row');

  // Static metadata for default pins in case Luna has not loaded yet
  const STATIC_APP_INFO = {
    'youtube.leanback.v4': {
      title: 'YouTube',
      icon: 'assets/app-icons/youtube.leanback.v4.png'
    },
    'com.vtvgotv.app': {
      title: 'VTV Go',
      icon: 'assets/app-icons/com.vtvgotv.app.png'
    },
    'com.fpt.fptplay': {
      title: 'FPT Play',
      icon: 'assets/app-icons/com.fpt.fptplay.png'
    }
  };

  function render() {
    if (!container) return;

    const pinnedIds = Storage.getPinnedApps();
    const allApps = Drawer.getAllApps();

    let html = '';

    // 1. Render Pinned Apps
    pinnedIds.forEach(id => {
      const app = allApps.find(a => a.id === id);
      let title = app ? Drawer.resolveTitle(app) : (STATIC_APP_INFO[id] ? STATIC_APP_INFO[id].title : id);
      let icon = app ? Drawer.resolveIcon(app) : (STATIC_APP_INFO[id] ? STATIC_APP_INFO[id].icon : 'assets/icons/default-app.png');

      html += `
        <div class="app-tile" tabindex="0" data-app-id="${id}">
          <div class="app-tile-icon-wrapper">
            <img class="app-tile-icon" src="${icon}" onerror="this.src='assets/icons/default-app.png'" alt="${title}" />
          </div>
          <div class="app-tile-title">${title}</div>
        </div>
      `;
    });

    // 2. Permanent "Tất cả ứng dụng" (All Apps Drawer Trigger) Tile at the end (Futuristic / Holographic)
    html += `
      <div id="drawer-trigger-tile" class="app-tile drawer-trigger" tabindex="0" title="Mở danh sách tất cả ứng dụng">
        <div class="app-tile-icon-wrapper">
          <svg class="holo-icon" viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="holoTileGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#00F0FF" />
                <stop offset="50%" stop-color="#8B5CF6" />
                <stop offset="100%" stop-color="#EC4899" />
              </linearGradient>
              <filter id="holoTileGlow" x="-25%" y="-25%" width="150%" height="150%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <rect x="8" y="8" width="13" height="13" rx="4" fill="url(#holoTileGrad)" />
            <rect x="25.5" y="8" width="13" height="13" rx="4" fill="url(#holoTileGrad)" />
            <rect x="43" y="8" width="13" height="13" rx="4" fill="url(#holoTileGrad)" />
            <rect x="8" y="25.5" width="13" height="13" rx="4" fill="url(#holoTileGrad)" />
            <rect x="25.5" y="25.5" width="13" height="13" rx="4" fill="#FFFFFF" filter="url(#holoTileGlow)" />
            <rect x="43" y="25.5" width="13" height="13" rx="4" fill="url(#holoTileGrad)" />
            <rect x="8" y="43" width="13" height="13" rx="4" fill="url(#holoTileGrad)" />
            <rect x="25.5" y="43" width="13" height="13" rx="4" fill="url(#holoTileGrad)" />
            <rect x="43" y="43" width="13" height="13" rx="4" fill="url(#holoTileGrad)" />
          </svg>
        </div>
        <div class="app-tile-title">Tất cả ứng dụng</div>
      </div>
    `;

    container.innerHTML = html;
  }

  return {
    render
  };
})();

// Main Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  console.log('App: Initializing Custom TV Launcher...');

  // 1. Synchronously render Home row from localStorage first (Instant First Paint < 50ms)
  HomeRow.render();

  // 2. Initialize Clock & Date
  Clock.init();

  // Signal webOS immediately that stage is ready (dismisses splash overlay in < 50ms)
  if (window.PalmSystem) {
    if (typeof window.PalmSystem.stageReady === 'function') {
      window.PalmSystem.stageReady();
    }
    if (typeof window.PalmSystem.activate === 'function') {
      window.PalmSystem.activate();
    }
  }

  // 3. Initialize Drawer & Luna Bus App Loading
  Drawer.init();

  // 4. Initialize Weather & Background Theme
  Weather.init();

  // 5. Initialize Spatial Navigation
  Navigation.init();

  // 6. Initialize Standby Screen & Auto Power Off Inactivity Tracker
  if (typeof Standby !== 'undefined') {
    Standby.init();
  }

  // 7. Listen for changes in pinned apps
  window.addEventListener('pinned-apps-changed', () => {
    HomeRow.render();
  });

  function handleLaunchParams(paramsStr) {
    if (!paramsStr) return;
    try {
      const params = typeof paramsStr === 'string' ? JSON.parse(paramsStr) : paramsStr;
      if (params && params.testTheme) {
        console.log('App: Setting test theme:', params.testTheme);
        Weather.updateBackgroundTheme(params.testTheme);
      }
    } catch (e) {
      console.warn('App: Error parsing launchParams', e);
    }
  }

  // Check launch params on startup
  if (window.PalmSystem && window.PalmSystem.launchParams) {
    handleLaunchParams(window.PalmSystem.launchParams);
  }

  // 8. Handle webOS Lifecycle Events (Instant Relaunch & Resume)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      console.log('App: Resumed from background. Updating clock & checking weather...');
      if (window.PalmSystem && typeof window.PalmSystem.activate === 'function') {
        window.PalmSystem.activate();
      }
      Clock.update();
      Weather.fetchWeather();
      if (typeof Standby !== 'undefined' && Standby.isActive()) {
        Standby.wakeUp();
      }
    }
  });

  window.addEventListener('webOSRelaunch', (e) => {
    console.log('App: webOSRelaunch triggered (Home key pressed). Returning to Home row...');
    if (e && e.detail) {
      handleLaunchParams(e.detail);
    } else if (window.PalmSystem && window.PalmSystem.launchParams) {
      handleLaunchParams(window.PalmSystem.launchParams);
    }
    if (window.PalmSystem && typeof window.PalmSystem.activate === 'function') {
      window.PalmSystem.activate();
    }
    if (typeof Standby !== 'undefined' && Standby.isActive()) {
      Standby.wakeUp();
    }
    if (Drawer.isOpen()) {
      Drawer.close();
    }
    Clock.update();
    // Focus first tile
    setTimeout(() => {
      const firstTile = document.querySelector('.home-row .app-tile');
      if (firstTile) Navigation.setFocus(firstTile);
    }, 100);
  });
});
