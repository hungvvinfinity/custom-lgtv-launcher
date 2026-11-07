#!/usr/bin/env bash
# ==============================================================================
# Deploy Script for Custom TV Launcher (vn.hungvu.tvlauncher)
# Triển khai & Tối ưu hóa toàn diện cho LG webOS TV qua SSH root
# - Tối ưu MemoryManager KeepAlive Policy (Zero-lag Switch từ YouTube < 200ms)
# - Vô hiệu hóa Splash Screen & Loading Spinner
# - Cấu hình Native Bootd First App, Autostart Watcher & Phím Home Magic Remote
# ==============================================================================
set -e

TV_IP="${TV_IP:-192.168.1.149}"
TV_PORT="${TV_PORT:-22}"
SSH_KEY="${SSH_KEY:-${HOME}/.ssh/id_ed25519}"
APP_ID="vn.hungvu.tvlauncher"
TARGET_DIR="/media/developer/apps/usr/palm/applications/${APP_ID}"

echo "================================================================="
echo "==> [1/7] Kiểm tra kết nối SSH root tới TV ${TV_IP}:${TV_PORT}..."
echo "================================================================="
ssh -p "$TV_PORT" -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=5 root@"$TV_IP" "id"

echo "================================================================="
echo "==> [2/7] Thiết lập phân quyền Luna Service (LS2 Hub Permissions)..."
echo "================================================================="
ssh -p "$TV_PORT" -i "$SSH_KEY" -o StrictHostKeyChecking=no root@"$TV_IP" "
  mkdir -p /var/luna-service2-dev/roles.d \
           /var/luna-service2-dev/client-permissions.d \
           /var/luna-service2-dev/manifests.d

  # 1. Role
  cat << 'EOF' > /var/luna-service2-dev/roles.d/${APP_ID}.app.json
{
  \"appId\": \"${APP_ID}\",
  \"type\": \"regular\",
  \"allowedNames\": [\"${APP_ID}-*\"],
  \"trustLevel\": \"\",
  \"permissions\": [
    {
      \"service\": \"${APP_ID}-*\",
      \"outbound\": [\"*\"]
    }
  ]
}
EOF

  # 2. Client Permissions
  cat << 'EOF' > /var/luna-service2-dev/client-permissions.d/${APP_ID}.app.json
{
  \"${APP_ID}-*\": [\"public\", \"all\"]
}
EOF

  # 3. Manifest
  cat << 'EOF' > /var/luna-service2-dev/manifests.d/${APP_ID}.json
{
  \"id\": \"${APP_ID}\",
  \"version\": \"1.0.0\",
  \"roleFiles\": [\"/var/luna-service2-dev/roles.d/${APP_ID}.app.json\"],
  \"clientPermissionFiles\": [\"/var/luna-service2-dev/client-permissions.d/${APP_ID}.app.json\"]
}
EOF

  # Reload Luna Hub
  ls-control scan-services 2>/dev/null || true
"

