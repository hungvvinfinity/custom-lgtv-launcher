const { execSync } = require('child_process');

try {
  const raw = execSync('luna-send -n 1 -f luna://com.webos.applicationManager/listApps {}', { timeout: 4000 });
  const res = JSON.parse(raw);
  const apps = (res.apps || [])
    .filter(a => a.visible !== false && a.id !== 'vn.hungvu.tvlauncher')
    .map(a => ({
      id: a.id,
      title: a.title || a.id,
      icon: a.largeIcon || a.icon || '',
      folderPath: a.folderPath || ''
    }));
  console.log(JSON.stringify(apps));
} catch (e) {
  console.log('[]');
}
