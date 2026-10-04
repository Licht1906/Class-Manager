/* Giao diện cũ có đăng ký service worker để lưu sẵn trang tra điểm. Giao diện mới không dùng nữa.
   File này chỉ còn nhiệm vụ dọn dẹp trên các máy đã từng mở bản cũ: xoá bộ nhớ đệm rồi tự gỡ. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))).then(() => self.registration.unregister()));
});
