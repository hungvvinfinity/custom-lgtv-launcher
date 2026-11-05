/**
 * Storage Module - Manages localStorage persistence for custom launcher
 * Key: hungvu_launcher_config
 */
const Storage = (function () {
  const STORAGE_KEY = 'hungvu_launcher_config';
  const WEATHER_CACHE_KEY = 'hungvu_weather_cache';
  const WEATHER_LEDGER_KEY = 'hungvu_weather_ledger';
  const DEFAULT_PINNED_APPS = [
    'youtube.leanback.v4',
    'com.vtvgotv.app',
    'com.fpt.fptplay'
  ];

  // 6 Hours Cache TTL = 360 minutes = 21,600,000 milliseconds
  const WEATHER_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

  function getConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Valid array (even if empty, user can unpin all)
        if (Array.isArray(parsed.pinned_apps)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Storage: Error reading config from localStorage', e);
    }
    // Default fallback
    return {
      schemaVersion: 1,
      pinned_apps: [...DEFAULT_PINNED_APPS]
    };
  }

  function saveConfig(config) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('Storage: Error saving config to localStorage', e);
    }
  }

  function getPinnedApps() {
    return getConfig().pinned_apps;
  }

  function setPinnedApps(appIds) {
    const config = getConfig();
    // Deduplicate and filter strings
    config.pinned_apps = Array.from(new Set(appIds.filter(id => typeof id === 'string' && id.trim().length > 0)));
    saveConfig(config);
    window.dispatchEvent(new CustomEvent('pinned-apps-changed', { detail: config.pinned_apps }));
  }

  function isPinned(appId) {
    return getPinnedApps().includes(appId);
  }

  function togglePin(appId) {
    const pinned = getPinnedApps();
    const index = pinned.indexOf(appId);
    let updated;
    if (index >= 0) {
      // Remove
      updated = pinned.filter(id => id !== appId);
    } else {
      // Add
      updated = [...pinned, appId];
    }
    setPinnedApps(updated);
    return isPinned(appId);
  }

  // Weather Cache (TTL = 6 Hours / 360 Minutes -> strictly max 4 calls/day)
  function getWeatherCache(ignoreTTL) {
    try {
      const raw = localStorage.getItem(WEATHER_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const now = Date.now();
      if (ignoreTTL || (now - parsed.timestamp < WEATHER_CACHE_TTL_MS)) {
        return parsed.data;
      }
    } catch (e) {
      console.warn('Storage: Weather cache read error', e);
    }
    return null;
  }

  function setWeatherCache(data) {
    try {
      const record = {
        timestamp: Date.now(),
        data: data
      };
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(record));
    } catch (e) {
      console.error('Storage: Weather cache write error', e);
    }
  }

  // Quota Ledger: Ensures strictly <= 4 API attempts per 24h regardless of errors/restarts
  function getWeatherLedger() {
    try {
      const raw = localStorage.getItem(WEATHER_LEDGER_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { lastAttempt: 0 };
  }

  function recordWeatherAttempt() {
    try {
      localStorage.setItem(WEATHER_LEDGER_KEY, JSON.stringify({ lastAttempt: Date.now() }));
    } catch (e) {
      console.error('Storage: Error writing weather ledger', e);
    }
  }

  function isWeatherCallAllowed() {
    const ledger = getWeatherLedger();
    const last = Number(ledger.lastAttempt) || 0;
    const now = Date.now();
    // Guard against future clock drift
    if (last > now) {
      return false;
    }
    return (now - last) >= WEATHER_CACHE_TTL_MS;
  }

  return {
    getPinnedApps,
    setPinnedApps,
    isPinned,
    togglePin,
    getWeatherCache,
    setWeatherCache,
    getWeatherLedger,
    recordWeatherAttempt,
    isWeatherCallAllowed,
    DEFAULT_PINNED_APPS
  };
})();
