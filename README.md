# 🚀 Custom TV Launcher for LG webOS

<p align="center">
  <img src="docs/screenshots/home-clear-day.png" alt="Custom TV Launcher - Ngày Nắng" width="900" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" />
</p>

<p align="center">
  <b>Trình khởi chạy (Launcher) siêu nhẹ, tinh gọn, không quảng cáo và phản hồi tức thì (< 241ms) dành riêng cho Smart TV LG webOS.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-LG%20webOS%20(Root)-red?logo=lg" alt="Platform" />
  <img src="https://img.shields.io/badge/Resolution-1920x1080%20Full%20HD-blue" alt="Resolution" />
  <img src="https://img.shields.io/badge/Memory-RAM%20%3C%2012MB-success" alt="Memory" />
  <img src="https://img.shields.io/badge/Switch%20Latency-%E2%89%A4%20241ms-brightgreen" alt="Switch Latency" />
  <img src="https://img.shields.io/badge/Stack-Vanilla%20JS%20%7C%20CSS3%20%7C%20HTML5-orange" alt="Tech Stack" />
</p>

---

## 📖 Mục lục
- [Giới thiệu](#-giới-thiệu)
- [Bộ sưu tập giao diện (Screenshots)](#-bộ-sưu-tập-giao-diện-screenshots)
- [Tính năng nổi bật](#-tính-năng-nổi-bật)
- [Tùy biến Vị trí & Ứng dụng mặc định](#-tùy-biến-vị-trí--ứng-dụng-mặc-định)
- [Chứng minh hiệu năng: Siêu tốc 241ms](#-chứng-minh-hiệu-năng-siêu-tốc-241ms)
- [Hướng dẫn phím bấm Magic Remote](#-hướng-dẫn-phím-bấm-magic-remote)
- [Hướng dẫn triển khai nhanh](#-hướng-dẫn-triển-khai-nhanh)
- [Cấu trúc mã nguồn](#-cấu-trúc-mã-nguồn)

---

## 🌟 Giới thiệu

Trên các dòng Smart TV LG webOS (đặc biệt các model cấu hình 1GB - 1.5GB RAM như `43UP7750PTB`), giao diện gốc của nhà sản xuất thường gặp phải các hạn chế lớn:
- **Nặng nề & Chậm chạp**: Chiếm nhiều tài nguyên, thường xuyên giật lag.
- **Nhiều quảng cáo**: Đầy rẫy banner thương mại, video đề xuất không mong muốn.
- **Tắt ngầm khi xem YouTube / Netflix**: Hệ thống `memchute` liên tục tiêu diệt launcher gốc để nhường RAM cho ứng dụng phát video, khiến việc bấm phím **Home** trở về launcher mất từ **5 đến 7 giây** (Cold Start).

**Custom TV Launcher** (`vn.hungvu.tvlauncher`) được tạo ra nhằm giải quyết triệt để các vấn đề trên:
- **Cực kỳ nhẹ**: Chiếm **dưới 12MB RAM**, CPU idle xấp xỉ **0%**.
- **Khởi động siêu tốc**: Chuyển đổi từ YouTube / Netflix về launcher chỉ mất **214ms - 241ms** (nhanh hơn **23 lần** so với mặc định).
- **Thuần khiết & Tối giản**: 100% sạch bóng quảng cáo, tập trung hoàn toàn vào trải nghiệm nghe nhìn và giải trí gia đình.

---

## 📸 Bộ sưu tập giao diện (Screenshots)

Launcher được trang bị **Dynamic Weather Theme Engine**, tự động thay đổi hình nền WebP Full HD và biểu tượng SVG sống động theo điều kiện thời tiết thực tế:

### 1. Ngày Nắng Ấm / Trời Quang (Clear Day)
<p align="center">
  <img src="docs/screenshots/home-clear-day.png" alt="Màn hình chính Ngày Nắng" width="850" style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);" />
</p>

### 2. Ngày Mưa Rào / Mưa Nhẹ (Rain)
<p align="center">
  <img src="docs/screenshots/home-rain.png" alt="Màn hình chính Ngày Mưa" width="850" style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);" />
</p>

### 3. Ngày Dông Bão / Sấm Sét (Storm)
<p align="center">
  <img src="docs/screenshots/home-storm.png" alt="Màn hình chính Ngày Bão" width="850" style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);" />
</p>

### 4. Ngăn Kéo Tất Cả Ứng Dụng (All Apps Drawer Grid)
Lưới 5 cột hiện đại, hiển thị toàn bộ app cài đặt trên TV, có badge đánh dấu ứng dụng đã ghim và thanh hướng dẫn phím bấm Magic Remote ở đáy màn hình:
<p align="center">
  <img src="docs/screenshots/app-drawer.png" alt="Ngăn kéo tất cả ứng dụng" width="850" style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);" />
</p>

---

## ✨ Tính năng nổi bật

### ⚡ 1. Khởi động siêu nhẹ & Tối ưu chuyển đổi chỉ 241ms
- **MemoryManager KeepAlive Override**: Khai thác cơ chế override của daemon `/usr/sbin/memchute` thông qua file cấu hình `/home/root/memorymanager-conf.json`. Đưa launcher vào các danh sách ưu tiên cao nhất của hệ điều hành: `KeepOnLaunchEx`, `HomeGroup`, `KeepAlive`, `NoLaunchThresholdLite`.
- **Zero-lag Warm Resume**: Khi bạn mở YouTube, Netflix hay trình duyệt web, tiến trình của Launcher vẫn được bảo vệ nguyên vẹn trong RAM thay vì bị hệ thống gửi SIGKILL dọn dẹp.
- **Triệt tiêu Splash Screen & Spinner**: Thiết lập `"noSplashOnLaunch": true` và `"spinnerOnLaunch": false` trong `appinfo.json` giúp loại bỏ hoàn toàn cửa sổ chờ đệm của Surface Application Manager.

### 🌤️ 2. Widget Thời tiết & Dự báo thông minh
- **Open-Meteo Integration**: Tích hợp dữ liệu thời tiết hiện tại và dự báo ngày mai trong đúng 1 request API duy nhất.
- **Chính sách Cache 6 giờ nghiêm ngặt**: Lưu trữ an toàn trong `localStorage`, tối đa chỉ 4 lượt gọi mạng/ngày, tuyệt đối không gây tốn tài nguyên mạng và pin TV.
- **Dynamic Weather Theme**: Tự động nhận diện mã thời tiết WMO để chuyển hình nền tương ứng (Trời quang, Nhiều mây, Mưa rào, Dông bão).
- **Thiết kế Glassmorphism**: Kính mờ sang trọng kèm chấm beacon phát xung nhịp nhàng.

### 📌 3. Hàng ứng dụng yêu thích & Quản lý Ghim linh hoạt
- **Home Row**: Hiển thị các ứng dụng truyền hình, giải trí mặc định (YouTube, VTV Go, FPT Play) cùng nút mở ngăn kéo tất cả ứng dụng.
- **Ghim / Bỏ ghim tức thời**: Trong màn hình Tất cả ứng dụng, người dùng chỉ cần **giữ phím OK (800ms)** trên Magic Remote để thêm hoặc bỏ bớt ứng dụng yêu thích ra màn hình chính.
- **Đồng bộ trạng thái**: Lưu trữ an toàn, đồng bộ trong `localStorage` (`hungvu_launcher_config`).

### 📱 4. Ngăn kéo Tất cả ứng dụng (All Apps Drawer)
- **Tự động quét ứng dụng hệ thống**: Giao tiếp trực tiếp với Luna Service Bus (`luna://com.webos.applicationManager/listApps`) để liệt kê mọi app trên TV.
- **Bộ lọc thông minh**: Tự động ẩn các tiến trình daemon chạy ngầm của hệ điều hành (`com.webos.service.*`, `com.palm.service.*`), chỉ hiển thị các ứng dụng người dùng thực thụ.
- **Lưới CSS Grid 5 cột**: Cân đối, chuẩn tỉ lệ 10-foot UI cho màn hình TV phòng khách.

### 🛡️ 5. Hệ thống bảo vệ độ tương phản 4 lớp (Contrast Protection Engine)
- **Lớp 1**: Ảnh nền WebP Full HD nén tối ưu (< 180 KB).
- **Lớp 2 (Scrim Overlay)**: Lớp gradient tối đa tầng khử chói, tạo độ sâu quang học.
- **Lớp 3 (Frosted Glass)**: Kính mờ với viền sáng `rgba(255, 255, 255, 0.16)`.
- **Lớp 4 (Neon Glow)**: Viền phát sáng rực rỡ màu Cyan `#00F0FF` khi thẻ được focus bằng D-Pad hoặc con trỏ chuột bay Magic Remote.
- **Lớp 5 (Typography 3D)**: Đổ bóng chữ đa hướng giúp nội dung luôn sắc nét trên mọi nền ảnh sáng tối.

### 🔌 6. Tích hợp sâu hệ điều hành webOS (Deep System Integration)
- **Autostart on Boot**: Tự khởi động launcher ngay khi bật TV thông qua cấu hình native `bootd.json` và service `/var/lib/webosbrew/init.d/50-autostart-launcher`.
- **Hook phím cứng Magic Remote**: Bắt sự kiện phím Home vật lý (`773`, `774`, `125`) qua `lginputhook` để chuyển thẳng về launcher tùy biến.
- **Cơ chế tự phục hồi (Self-Healing)**: Script startup tự động kiểm tra và tái thiết lập cấu hình MemoryManager sau mỗi lần khởi động TV.

---

## ⚙️ Tùy biến Vị trí & Ứng dụng mặc định

Bạn có thể dễ dàng cá nhân hóa vị trí dự báo thời tiết và các ứng dụng ghim mặc định thông qua file [src/js/config.js](src/js/config.js):

```javascript
window.APP_CONFIG = {
  // 1. Tùy biến Vị trí Thời tiết
  weather: {
    locationName: 'Xuân Phương, Hà Nội', // Tên địa điểm hiển thị
    latitude: 21.033,                     // Vĩ độ
    longitude: 105.743,                    // Kinh độ
    timezone: 'Asia/Bangkok'              // Múi giờ
  },

  // 2. Danh sách App mặc định trên Màn hình chính (Home Row)
  defaultPinnedApps: [
    'youtube.leanback.v4', // YouTube
    'com.vtvgotv.app',     // VTV Go
    'com.fpt.fptplay'      // FPT Play
  ]
};
```

> [!TIP]
> **Ví dụ đổi sang địa điểm khác**:
> - **TP. Hồ Chí Minh**: `locationName: 'Quận 1, TP. Hồ Chí Minh'`, `latitude: 10.776`, `longitude: 106.700`
> - **Đà Nẵng**: `locationName: 'Hải Châu, Đà Nẵng'`, `latitude: 16.054`, `longitude: 108.202`
>
> Sau khi chỉnh sửa, chỉ cần chạy `./deploy.sh`, launcher sẽ tự động nạp vị trí mới ngay lập tức!

---

## 📊 Chứng minh hiệu năng: Siêu tốc 241ms

Đo lường thời gian chuyển đổi thực tế từ ứng dụng **YouTube** (`youtube.leanback.v4`) về **Launcher** (`vn.hungvu.tvlauncher`) trên thiết bị LG webOS TV (SoC ARMv7l, RAM 1GB):

```
Trước tối ưu (Cold Start):   ████████████████████████████████████████████ 4,947 ms
Sau tối ưu (Warm Switch):     █ 214 ms - 241 ms
```

| Tiêu chí | Trước khi tối ưu | Sau khi tối ưu | Hiệu quả cải thiện |
| :--- | :---: | :---: | :---: |
| **Trạng thái tiến trình khi mở YouTube** | Bị `memchute` kill sạch | **Giữ thường trực trong RAM** | Không còn bị tắt ngầm |
| **Thời gian gọi phản hồi SAM (RPC)** | 1,397 ms | **72 ms** | Nhanh hơn **19.4 lần** |
| **Thời gian Surface Rendering** | 3,550 ms | **142 ms** | Nhanh hơn **25.0 lần** |
| **Tổng thời gian trở về Launcher** | **4,947 ms (~5.0s)** | **214 ms - 241 ms (~0.2s)** | **Nhanh hơn ~23.1 lần (giảm 95.7% độ trễ)** |
| **Dung lượng RAM chiếm dụng** | ~45 MB (gốc) | **< 12 MB** | Tiết kiệm **73% RAM** |

---

## 🎮 Hướng dẫn phím bấm Magic Remote

| Phím bấm | Thao tác | Mô tả chức năng |
| :--- | :--- | :--- |
| **▲ ▼ ◀ ▶ (D-Pad)** | Nhấn các hướng | Điều hướng focus giữa các thẻ ứng dụng (hiển thị viền Cyan Neon) |
| **OK / Con trỏ** | Nhấn nhanh | Khởi chạy ứng dụng đang chọn; hoặc mở danh sách tất cả ứng dụng |
| **Giữ OK (800ms)** | Nhấn & giữ | **Ghim / Bỏ ghim** ứng dụng yêu thích ra ngoài Màn hình chính |
| **Back** | Nhấn nhanh | Đóng ngăn kéo "Tất cả ứng dụng", trở về màn hình chính |
| **Home** | Nhấn nhanh | Về màn hình chính Custom Launcher tức thì (< 241ms) |

---

## 🛠️ Hướng dẫn triển khai nhanh

### Điều kiện tiên quyết:
- TV LG đã được Root (qua [rootmy.tv](https://rootmy.tv) hoặc [webosbrew](https://github.com/webosbrew/webos-homebrew-channel)).
- Đã bật SSH root tại cổng 22.

### Triển khai tự động bằng 1 lệnh:
Script [deploy.sh](deploy.sh) thực hiện tự động toàn bộ 7 bước: cấp quyền Luna, nạp cấu hình KeepAlive MemoryManager, đồng bộ mã nguồn, cấu hình phím Home và khởi động ứng dụng:

```bash
# Đặt biến môi trường IP của TV (mặc định 192.168.1.149)
export TV_IP="192.168.1.149"

# Cấp quyền thực thi và chạy deploy
chmod +x deploy.sh
./deploy.sh
```

---

## 📁 Cấu trúc mã nguồn

```text
custom-tv-launcher/
├── deploy.sh                  # Script triển khai tự động 7 bước & tối ưu hệ thống
├── README.md                  # Tài liệu giới thiệu toàn bộ tính năng & hướng dẫn
├── UNIFIED_LAUNCHER_PLAN.md   # Bản đặc tả kỹ thuật chi tiết
├── docs/
│   └── screenshots/           # Ảnh chụp màn hình Full HD
│       ├── home-clear-day.png # Màn hình chính: Ngày nắng ấm
│       ├── home-rain.png      # Màn hình chính: Ngày mưa
│       ├── home-storm.png     # Màn hình chính: Ngày dông bão
│       ├── home-screen.png    # Màn hình chính: Mặc định
│       └── app-drawer.png     # Ngăn kéo tất cả ứng dụng
└── src/
    ├── appinfo.json           # Cấu hình app webOS (noSplash, keepAlive, handlesRelaunch)
    ├── index.html             # Khung DOM chuẩn Chromium 79 (0ms First Paint)
    ├── assets/
    │   ├── app-icons/         # Kho icon độ phân giải cao cho các ứng dụng TV
    │   └── backgrounds/       # Hình nền WebP theo điều kiện thời tiết
    ├── css/
    │   ├── main.css           # Bố cục, thẻ ứng dụng, Frosted Glass, Header
    │   ├── contrast.css       # Hệ thống Scrim đa tầng chống chói
    │   ├── navigation.css     # Hiệu ứng Focus Neon Glow và D-Pad matrix
    │   └── weather-bg.css     # Hoạt ảnh chuyển nền Crossfade theo thời tiết
    ├── js/
    │   ├── config.js          # File cấu hình tùy biến vị trí thời tiết & app mặc định
    │   ├── app.js             # Bộ điều phối chính, Lifecycle webOSRelaunch & stageReady
    │   ├── clock.js           # Đồng hồ điện tử & ngày tháng tiếng Việt
    │   ├── weather.js         # API Open-Meteo, Cache 6 giờ, Dynamic WMO Theme
    │   ├── drawer.js          # Quản lý Modal Tất cả ứng dụng, Pin/Unpin
    │   ├── storage.js         # Lưu trữ cấu hình pins & cache trong localStorage
    │   ├── luna.js            # Cầu nối Luna Service Bus (PalmServiceBridge)
    │   └── navigation.js      # Hệ thống điều hướng Spatial Navigation
    └── tools/
        └── 50-autostart-launcher  # Daemon tự khởi động & tự phục hồi Memory Policy
```

---

## 📜 Giấy phép & Tác giả
- Phát triển bởi: **Hung Vu**
- Dành cho cộng đồng người dùng LG webOS TV yêu thích sự tối giản, mượt mà và tốc độ cao.
