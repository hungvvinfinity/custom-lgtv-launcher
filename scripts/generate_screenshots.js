const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 8899;
const SRC_DIR = path.resolve(__dirname, '../src');
const DOCS_DIR = path.resolve(__dirname, '../docs/screenshots');

if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}

// 1. Tạo mock weather cache đầy đủ dữ liệu thực tế tại Xuân Phương, Hà Nội
const mockWeather = {
  current: {
    temperature_2m: 26,
    relative_humidity_2m: 68,
    is_day: 1,
    weather_code: 2
  },
  daily: {
    time: ['2026-11-07', '2026-11-08', '2026-11-09'],
    weather_code: [2, 1, 3],
    temperature_2m_max: [28, 29, 27],
    temperature_2m_min: [20, 21, 22]
  }
};

const mockApps = [
  { id: 'youtube.leanback.v4', title: 'YouTube' },
  { id: 'com.vtvgotv.app', title: 'VTV Go' },
  { id: 'com.fpt.fptplay', title: 'FPT Play' },
  { id: 'netflix', title: 'Netflix' },
  { id: 'vieplay.vn', title: 'VieON' },
  { id: 'com.apple.appletv', title: 'Apple TV' },
  { id: 'com.webos.app.browser', title: 'Trình duyệt Web' },
  { id: 'lg.smarttv.zmp3', title: 'Zing MP3' },
  { id: 'org.webosbrew.hbchannel', title: 'Homebrew Channel' },
  { id: 'amazon', title: 'Prime Video' },
  { id: 'lg.dotmark.vtvgiaitri', title: 'VTV Giải Trí' },
  { id: 'com.miniclip.eightballpool', title: '8 Ball Pool' },
  { id: 'com.playworks.app.pacman', title: 'PAC-MAN' },
  { id: 'neonrider', title: 'Neon Rider' },
  { id: 'com.pinkfong.babyshark-kids-world', title: 'Baby Shark' }
];

// Simple HTTP static server
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0].split('#')[0];
  if (reqPath === '/' || reqPath === '/index.html') {
    let html = fs.readFileSync(path.join(SRC_DIR, 'index.html'), 'utf8');

    // Inject preview controller script
    const injectCode = `
      <script>
        (function() {
          // Pre-populate weather & storage
          localStorage.setItem('hungvu_weather_cache', JSON.stringify({
            timestamp: Date.now(),
            data: ${JSON.stringify(mockWeather)}
          }));
          localStorage.setItem('hungvu_launcher_config', JSON.stringify({
            schemaVersion: 1,
            pinned_apps: ['youtube.leanback.v4', 'com.vtvgotv.app', 'com.fpt.fptplay', 'netflix', 'vieplay.vn']
          }));

          // Mock Luna.listApps
          if (window.Luna) {
            window.Luna.listApps = async function() {
              return ${JSON.stringify(mockApps)};
            };
          }

          window.addEventListener('load', function() {
            setTimeout(function() {
              // Trigger weather render
              if (window.Weather) {
                window.Weather.fetchWeather();
              }
              // Focus first tile
              const firstTile = document.querySelector('.home-row .app-tile');
              if (firstTile && window.Navigation) {
                window.Navigation.setFocus(firstTile);
              }

              // Check hash for view mode
              if (window.location.hash === '#drawer') {
                if (window.Drawer) {
                  window.Drawer.open();
                  setTimeout(() => {
                    const drawerTile = document.querySelector('#drawer-grid .app-tile');
                    if (drawerTile && window.Navigation) {
                      window.Navigation.setFocus(drawerTile);
                    }
                  }, 100);
                }
              }
            }, 50);
          });
        })();
      </script>
    `;
    html = html.replace('</body>', injectCode + '</body>');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  const filePath = path.join(SRC_DIR, reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);

  try {
    // 1. Chụp màn hình Home Screen
    console.log('Chụp Màn hình chính (Home Screen)...');
    execSync(
      `google-chrome --headless --disable-gpu --virtual-time-budget=3000 --window-size=1920,1080 --screenshot="${path.join(DOCS_DIR, 'home-screen.png')}" "http://localhost:${PORT}/index.html#home"`,
      { stdio: 'inherit' }
    );

    // 2. Chụp màn hình Drawer All Apps
    console.log('Chụp Màn hình Tất cả ứng dụng (App Drawer)...');
    execSync(
      `google-chrome --headless --disable-gpu --virtual-time-budget=3000 --window-size=1920,1080 --screenshot="${path.join(DOCS_DIR, 'app-drawer.png')}" "http://localhost:${PORT}/index.html#drawer"`,
      { stdio: 'inherit' }
    );

    console.log('Screenshots generated successfully!');
  } catch (err) {
    console.error('Error taking screenshots:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});
