#!/usr/bin/env bash
# ==============================================================================
# Deploy Script for Custom TV Launcher (vn.hungvu.tvlauncher)
# Deploys code to LG webOS TV (192.168.1.139:22) via SSH root
# ==============================================================================
set -e

TV_IP="${TV_IP:-192.168.1.139}"
TV_PORT="${TV_PORT:-22}"
SSH_KEY="${SSH_KEY:-${HOME}/.ssh/id_ed25519}"
APP_ID="vn.hungvu.tvlauncher"
TARGET_DIR="/media/developer/apps/usr/palm/applications/${APP_ID}"

echo "================================================================="
echo "==> [1/5] Kiểm tra kết nối SSH root tới TV ${TV_IP}:${TV_PORT}..."
echo "================================================================="
ssh -p "$TV_PORT" -i "$SSH_KEY" -o StrictHostKeyChecking=no root@"$TV_IP" "id"

echo "================================================================="
echo "==> [2/5] Thiết lập phân quyền Luna Service (LS2 Hub Permissions)..."
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
echo "==> [3/5] Đồng bộ mã nguồn ứng dụng lên TV (${TARGET_DIR})..."
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
ssh -p "$TV_PORT" -i "$SSH_KEY" -o StrictHostKeyChecking=no root@"$TV_IP" "chmod -R 755 ${TARGET_DIR}"

echo "================================================================="
echo "==> [4/5] Đóng phiên bản launcher cũ (nếu có)..."
echo "================================================================="
ssh -p "$TV_PORT" -i "$SSH_KEY" -o StrictHostKeyChecking=no root@"$TV_IP" \
  "luna-send -n 1 luna://com.webos.applicationManager/closeByAppId '{\"id\":\"${APP_ID}\"}' 2>/dev/null || true"

echo "================================================================="
echo "==> [5/6] Khởi chạy ứng dụng mới với keepAlive: true..."
echo "================================================================="
LAUNCH_RESP=$(ssh -p "$TV_PORT" -i "$SSH_KEY" -o StrictHostKeyChecking=no root@"$TV_IP" \
  "luna-send -n 1 luna://com.webos.applicationManager/launch '{\"id\":\"${APP_ID}\",\"keepAlive\":true}'")
echo "$LAUNCH_RESP"

echo "================================================================="
echo "==> [6/6] Cấu hình Autostart on Boot và Phím Home..."
echo "================================================================="
ssh -p "$TV_PORT" -i "$SSH_KEY" -o StrictHostKeyChecking=no root@"$TV_IP" "
  mkdir -p /var/lib/webosbrew/init.d /home/root/.config/lginputhook
  cat << 'EOF' > /var/lib/webosbrew/init.d/50-autostart-launcher.sh
#!/bin/sh
(
  sleep 5
  luna-send -n 1 luna://com.webos.applicationManager/launch '{\"id\":\"${APP_ID}\",\"keepAlive\":true}'
) &
EOF
  chmod 755 /var/lib/webosbrew/init.d/50-autostart-launcher.sh
  ln -sf 50-autostart-launcher.sh /var/lib/webosbrew/init.d/50-autostart-launcher

  cat << 'EOF' > /home/root/.config/lginputhook/keybinds.json
{\"773\":{\"action\":\"launch\",\"id\":\"${APP_ID}\"},\"774\":{\"action\":\"launch\",\"id\":\"${APP_ID}\"},\"125\":{\"action\":\"launch\",\"id\":\"${APP_ID}\"}}
EOF
  [ -f /media/developer/launcher-homekey/homehook.sh ] && sed -i 's/LAUNCHER_ID=\".*\"/LAUNCHER_ID=\"${APP_ID}\"/g' /media/developer/launcher-homekey/homehook.sh || true
  [ -f /media/developer/launcher-homehook/apply.sh ] && sed -i 's/tld.my.customlauncher/${APP_ID}/g' /media/developer/launcher-homehook/apply.sh || true
  [ -f /media/developer/launcher-homehook/watch.sh ] && sed -i 's/tld.my.customlauncher/${APP_ID}/g' /media/developer/launcher-homehook/watch.sh || true
"

echo "================================================================="
echo "==> TRIỂN KHAI THÀNH CÔNG! Launcher vn.hungvu.tvlauncher đã hoạt động."
echo "================================================================="
