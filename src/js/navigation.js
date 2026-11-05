/**
 * Navigation Module - Spatial Navigation (D-pad Matrix & Magic Remote Pointer)
 * Handles KeyDown, KeyUp, Long-Press (800ms) for Pin/Unpin, and Back (461)
 */
const Navigation = (function () {
  let activeElement = null;
  let enterKeyDownTime = 0;
  let enterKeyTimer = null;
  let isLongPressTriggered = false;

  // Key codes for webOS & standard browsers
  const KEYS = {
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    ENTER: 13,
    BACK_WEBOS: 461,
    BACK_ESC: 27,
    RED: 403,
    GREEN: 404,
    YELLOW: 405,
    BLUE: 406
  };

  function setFocus(el) {
    if (!el) return;
    if (activeElement && activeElement !== el) {
      activeElement.classList.remove('focused');
    }
    activeElement = el;
    activeElement.classList.add('focused');
    activeElement.focus();

    // Ensure focused tile is visible inside its container
    activeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest'
    });
  }

  function handleDpad(e) {
    const isDrawerOpen = Drawer.isOpen();
    const current = document.activeElement;

    // 1. Back Key (461 / 27)
    if (e.keyCode === KEYS.BACK_WEBOS || e.keyCode === KEYS.BACK_ESC) {
      e.preventDefault();
      e.stopPropagation();
      if (isDrawerOpen) {
        Drawer.close();
      }
      return;
    }

    // 2. Color Keys (Yellow/Blue/Green) -> Toggle Pin
    if (e.keyCode === KEYS.YELLOW || e.keyCode === KEYS.BLUE || e.keyCode === KEYS.GREEN) {
      if (isDrawerOpen && current && current.classList.contains('drawer-tile')) {
        const appId = current.getAttribute('data-app-id');
        if (appId) {
          e.preventDefault();
          Drawer.togglePinAndSync(appId);
        }
      }
      return;
    }

    // 3. Arrow Keys Navigation
    if ([KEYS.LEFT, KEYS.RIGHT, KEYS.UP, KEYS.DOWN].includes(e.keyCode)) {
      e.preventDefault();

      if (!isDrawerOpen) {
        // Navigating Home Row (Horizontal)
        navigateHomeRow(e.keyCode);
      } else {
        // Navigating Drawer Grid (6 Columns)
        navigateDrawerGrid(e.keyCode);
      }
      return;
    }

    // 4. Enter Key Down -> Start Long-press Timer
    if (e.keyCode === KEYS.ENTER) {
      e.preventDefault();
      if (enterKeyDownTime === 0) {
        enterKeyDownTime = Date.now();
        isLongPressTriggered = false;

        // Start 800ms timer for Long-Press Pin/Unpin
        enterKeyTimer = setTimeout(() => {
          if (isDrawerOpen && current && current.classList.contains('drawer-tile')) {
            const appId = current.getAttribute('data-app-id');
            if (appId) {
              isLongPressTriggered = true;
              console.log('Navigation: Long-press 800ms detected! Toggling pin for:', appId);
              Drawer.togglePinAndSync(appId);
            }
          }
        }, 800);
      }
    }
  }

  function handleKeyUp(e) {
    if (e.keyCode === KEYS.ENTER) {
      // Clear long-press timer
      if (enterKeyTimer) {
        clearTimeout(enterKeyTimer);
        enterKeyTimer = null;
      }

      const pressDuration = Date.now() - enterKeyDownTime;
      enterKeyDownTime = 0;

      // If long press was already handled, do not launch
      if (isLongPressTriggered) {
        isLongPressTriggered = false;
        return;
      }

      // Short press (< 400ms): Activate target
      const current = document.activeElement;
      if (current) {
        activateTile(current);
      }
    }
  }

  // Activate tile on Click / Short Enter
  function activateTile(el) {
    // 1. Drawer Trigger Tile
    if (el.classList.contains('drawer-trigger')) {
      Drawer.toggle();
      return;
    }

    // 2. Drawer Close Button
    if (el.id === 'drawer-close-btn') {
      Drawer.close();
      return;
    }

    // 3. Regular App Tile -> Launch via Luna
    const appId = el.getAttribute('data-app-id');
    if (appId) {
      console.log('Navigation: Launching app:', appId);
      Luna.launchApp(appId);
    }
  }

  // Navigate Home Row (Horizontal)
  function navigateHomeRow(keyCode) {
    const tiles = Array.from(document.querySelectorAll('.home-row .app-tile'));
    if (tiles.length === 0) return;

    let currentIndex = tiles.indexOf(document.activeElement);
    if (currentIndex === -1) currentIndex = 0;

    if (keyCode === KEYS.LEFT) {
      const nextIndex = Math.max(0, currentIndex - 1);
      setFocus(tiles[nextIndex]);
    } else if (keyCode === KEYS.RIGHT) {
      const nextIndex = Math.min(tiles.length - 1, currentIndex + 1);
      setFocus(tiles[nextIndex]);
    }
  }

  // Navigate Drawer Grid (5 Columns matching CSS repeat(5, 1fr))
  function navigateDrawerGrid(keyCode) {
    const tiles = Array.from(document.querySelectorAll('#drawer-grid .app-tile'));
    if (tiles.length === 0) return;

    const COLS = 5;
    let currentIndex = tiles.indexOf(document.activeElement);

    // If focus was on close button
    const closeBtn = document.getElementById('drawer-close-btn');
    if (document.activeElement === closeBtn) {
      if (keyCode === KEYS.DOWN) {
        setFocus(tiles[0]);
      }
      return;
    }

    if (currentIndex === -1) currentIndex = 0;

    if (keyCode === KEYS.LEFT) {
      if (currentIndex % COLS > 0) {
        setFocus(tiles[currentIndex - 1]);
      }
    } else if (keyCode === KEYS.RIGHT) {
      if (currentIndex % COLS < COLS - 1 && currentIndex + 1 < tiles.length) {
        setFocus(tiles[currentIndex + 1]);
      }
    } else if (keyCode === KEYS.UP) {
      if (currentIndex >= COLS) {
        setFocus(tiles[currentIndex - COLS]);
      } else {
        // Move to close button at top
        if (closeBtn) setFocus(closeBtn);
      }
    } else if (keyCode === KEYS.DOWN) {
      if (currentIndex + COLS < tiles.length) {
        setFocus(tiles[currentIndex + COLS]);
      } else if (currentIndex < tiles.length - 1) {
        // Last row partial column -> focus last tile
        setFocus(tiles[tiles.length - 1]);
      }
    }
  }

  // Setup pointer (Magic Remote Air Mouse) listeners
  function setupPointerEvents() {
    document.addEventListener('mouseover', (e) => {
      const tile = e.target.closest('.app-tile, #drawer-close-btn');
      if (tile && tile !== activeElement) {
        setFocus(tile);
      }
    });

    document.addEventListener('click', (e) => {
      const tile = e.target.closest('.app-tile, #drawer-close-btn');
      if (tile) {
        activateTile(tile);
      }
    });
  }

  function init() {
    window.addEventListener('keydown', handleDpad);
    window.addEventListener('keyup', handleKeyUp);
    setupPointerEvents();

    // Default focus to the first app on Home row
    setTimeout(() => {
      const firstTile = document.querySelector('.home-row .app-tile');
      if (firstTile) {
        setFocus(firstTile);
      }
    }, 200);
  }

  return {
    init,
    setFocus
  };
})();
