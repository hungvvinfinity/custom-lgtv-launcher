/**
 * Clock Module - Real-time clock & Vietnamese calendar date
 */
const Clock = (function () {
  const DAYS_VI = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

  let timeElement = null;
  let colonElement = null;
  let dateElement = null;
  let intervalId = null;

  function pad(num) {
    return num < 10 ? '0' + num : '' + num;
  }

  function update() {
    const now = new Date();

    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());

    if (timeElement) {
      // Keep colon element preserved if separated, or set directly
      const hourSpan = document.getElementById('clock-hour');
      const minSpan = document.getElementById('clock-min');
      if (hourSpan && minSpan) {
        hourSpan.textContent = hours;
        minSpan.textContent = minutes;
      } else {
        timeElement.textContent = hours + ':' + minutes;
      }
    }

    if (colonElement) {
      colonElement.classList.toggle('blink');
    }

    if (dateElement) {
      const dayName = DAYS_VI[now.getDay()];
      const date = pad(now.getDate());
      const month = pad(now.getMonth() + 1);
      const year = now.getFullYear();
      dateElement.textContent = `${dayName}, ${date} tháng ${month}, ${year}`;
    }
  }

  function init() {
    timeElement = document.getElementById('clock-time');
    colonElement = document.getElementById('clock-colon');
    dateElement = document.getElementById('clock-date');

    // Run first update immediately
    update();

    // Start interval
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(update, 1000);
  }

  function destroy() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  return {
    init,
    update,
    destroy
  };
})();
