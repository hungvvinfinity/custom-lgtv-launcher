/**
 * ==============================================================================
 * Custom TV Launcher - Cấu hình Người Dùng (User Configuration)
 * ==============================================================================
 * Bạn có thể dễ dàng chỉnh sửa vị trí dự báo thời tiết và các ứng dụng ghim
 * mặc định trên màn hình chính tại file này.
 */
window.APP_CONFIG = {
  // 1. Tùy biến Vị trí Thời tiết (Weather Location)
  weather: {
    // Tên địa điểm hiển thị trên màn hình chính
    locationName: 'Xuân Phương, Hà Nội',

    // Tọa độ địa lý (Latitude, Longitude)
    latitude: 21.033,
    longitude: 105.743,

    // Múi giờ địa phương
    timezone: 'Asia/Bangkok'
  },

  // 2. Danh sách Ứng dụng Ghim mặc định trên Màn hình chính (Home Row)
  // Điền danh sách App ID của các ứng dụng bạn muốn hiển thị sẵn khi mở launcher.
  defaultPinnedApps: [
    'youtube.leanback.v4', // YouTube
    'com.vtvgotv.app',     // VTV Go
    'com.fpt.fptplay'      // FPT Play
  ]
};
