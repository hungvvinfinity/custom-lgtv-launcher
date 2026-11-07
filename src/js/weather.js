/**
 * Weather Module - Open-Meteo Integration with Dynamic Location Configuration
 * Configurable via window.APP_CONFIG.weather or Storage.getLocation()
 * Default Coordinates: Lat 21.033, Lon 105.743 (Xuân Phương, Hà Nội)
 * Strict 6-hour cache policy (max 4 calls/day)
 * Compact Top-Right Weather Widget with Today & Tomorrow Forecast
 */
const Weather = (function () {
  function getLocationInfo() {
    if (typeof Storage !== 'undefined' && typeof Storage.getLocation === 'function') {
      return Storage.getLocation();
    }
    if (window.APP_CONFIG && window.APP_CONFIG.weather) {
      return window.APP_CONFIG.weather;
    }
    return {
      locationName: 'Xuân Phương, Hà Nội',
      latitude: 21.033,
      longitude: 105.743,
      timezone: 'Asia/Bangkok'
    };
  }

  function getApiUrl() {
    const loc = getLocationInfo();
    const tz = encodeURIComponent(loc.timezone || 'Asia/Bangkok');
    return `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,is_day,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=${tz}&forecast_days=3`;
  }

  // WMO Code Translation & Theme Mapping
  function parseWmo(code, isDay) {
    // 0, 1: Clear sky / Mainly clear
    if (code === 0 || code === 1) {
      return {
        desc: isDay ? 'Trời quang / Nắng' : 'Đêm quang đãng',
        theme: isDay ? 'clear-day' : 'clear-night',
        icon: isDay ? 'sun' : 'moon'
      };
    }
    // 2: Partly cloudy
    if (code === 2) {
      return {
        desc: isDay ? 'Ít mây / Nắng nhẹ' : 'Đêm mây rải rác',
        theme: isDay ? 'cloudy-day' : 'cloudy-night',
        icon: isDay ? 'partly-cloudy-day' : 'partly-cloudy-night'
      };
    }
    // 3, 45, 48: Cloudy / Overcast / Fog
    if (code === 3 || code === 45 || code === 48) {
      return {
        desc: code >= 45 ? 'Sương mù nhẹ' : 'Nhiều mây / U ám',
        theme: isDay ? 'cloudy-day' : 'cloudy-night',
        icon: code >= 45 ? 'fog' : 'cloud'
      };
    }
    // 51-67, 80-82: Drizzle / Rain / Showers
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
      return {
        desc: code >= 80 ? 'Mưa rào' : 'Mưa phùn / Mưa nhẹ',
        theme: 'rain',
        icon: 'rain'
      };
    }
    // 95-99: Thunderstorm
    if (code >= 95 && code <= 99) {
      return {
        desc: 'Dông bão / Sấm sét',
        theme: 'storm',
        icon: 'storm'
      };
    }
    // Default fallback
    return {
      desc: 'Mát mẻ',
      theme: isDay ? 'clear-day' : 'clear-night',
      icon: isDay ? 'sun' : 'moon'
    };
  }

  // Enhanced Weather SVG Icons Generator with Modern Depth & Layering (Fills ViewBox 0 0 64 64)
  function getSvgIcon(iconType) {
    switch (iconType) {
      case 'sun':
        return `<svg viewBox="0 0 64 64" fill="none">
          <defs>
            <radialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#FFF9A6" />
              <stop offset="45%" stop-color="#FFB800" />
              <stop offset="100%" stop-color="#FF6B00" />
            </radialGradient>
            <filter id="sunGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <circle cx="32" cy="32" r="15" fill="url(#sunGrad)" filter="url(#sunGlow)" />
          <g stroke="#FFAE00" stroke-width="3.5" stroke-linecap="round" opacity="0.95">
            <line x1="32" y1="4" x2="32" y2="12" />
            <line x1="32" y1="52" x2="32" y2="60" />
            <line x1="4" y1="32" x2="12" y2="32" />
            <line x1="52" y1="32" x2="60" y2="32" />
            <line x1="12" y1="12" x2="18" y2="18" />
            <line x1="46" y1="46" x2="52" y2="52" />
            <line x1="12" y1="52" x2="18" y2="46" />
            <line x1="46" y1="18" x2="52" y2="12" />
          </g>
        </svg>`;

      case 'moon':
        return `<svg viewBox="0 0 64 64" fill="none">
          <defs>
            <linearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#E1F5FE" />
              <stop offset="45%" stop-color="#00E5FF" />
              <stop offset="100%" stop-color="#0288D1" />
            </linearGradient>
            <filter id="moonGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <path d="M46 41A19 19 0 1 1 26 19a15 15 0 0 0 20 22z" fill="url(#moonGrad)" filter="url(#moonGlow)" />
          <circle cx="51" cy="17" r="1.8" fill="#FFFFFF" opacity="0.9" />
          <circle cx="41" cy="10" r="1.2" fill="#00F0FF" opacity="0.8" />
          <circle cx="54" cy="29" r="1.4" fill="#FFFFFF" opacity="0.75" />
        </svg>`;

      case 'partly-cloudy-day':
        return `<svg viewBox="0 0 64 64" fill="none">
          <defs>
            <radialGradient id="pSunGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#FFF9A6" />
              <stop offset="60%" stop-color="#FFB300" />
              <stop offset="100%" stop-color="#FF7A00" />
            </radialGradient>
            <linearGradient id="pCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#FFFFFF" />
              <stop offset="100%" stop-color="#94A3B8" />
            </linearGradient>
            <filter id="pCloudShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.5)" />
            </filter>
          </defs>
          <circle cx="27" cy="23" r="12" fill="url(#pSunGrad)" />
          <g stroke="#FFAE00" stroke-width="2.8" stroke-linecap="round" opacity="0.9">
            <line x1="27" y1="5" x2="27" y2="9" />
            <line x1="11" y1="23" x2="15" y2="23" />
            <line x1="15" y1="11" x2="18" y2="14" />
            <line x1="36" y1="14" x2="39" y2="11" />
          </g>
          <path d="M52 48H20a11 11 0 0 1-2.2-21.8 15.5 15.5 0 0 1 30-3.5A11 11 0 0 1 52 48z" fill="url(#pCloudGrad)" filter="url(#pCloudShadow)" />
        </svg>`;

      case 'partly-cloudy-night':
        return `<svg viewBox="0 0 64 64" fill="none">
          <defs>
            <linearGradient id="pMoonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#E1F5FE" />
              <stop offset="50%" stop-color="#00E5FF" />
              <stop offset="100%" stop-color="#0288D1" />
            </linearGradient>
            <linearGradient id="pCloudNight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#E2E8F0" />
              <stop offset="100%" stop-color="#475569" />
            </linearGradient>
            <filter id="pNightShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.5)" />
            </filter>
          </defs>
          <path d="M40 28A13 13 0 1 1 25 14a10.5 10.5 0 0 0 15 14z" fill="url(#pMoonGrad)" opacity="0.95" />
          <circle cx="48" cy="12" r="1.5" fill="#FFFFFF" opacity="0.8" />
          <circle cx="53" cy="22" r="1.2" fill="#00F0FF" opacity="0.7" />
          <path d="M52 48H20a11 11 0 0 1-2.2-21.8 15.5 15.5 0 0 1 30-3.5A11 11 0 0 1 52 48z" fill="url(#pCloudNight)" filter="url(#pNightShadow)" />
        </svg>`;

      case 'cloud':
        return `<svg viewBox="0 0 64 64" fill="none">
          <defs>
            <linearGradient id="cloudGradBack" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#94A3B8" />
              <stop offset="100%" stop-color="#475569" />
            </linearGradient>
            <linearGradient id="cloudGradFront" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#FFFFFF" />
              <stop offset="100%" stop-color="#94A3B8" />
            </linearGradient>
            <filter id="cloudShadow" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.4)" />
            </filter>
          </defs>
          <path d="M44 30h-2A12 12 0 0 0 21 29a9 9 0 0 0-3 8h29a7 7 0 0 0-3-7z" fill="url(#cloudGradBack)" opacity="0.75" />
          <path d="M51 46H19a11 11 0 0 1-2.2-21.8 15 15 0 0 1 29.5-3.5A11 11 0 0 1 51 46z" fill="url(#cloudGradFront)" filter="url(#cloudShadow)" />
        </svg>`;

      case 'rain':
        return `<svg viewBox="0 0 64 64" fill="none">
          <defs>
            <linearGradient id="rainCloud" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#FFFFFF" />
              <stop offset="100%" stop-color="#64748B" />
            </linearGradient>
            <filter id="rainGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>
          </defs>
          <path d="M51 36H19a10 10 0 0 1-2-19.8 14 14 0 0 1 27.2-3.5A10 10 0 0 1 51 36z" fill="url(#rainCloud)" />
          <g stroke="#00F0FF" stroke-width="3" stroke-linecap="round" filter="url(#rainGlow)">
            <line x1="23" y1="42" x2="20" y2="52" />
            <line x1="33" y1="42" x2="30" y2="55" />
            <line x1="43" y1="42" x2="40" y2="52" />
          </g>
        </svg>`;

      case 'storm':
        return `<svg viewBox="0 0 64 64" fill="none">
          <defs>
            <linearGradient id="stormCloud" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#64748B" />
              <stop offset="100%" stop-color="#0F172A" />
            </linearGradient>
            <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FFF500" />
              <stop offset="50%" stop-color="#FF9500" />
              <stop offset="100%" stop-color="#FF3D00" />
            </linearGradient>
            <filter id="boltGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <path d="M51 34H19a10 10 0 0 1-2-19.8 14 14 0 0 1 27.2-3.5A10 10 0 0 1 51 34z" fill="url(#stormCloud)" />
          <polygon points="35,30 25,43 33,43 27,58 43,40 35,40" fill="url(#boltGrad)" filter="url(#boltGlow)" />
        </svg>`;

      case 'fog':
        return `<svg viewBox="0 0 64 64" fill="none">
          <defs>
            <linearGradient id="fogGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="rgba(255,255,255,0.2)" />
              <stop offset="50%" stop-color="rgba(0,240,255,0.9)" />
              <stop offset="100%" stop-color="rgba(255,255,255,0.2)" />
            </linearGradient>
          </defs>
          <g stroke="url(#fogGrad)" stroke-width="3.5" stroke-linecap="round">
            <line x1="12" y1="20" x2="52" y2="20" />
            <line x1="8" y1="28" x2="56" y2="28" />
            <line x1="14" y1="36" x2="50" y2="36" />
            <line x1="18" y1="44" x2="46" y2="44" />
          </g>
        </svg>`;

      default:
        return `<svg viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="15" fill="#00F0FF" opacity="0.8" />
        </svg>`;
    }
  }

  // Update Background using 2 crossfade layers (Only crossfade if theme actually changed)
  function updateBackgroundTheme(themeClass) {
    const layerA = document.getElementById('bg-layer-a');
    const layerB = document.getElementById('bg-layer-b');
    if (!layerA || !layerB) return;

    const fullClass = 'bg-theme-' + themeClass;
    const activeLayer = layerA.classList.contains('active') ? layerA : layerB;
    if (activeLayer.classList.contains(fullClass)) {
      return; // Theme is already active, skip expensive crossfade transition
    }

    const nextLayer = activeLayer === layerA ? layerB : layerA;
    nextLayer.className = 'bg-layer ' + fullClass;

    setTimeout(() => {
      nextLayer.classList.add('active');
      activeLayer.classList.remove('active');
    }, 50);
  }

  // Render Tomorrow's Weather inside Top-Right Card
  function renderTomorrowWeather(daily) {
    const tomIconEl = document.getElementById('weather-tomorrow-icon');
    const tomDateEl = document.getElementById('weather-tomorrow-date');
    const tomTempsEl = document.getElementById('weather-tomorrow-temps');
    const tomDescEl = document.getElementById('weather-tomorrow-desc');

    if (!daily || !daily.temperature_2m_max || daily.temperature_2m_max.length < 2) return;

    const maxT = typeof daily.temperature_2m_max[1] === 'number' ? Math.round(daily.temperature_2m_max[1]) : '--';
    const minT = typeof daily.temperature_2m_min[1] === 'number' ? Math.round(daily.temperature_2m_min[1]) : '--';
    const code = (daily.weather_code && daily.weather_code[1]) || 0;
    const parsed = parseWmo(code, 1);

    if (tomIconEl) tomIconEl.innerHTML = getSvgIcon(parsed.icon);
    if (tomDescEl) tomDescEl.textContent = parsed.desc;
    if (tomTempsEl) {
      tomTempsEl.innerHTML = `
        <span class="tomorrow-max">${maxT}°C</span>
        <span class="tomorrow-sep">/</span>
        <span class="tomorrow-min">${minT}°C</span>
      `;
    }

    if (tomDateEl && daily.time && daily.time[1]) {
      const parts = daily.time[1].split('-');
      tomDateEl.textContent = `${parseInt(parts[2], 10)}/${parseInt(parts[1], 10)}`;
    }
  }

  // Active in-flight promise to avoid duplicate concurrent calls
  let activeFetchPromise = null;

  // Render minimal offline state when no data exists (Zero Fake Numbers)
  function renderOfflineNotice() {
    const tempEl = document.getElementById('weather-temp');
    const locEl = document.getElementById('weather-location');
    const descEl = document.getElementById('weather-desc');
    const iconEl = document.getElementById('weather-icon');
    const tomDescEl = document.getElementById('weather-tomorrow-desc');
    const tomTempsEl = document.getElementById('weather-tomorrow-temps');
    const tomIconEl = document.getElementById('weather-tomorrow-icon');

    const locInfo = getLocationInfo();
    if (tempEl) tempEl.textContent = '--°C';
    if (locEl) locEl.textContent = locInfo.locationName || 'Xuân Phương, Hà Nội';
    if (descEl) descEl.textContent = 'Chưa có kết nối mạng';
    if (iconEl) iconEl.innerHTML = getSvgIcon('cloud');
    if (tomDescEl) tomDescEl.textContent = 'Chưa có dữ liệu';
    if (tomTempsEl) tomTempsEl.innerHTML = '<span class="tomorrow-max">--°C</span>';
    if (tomIconEl) tomIconEl.innerHTML = getSvgIcon('cloud');
  }

  // Fetch Weather Data (With Strict 6-Hour Cache & Ledger Policy: Max 4 calls/24h)
  async function fetchWeather() {
    // 1. Try to load from valid cache (< 6 hours)
    const cached = Storage.getWeatherCache();
    if (cached) {
      console.log('Weather: Using valid cache (within 6 hours)');
      renderWeather(cached);
      return;
    }

    // 2. Strict Quota Ledger: do not attempt if < 6 hours since last attempt
    if (!Storage.isWeatherCallAllowed()) {
      console.log('Weather: Quota guard active (< 6h since last attempt). Loading stale cache...');
      const staleCache = Storage.getWeatherCache(true);
      if (staleCache) {
        renderWeather(staleCache);
      } else {
        renderOfflineNotice();
      }
      return;
    }

    // 3. Deduplicate in-flight requests
    if (activeFetchPromise) {
      return activeFetchPromise;
    }

    activeFetchPromise = (async () => {
      // Record attempt timestamp BEFORE network request
      Storage.recordWeatherAttempt();
      console.log('Weather: Cache expired or missing. Fetching fresh data from Open-Meteo...');

      try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 6000) : null;

        const apiUrl = getApiUrl();
        const response = await fetch(apiUrl, controller ? { signal: controller.signal } : {});
        if (timeoutId) clearTimeout(timeoutId);

        if (!response.ok) throw new Error('Network error: ' + response.status);
        const data = await response.json();

        if (data && data.current && data.daily) {
          Storage.setWeatherCache(data);
          renderWeather(data);
        } else {
          throw new Error('Invalid weather payload');
        }
      } catch (err) {
        console.error('Weather: Fetch failed, checking for stale cache...', err);
        // Fallback 1: Use previous cached weather data (even if older than 6 hours)
        const staleCache = Storage.getWeatherCache(true);
        if (staleCache) {
          console.log('Weather: Loaded stale cached weather data due to offline/network failure');
          renderWeather(staleCache);
          const descEl = document.getElementById('weather-desc');
          if (descEl && !descEl.textContent.includes('Cũ')) {
            descEl.textContent += ' (Dữ liệu cũ)';
          }
        } else {
          // Fallback 2: Offline notice (Zero Fake Data)
          renderOfflineNotice();
        }
      } finally {
        activeFetchPromise = null;
      }
    })();

    return activeFetchPromise;
  }

  // Render All Weather UI Components
  function renderWeather(data) {
    const cur = data.current;
    const daily = data.daily;
    if (!cur) return;

    const parsed = parseWmo(cur.weather_code, cur.is_day);

    // Update Text Elements in Today / Current Section
    const tempEl = document.getElementById('weather-temp');
    const locEl = document.getElementById('weather-location');
    const descEl = document.getElementById('weather-desc');
    const iconEl = document.getElementById('weather-icon');

    if (tempEl) tempEl.textContent = Math.round(cur.temperature_2m) + '°C';
    const locInfo = getLocationInfo();
    if (locEl) locEl.textContent = locInfo.locationName || 'Xuân Phương, Hà Nội';
    if (descEl) descEl.textContent = `${parsed.desc} • Độ ẩm ${cur.relative_humidity_2m}%`;
    if (iconEl) iconEl.innerHTML = getSvgIcon(parsed.icon);

    if (daily && daily.temperature_2m_max && daily.temperature_2m_min) {
      // Update Tomorrow Weather Section
      renderTomorrowWeather(daily);
    }

    // Update Background Theme Crossfade
    updateBackgroundTheme(parsed.theme);
  }

  function init() {
    fetchWeather();
    // Re-check every 30 minutes (Storage will check if 6 hours elapsed)
    setInterval(fetchWeather, 30 * 60 * 1000);
  }

  // Listen for dynamic location updates
  window.addEventListener('weather-location-changed', () => {
    fetchWeather();
  });

  return {
    init,
    fetchWeather,
    updateBackgroundTheme,
    getSvgIcon,
    getLocationInfo,
    parseWmo
  };
})();
