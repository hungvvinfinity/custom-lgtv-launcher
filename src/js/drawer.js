/**
 * Drawer Module - All Apps Modal Grid & Pin/Unpin Management
 */
const Drawer = (function () {
  let modalElement = null;
  let gridElement = null;
  let allAppsCache = [];
  let isOpen = false;

  // Metadata for default fallback apps if not returned by Luna
  const FALLBACK_METADATA = {
    'youtube.leanback.v4': { title: 'YouTube', icon: 'assets/icons/youtube.png' },
    'com.vtvgotv.app': { title: 'VTV Go', icon: 'assets/icons/vtvgo.png' },
    'com.fpt.fptplay': { title: 'FPT Play', icon: 'assets/icons/fptplay.png' },
    'netflix': { title: 'Netflix', icon: 'assets/icons/netflix.png' },
    'vieplay.vn': { title: 'VieON', icon: 'assets/icons/vieon.png' },
    'org.webosbrew.hbchannel': { title: 'Homebrew Channel', icon: 'assets/icons/hbchannel.png' },
    'com.webos.app.browser': { title: 'Trình duyệt Web', icon: 'assets/icons/browser.png' }
  };

  // Filter apps to exclude hidden internal system daemons
  function filterApps(apps) {
    if (!Array.isArray(apps)) return [];
    return apps.filter(app => {
      // Must have valid ID
      if (!app.id || typeof app.id !== 'string') return false;

      // Exclude self launcher
      if (app.id === 'vn.hungvu.tvlauncher') return false;

      // Check visible flags
      if (app.visible === false) return false;
      if (app.class && app.class.hidden === true) return false;

      // Filter out pure background daemons
      const hiddenPrefixes = [
        'com.webos.service.',
        'com.palm.service.',
        'com.webos.boot',
        'com.webos.system'
      ];
      for (const prefix of hiddenPrefixes) {
        if (app.id.startsWith(prefix)) return false;
      }

      return true;
    });
  }

  // Resolve icon URI
  function resolveIcon(app) {
    if (!app) return 'assets/icons/default-app.png';

    // 1. Priority: Local extracted app icon from assets/app-icons/<appId>.png
    if (app.id) {
      return `assets/app-icons/${app.id}.png`;
    }

    if (FALLBACK_METADATA[app.id] && FALLBACK_METADATA[app.id].icon) {
      return FALLBACK_METADATA[app.id].icon;
    }
    return 'assets/icons/default-app.png';
  }

  // Resolve title
  function resolveTitle(app) {
    if (app.title && app.title.trim().length > 0) return app.title;
    if (FALLBACK_METADATA[app.id] && FALLBACK_METADATA[app.id].title) return FALLBACK_METADATA[app.id].title;
    return app.id;
  }

  // Render Grid
  function renderGrid(apps) {
    if (!gridElement) return;

    if (apps.length === 0) {
      gridElement.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px; color: rgba(255,255,255,0.6); font-size: 20px;">Đang tải danh sách ứng dụng...</div>';
      return;
    }

    let html = '';
    apps.forEach(app => {
      const isPinned = Storage.isPinned(app.id);
      const iconUrl = resolveIcon(app);
      const title = resolveTitle(app);

      html += `
        <div class="app-tile drawer-tile" tabindex="0" data-app-id="${app.id}" data-title="${encodeURIComponent(title)}">
          <div class="pin-badge ${isPinned ? 'pinned' : ''}" data-app-id="${app.id}" title="${isPinned ? 'Bỏ ghim' : 'Ghim ra Home'}">
            <svg viewBox="0 0 24 24">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
          </div>
          <div class="app-tile-icon-wrapper">
            <img class="app-tile-icon" src="${iconUrl}" onerror="this.src='assets/icons/default-app.png'" alt="${title}" />
          </div>
          <div class="app-tile-title">${title}</div>
        </div>
      `;
    });

    gridElement.innerHTML = html;

    // Attach click events to pin badges inside drawer
    const badges = gridElement.querySelectorAll('.pin-badge');
    badges.forEach(badge => {
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = badge.getAttribute('data-app-id');
        if (id) {
          togglePinAndSync(id);
        }
      });
    });
  }

  // Toggle Pin & Update UI
  function togglePinAndSync(appId) {
    const isNowPinned = Storage.togglePin(appId);

    // Update badge in drawer
    const badges = gridElement.querySelectorAll(`.pin-badge[data-app-id="${appId}"]`);
    badges.forEach(b => {
      if (isNowPinned) {
        b.classList.add('pinned');
        b.setAttribute('title', 'Bỏ ghim');
      } else {
        b.classList.remove('pinned');
        b.setAttribute('title', 'Ghim ra Home');
      }
    });

    // Notify Home row to re-render
    if (window.HomeRow) {
      window.HomeRow.render();
    }
  }

  // Load and cache all apps from Luna
  async function loadApps() {
    const rawApps = await Luna.listApps();
    allAppsCache = filterApps(rawApps);
    console.log(`Drawer: Loaded ${allAppsCache.length} apps from system.`);
    renderGrid(allAppsCache);
  }

  function open() {
    if (!modalElement) return;
    isOpen = true;
    modalElement.classList.add('open');

    // Focus on first app in drawer
    setTimeout(() => {
      const firstTile = gridElement ? gridElement.querySelector('.app-tile') : null;
      if (firstTile) {
        firstTile.focus();
        firstTile.classList.add('focused');
      }
    }, 100);
  }

  function close() {
    if (!modalElement) return;
    isOpen = false;
    modalElement.classList.remove('open');

    // Return focus to All Apps Trigger button on Home row
    const trigger = document.getElementById('drawer-trigger-tile');
    if (trigger) {
      trigger.focus();
      trigger.classList.add('focused');
    }
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  function init() {
    modalElement = document.getElementById('drawer-modal');
    gridElement = document.getElementById('drawer-grid');

    const closeBtn = document.getElementById('drawer-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', close);
    }

    loadApps();
  }

  return {
    init,
    open,
    close,
    toggle,
    isOpen: () => isOpen,
    getAllApps: () => allAppsCache,
    togglePinAndSync,
    resolveIcon,
    resolveTitle
  };
})();
