self.addEventListener('install', (e) => {
  console.log('Service Worker: Installed');
});

self.addEventListener('activate', (e) => {
  console.log('Service Worker: Activated');
});

self.addEventListener('fetch', (e) => {
  // Пока не кешируем, просто логируем
  console.log('Service Worker: Fetching', e.request.url);
});
