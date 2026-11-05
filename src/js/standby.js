/**
 * Standby Module - Inactivity Tracker, OLED Burn-in Protection & Auto Power Off
 * Chromium 79 / webOS 6.5 Compatible
 * Strictly NO 'inset: 0' (use top: 0; left: 0; right: 0; bottom: 0;)
 * Strictly NO ':has()' selector
 */
const Standby = (function () {
  // Configuration Times in Milliseconds
  let INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes -> Standby
  let POWER_OFF_TIMEOUT = 5 * 60 * 1000;   // 5 minutes in Standby -> Power Off
  const BURN_IN_INTERVAL = 60 * 1000;      // 60 seconds -> Drift Burn-in shift

  const DAYS_VI = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

  // State
  let isStandbyActive = false;
  let justWokeUp = false;
  let standbyTimer = null;
  let powerOffTimer = null;
  let burnInTimer = null;
  let clockIntervalId = null;
  let lastActivityTime = Date.now();
  let lastPointerX = -1;
  let lastPointerY = -1;
  let currentDriftX = 0;
  let currentDriftY = 0;

  // DOM Elements
  let screenEl = null;
  let driftEl = null;
  let hourEl = null;
  let minEl = null;
  let colonEl = null;
  let dateEl = null;
  let hintEl = null;

  function pad(num) {
    return num < 10 ? '0' + num : '' + num;
  }

  // Update Standby Minimalist Clock & Vietnamese Date
  function updateClock() {
    const now = new Date();
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());

    if (hourEl) hourEl.textContent = hours;
    if (minEl) minEl.textContent = minutes;

    if (dateEl) {
      const dayName = DAYS_VI[now.getDay()];
      const date = pad(now.getDate());
      const month = pad(now.getMonth() + 1);
      const year = now.getFullYear();
      dateEl.textContent = `${dayName}, ${date} tháng ${month}, ${year}`;
    }
  }

  // OLED / NanoCell Burn-In Protection: Drift smoothly every 60s
  function applyBurnInDrift() {
    if (!driftEl) return;

    const MAX_X = 65; // px horizontal range
    const MAX_Y = 40; // px vertical range
    const MIN_DELTA = 18;

    let newX = 0;
    let newY = 0;
    let attempts = 0;

    // Pick new coordinates that differ by at least MIN_DELTA from current position
    do {
      newX = Math.round((Math.random() * 2 - 1) * MAX_X);
      newY = Math.round((Math.random() * 2 - 1) * MAX_Y);
      attempts++;
    } while (
      attempts < 12 &&
      Math.abs(newX - currentDriftX) < MIN_DELTA &&
      Math.abs(newY - currentDriftY) < MIN_DELTA
    );

    currentDriftX = newX;
    currentDriftY = newY;

    // Subtle opacity modulation (0.86 - 0.98) to relax OLED phosphor subpixels
    const subtleOpacity = (0.86 + Math.random() * 0.12).toFixed(2);

    driftEl.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
    driftEl.style.opacity = subtleOpacity;

    // Slight shift for bottom hint as well
    if (hintEl) {
      const hintShiftX = Math.round((Math.random() * 2 - 1) * 25);
      hintEl.style.transform = `translate3d(${hintShiftX}px, 0, 0)`;
    }

    console.log(`Standby: Burn-in protection drift applied -> offset(${newX}px, ${newY}px), opacity(${subtleOpacity})`);
  }

  // Trigger Standby Screen (Manual or Automatic after 15 min)
  function triggerStandby() {
    if (isStandbyActive) return;

    console.log('Standby: Activating Standby Screen (15 min inactivity reached).');
    isStandbyActive = true;

    // Clear standby trigger timer
    if (standbyTimer) {
      clearTimeout(standbyTimer);
      standbyTimer = null;
    }

    if (!screenEl) cacheElements();

    if (screenEl) {
      screenEl.classList.remove('waking');
      screenEl.classList.add('active');
      screenEl.setAttribute('aria-hidden', 'false');
    }

    // Refresh clock instantly
    updateClock();

    // Start clock tick timer while in standby (every 1s)
    if (clockIntervalId) clearInterval(clockIntervalId);
    clockIntervalId = setInterval(updateClock, 1000);

    // Initial drift centered, then drift every 60 seconds
    if (driftEl) {
      driftEl.style.transform = 'translate3d(0, 0, 0)';
      driftEl.style.opacity = '1';
    }
    currentDriftX = 0;
    currentDriftY = 0;

    if (burnInTimer) clearInterval(burnInTimer);
    burnInTimer = setInterval(applyBurnInDrift, BURN_IN_INTERVAL);

    // Start 5-minute Auto Power Off countdown
    if (powerOffTimer) clearTimeout(powerOffTimer);
    powerOffTimer = setTimeout(triggerPowerOff, POWER_OFF_TIMEOUT);
    console.log(`Standby: Auto Power Off scheduled in ${POWER_OFF_TIMEOUT / 1000 / 60} minutes.`);
  }

  // Auto Power Off TV via webOS Luna Service
  async function triggerPowerOff() {
    console.log('Standby: [POWER OFF] Standby period expired (5 min). Calling webOS powerOff service...');

    // Clear all running timers
    clearAllTimers();

    // 1. Primary Luna Call: luna://com.webos.service.tvpower/power/powerOff with {"reason":"autoOff"}
    try {
      if (typeof Luna !== 'undefined' && typeof Luna.call === 'function') {
        const res = await Luna.call('luna://com.webos.service.tvpower/power/powerOff', { reason: 'autoOff' });
        if (res && res.returnValue) {
          console.log('Standby: Luna powerOff successful (reason: autoOff).', res);
          return true;
        }

        // Fallback reason 'offTimer'
        console.warn('Standby: autoOff returned false, trying fallback offTimer...', res);
        const resFallback = await Luna.call('luna://com.webos.service.tvpower/power/powerOff', { reason: 'offTimer' });
        if (resFallback && resFallback.returnValue) {
          console.log('Standby: Luna powerOff successful (reason: offTimer).', resFallback);
          return true;
        }
      }
    } catch (e) {
      console.error('Standby: Luna.call powerOff error:', e);
    }

    // 2. Fallback via elevated root hbchannel exec if direct Luna call was blocked
    try {
      if (typeof Luna !== 'undefined' && typeof Luna.exec === 'function') {
        console.log('Standby: Attempting root luna-send powerOff...');
        const out = await Luna.exec("luna-send -n 1 luna://com.webos.service.tvpower/power/powerOff '{\"reason\":\"autoOff\"}'");
        console.log('Standby: Root luna-send powerOff response:', out);
        return true;
      }
    } catch (execErr) {
      console.error('Standby: Root luna-send powerOff failed:', execErr);
    }

    return false;
  }

  // Wake Up TV & Dismiss Standby Screen
  function wakeUp(e) {
    if (!isStandbyActive) return;

    console.log('Standby: Waking up TV! User activity detected.');
    isStandbyActive = false;
    justWokeUp = true;

    // Suppress following keyup / click events for 350ms to prevent accidental app launch
    setTimeout(() => {
      justWokeUp = false;
    }, 350);

    // Stop standby intervals & power off timer
    if (powerOffTimer) {
      clearTimeout(powerOffTimer);
      powerOffTimer = null;
    }
    if (burnInTimer) {
      clearInterval(burnInTimer);
      burnInTimer = null;
    }
    if (clockIntervalId) {
      clearInterval(clockIntervalId);
      clockIntervalId = null;
    }

    // Fast snappy dismissal animation (< 180ms)
    if (screenEl) {
      screenEl.classList.add('waking');
      screenEl.classList.remove('active');
      screenEl.setAttribute('aria-hidden', 'true');

      setTimeout(() => {
        if (!isStandbyActive && screenEl) {
          screenEl.classList.remove('waking');
        }
      }, 200);
    }

    // Reset drift transform
    if (driftEl) {
      driftEl.style.transform = 'translate3d(0, 0, 0)';
      driftEl.style.opacity = '1';
    }
    if (hintEl) {
      hintEl.style.transform = 'translate3d(0, 0, 0)';
    }
    currentDriftX = 0;
    currentDriftY = 0;

    // Restart the 15-minute inactivity timer
    resetInactivityTimer();
  }

  // Reset the 15-minute Inactivity Timer
  function resetInactivityTimer() {
    if (standbyTimer) {
      clearTimeout(standbyTimer);
      standbyTimer = null;
    }

    // Only set inactivity timer if not already in standby
    if (!isStandbyActive) {
      standbyTimer = setTimeout(triggerStandby, INACTIVITY_TIMEOUT);
    }
  }

  function clearAllTimers() {
    if (standbyTimer) {
      clearTimeout(standbyTimer);
      standbyTimer = null;
    }
    if (powerOffTimer) {
      clearTimeout(powerOffTimer);
      powerOffTimer = null;
    }
    if (burnInTimer) {
      clearInterval(burnInTimer);
      burnInTimer = null;
    }
    if (clockIntervalId) {
      clearInterval(clockIntervalId);
      clockIntervalId = null;
    }
  }

  // Universal User Interaction Handler
  function handleActivity(e) {
    if (isStandbyActive) {
      // Consume event immediately so waking up doesn't trigger clicks or unwanted actions
      if (e) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      }
      wakeUp(e);
      return;
    }

    // If in normal mode, throttle timer resets to at most once per 1 second
    const now = Date.now();
    if (now - lastActivityTime < 1000) return;
    lastActivityTime = now;
    resetInactivityTimer();
  }

  // Remote D-pad & Keys Handler
  function handleKeyDown(e) {
    if (isStandbyActive) {
      // Intercept any remote key (D-pad, OK, Back, Volume, Numbers, Color...)
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      wakeUp(e);
      return;
    }

    resetInactivityTimer();
  }

  function handleKeyUp(e) {
    if (justWokeUp) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }
    resetInactivityTimer();
  }

  // Magic Remote Air Mouse / Pointer Movement Handler
  function handleMouseMove(e) {
    if (lastPointerX === -1) {
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      return;
    }

    const dx = Math.abs(e.clientX - lastPointerX);
    const dy = Math.abs(e.clientY - lastPointerY);

    // Filter out gyro micro-jitter (< 5px) when remote is resting on a surface
    if (dx < 5 && dy < 5) return;

    lastPointerX = e.clientX;
    lastPointerY = e.clientY;

    handleActivity(e);
  }

  function handleClick(e) {
    if (isStandbyActive || justWokeUp) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      if (isStandbyActive) wakeUp(e);
      return;
    }
    resetInactivityTimer();
  }

  function cacheElements() {
    screenEl = document.getElementById('standby-screen');
    driftEl = document.getElementById('standby-drift-container');
    hourEl = document.getElementById('standby-hour');
    minEl = document.getElementById('standby-min');
    colonEl = document.getElementById('standby-colon');
    dateEl = document.getElementById('standby-date');
    hintEl = document.querySelector('.standby-hint');
  }

  // Setup Event Listeners
  function setupListeners() {
    // Capture phase (useCapture: true) ensures we intercept events before any child element
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('mousemove', handleMouseMove, true);
    window.addEventListener('mousedown', handleClick, true);
    window.addEventListener('click', handleClick, true);
    window.addEventListener('wheel', handleActivity, true);
    window.addEventListener('touchstart', handleActivity, true);
  }

  // Initialize Standby Module
  function init() {
    console.log('Standby: Initializing Standby Screen & Inactivity Tracking...');
    cacheElements();
    setupListeners();
    resetInactivityTimer();
  }

  // Expose API for external consumption & DevTools testing
  const api = {
    init,
    triggerStandby,
    triggerPowerOff,
    wakeUp,
    resetTimer: resetInactivityTimer,
    isActive: () => isStandbyActive,
    triggerBurnInDrift: applyBurnInDrift,
    // Debug helper to set shorter timeouts for testing (e.g. Standby.setTimeouts(5000, 3000))
    setTimeouts: (standbyMs, powerOffMs) => {
      INACTIVITY_TIMEOUT = standbyMs;
      POWER_OFF_TIMEOUT = powerOffMs;
      console.log(`Standby: Custom timeouts configured: Standby in ${standbyMs}ms, PowerOff in ${powerOffMs}ms.`);
      resetInactivityTimer();
    }
  };

  // Expose to window for DevTools access
  window.Standby = api;
  window.triggerStandby = triggerStandby;
  window.triggerPowerOff = triggerPowerOff;

  return api;
})();
