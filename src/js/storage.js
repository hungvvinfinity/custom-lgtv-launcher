/**
 * Storage Module - Manages localStorage persistence for custom launcher
 * Key: hungvu_launcher_config
 */
const Storage = (function () {
  const STORAGE_KEY = 'hungvu_launcher_config';
  const WEATHER_CACHE_KEY = 'hungvu_weather_cache';
  const WEATHER_LEDGER_KEY = 'hungvu_weather_ledger';
  const FALLBACK_DEFAULT_APPS = [
    'youtube.leanback.v4',
    'com.vtvgotv.app',
    'com.fpt.fptplay'
  ];

  function getDefaultPinnedApps() {
    if (window.APP_CONFIG && Array.isArray(window.APP_CONFIG.defaultPinnedApps) && window.APP_CONFIG.defaultPinnedApps.length > 0) {
      return [...window.APP_CONFIG.defaultPinnedApps];
    }
    return [...FALLBACK_DEFAULT_APPS];
  }

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
    // Default fallback from user config
    return {
      schemaVersion: 1,
      pinned_apps: getDefaultPinnedApps()
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

  // Location Management: Config fallback + localStorage override
  const LOCATION_STORAGE_KEY = 'hungvu_user_location';
  const FALLBACK_LOCATION = {
    locationName: 'Xuân Phương, Hà Nội',
    latitude: 21.033,
    longitude: 105.743,
    timezone: 'Asia/Bangkok'
  };

  function getLocation() {
    try {
      const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.latitude && parsed.longitude) {
          return parsed;
        }
      }
    } catch (e) {}

    if (window.APP_CONFIG && window.APP_CONFIG.weather && window.APP_CONFIG.weather.latitude) {
      return Object.assign({}, FALLBACK_LOCATION, window.APP_CONFIG.weather);
    }

    return Object.assign({}, FALLBACK_LOCATION);
  }

  function setLocation(loc) {
    try {
      if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') return;
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(loc));
      // Invalidate weather cache to force fresh update for new location
      localStorage.removeItem(WEATHER_CACHE_KEY);
      localStorage.removeItem(WEATHER_LEDGER_KEY);
      window.dispatchEvent(new CustomEvent('weather-location-changed', { detail: loc }));
    } catch (e) {
      console.error('Storage: Error saving custom location', e);
    }
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
    getLocation,
    setLocation,
    getDefaultPinnedApps,
    DEFAULT_PINNED_APPS: getDefaultPinnedApps()
  };
})();