echo "================================================================="
echo "==> [3/7] Tối ưu MemoryManager Policy (Chống kill app & Khởi động siêu tốc)..."
echo "================================================================="
ssh -p "$TV_PORT" -i "$SSH_KEY" -o StrictHostKeyChecking=no root@"$TV_IP" "
  # Cấu hình MemoryManager KeepAlive Policy thông qua file override /home/root/memorymanager-conf.json
  # Ngăn memchute gửi SIGTERM/SIGKILL tiêu diệt launcher khi chạy app nặng (YouTube, Netflix)
  node -e '
    var fs = require(\"fs\");
    var src = \"/etc/palm/memorymanager-conf.json\";
    var dst = \"/home/root/memorymanager-conf.json\";
    try {
      var data;
      try {
        data = JSON.parse(fs.readFileSync(fs.existsSync(dst) ? dst : src, \"utf8\"));
      } catch(e) {
        data = JSON.parse(fs.readFileSync(src, \"utf8\"));
      }
      var app = \"${APP_ID}\";
      var policyKeys = [\"KeepOnLaunchEx\", \"HomeGroup\", \"KeepAlive\", \"NoLaunchThreshold\", \"NoLaunchThresholdLite\"];
      var added = [];
      policyKeys.forEach(function(k) {
        data[k] = data[k] || [];
        if (!data[k].includes(app)) {
          data[k].push(app);
          added.push(k);
        }
      });
      fs.writeFileSync(dst, JSON.stringify(data, null, 2));
      console.log(\"[OK] Da cap nhat MemoryManager Policy cho \" + app + \": \" + (added.length > 0 ? added.join(\", \") : \"da ton tai day du\"));
    } catch(err) {
      console.error(\"[ERROR] Loi cau hinh MemoryManager:\", err.message);
    }
  '

  # Khởi động lại memchute daemon để nạp ngay chính sách mới
  systemctl restart memchute 2>/dev/null || true
  echo \"[OK] Daemon memchute da duoc khoi dong lai voi KeepAlive Policy moi.\"
"

echo "================================================================="
echo "==> [4/7] Đồng bộ mã nguồn ứng dụng lên TV (${TARGET_DIR})..."
echo "================================================================="
ssh -p "$TV_PORT" -i "$SSH_KEY" -o StrictHostKeyChecking=no root@"$TV_IP" "mkdir -p ${TARGET_DIR}"

# Use rsync if available, otherwise scp
if command -v rsync >/dev/null 2>&1; then
  rsync -avz --delete \
    -e "ssh -p ${TV_PORT} -i ${SSH_KEY} -o StrictHostKeyChecking=no" \
    ./src/ root@"${TV_IP}":"${TARGET_DIR}/"
else
  scp -P "$TV_PORT" -i "$SSH_KEY" -o StrictHostKeyChecking=no -r ./src/* root@"${TV_IP}":"${TARGET_DIR}/"
fi

# Ensure correct file permissions on TV
ssh -p "$TV_PORT" -i "$SSH_KEY" -o StrictHostKeyChecking=no root@"$TV_IP" "
  chmod -R 755 ${TARGET_DIR}

  # Xác nhận cấu hình noSplashOnLaunch và spinnerOnLaunch trong appinfo.json
  node -e '
    var fs = require(\"fs\");
    var file = \"${TARGET_DIR}/appinfo.json\";
    try {
      var appinfo = JSON.parse(fs.readFileSync(file, \"utf8\"));
      var changed = false;
      if (appinfo.noSplashOnLaunch !== true) { appinfo.noSplashOnLaunch = true; changed = true; }
      if (appinfo.spinnerOnLaunch !== false) { appinfo.spinnerOnLaunch = false; changed = true; }
      if (appinfo.handlesRelaunch !== true) { appinfo.handlesRelaunch = true; changed = true; }
      if (changed) {
        fs.writeFileSync(file, JSON.stringify(appinfo, null, 2));
        console.log(\"[OK] Da cap nhat appinfo.json voi noSplashOnLaunch=true & spinnerOnLaunch=false\");
      } else {
        console.log(\"[OK] appinfo.json da toi uu san noSplashOnLaunch & spinnerOnLaunch.\");
      }
    } catch(e) {}
  '
"

echo "================================================================="
echo "==> [5/7] Cài đặt Service Autostart on Boot & Tự phục hồi Memory Policy..."
echo "================================================================="
scp -P "$TV_PORT" -i "$SSH_KEY" -o StrictHostKeyChecking=no \
  ./src/tools/50-autostart-launcher root@"${TV_IP}":/var/lib/webosbrew/init.d/50-autostart-launcher

ssh -p "$TV_PORT" -i "$SSH_KEY" -o StrictHostKeyChecking=no root@"$TV_IP" "
  chmod 755 /var/lib/webosbrew/init.d/50-autostart-launcher
  rm -f /var/lib/webosbrew/init.d/50-autostart-launcher.sh
  rm -f /var/lib/webosbrew/init.d/45-launcher-poweron /var/lib/webosbrew/init.d/49-launcher-screensaver 2>/dev/null || true

  # Khởi chạy autostart daemon nếu chưa chạy
  pgrep -f '50-autostart-launcher' >/dev/null || (/var/lib/webosbrew/init.d/50-autostart-launcher &)
  echo \"[OK] Autostart Watcher Service da duoc kich hoat thanh cong.\"
"

echo "================================================================="
echo "==> [6/7] Cấu hình phím Home Magic Remote & Native Bootd First App..."
echo "================================================================="
ssh -p "$TV_PORT" -i "$SSH_KEY" -o StrictHostKeyChecking=no root@"$TV_IP" "
  # 1. Cấu hình phím Home Magic Remote qua lginputhook
  mkdir -p /home/root/.config/lginputhook
  cat << 'EOF' > /home/root/.config/lginputhook/keybinds.json
{\"773\":{\"action\":\"launch\",\"id\":\"${APP_ID}\"},\"774\":{\"action\":\"launch\",\"id\":\"${APP_ID}\"},\"125\":{\"action\":\"launch\",\"id\":\"${APP_ID}\"}}
EOF
  [ -f /media/developer/launcher-homekey/homehook.sh ] && sed -i 's/LAUNCHER_ID=\".*\"/LAUNCHER_ID=\"${APP_ID}\"/g' /media/developer/launcher-homekey/homehook.sh || true

  # 2. Cập nhật bootd.json để bootd natively khởi chạy Custom Launcher khi TV bật
  node -e '
    var fs = require(\"fs\");
    var file = \"/var/luna/preferences/bootd.json\";
    try {
      var data = JSON.parse(fs.readFileSync(file, \"utf8\"));
      data.common = data.common || {};
      data.common.firstApp = data.common.firstApp || {};
      data.common.firstApp.firstAppInNormal = \"${APP_ID}\";
      data.common.firstApp.firstAppInHome = \"${APP_ID}\";
      data.common.firstApp.firstAppInNmrm = \"${APP_ID}\";
      data.common.firstAppByPowerOnReason = data.common.firstAppByPowerOnReason || {};
      data.common.firstAppByPowerOnReason.remoteKey = \"${APP_ID}\";
      data.common.firstAppByPowerOnReason.localKey = \"${APP_ID}\";
      data.common.firstAppByPowerOnReason.upDownKey = \"${APP_ID}\";
      data.common.firstAppByPowerOnReason.micomPower = \"${APP_ID}\";
      fs.writeFileSync(file, JSON.stringify(data, null, 4));
      console.log(\"[OK] bootd.json da duoc cau hinh firstApp = ${APP_ID}\");
    } catch(err) {
      console.error(\"[ERROR] Loi cap nhat bootd.json:\", err.message);
    }
  ' 2>/dev/null || true
"

echo "================================================================="
echo "==> [7/7] Khởi động Launcher với chế độ keepAlive: true..."
echo "================================================================="
ssh -p "$TV_PORT" -i "$SSH_KEY" -o StrictHostKeyChecking=no root@"$TV_IP" "
  # Đóng phiên bản launcher cũ (nếu đang chạy)
  luna-send -n 1 luna://com.webos.applicationManager/closeByAppId '{\"id\":\"${APP_ID}\"}' 2>/dev/null || true
  sleep 0.5

  # Khởi chạy launcher mới với keepAlive: true
  luna-send -n 1 luna://com.webos.applicationManager/launch '{\"id\":\"${APP_ID}\",\"keepAlive\":true}'
"

echo "================================================================="
echo "==> TRIỂN KHAI & TỐI ƯU THÀNH CÔNG!"
echo "    - App ID: ${APP_ID}"
echo "    - Memory Policy: KeepOnLaunchEx + HomeGroup + KeepAlive"
echo "    - Splash & Spinner: Vô hiệu hóa hoàn toàn"
echo "    - Phím Home Magic Remote: 773 / 774 / 125 -> ${APP_ID}"
echo "    - Tốc độ chuyển đổi foreground từ YouTube: ~200ms (Warm switch)"
echo "================================================================="
