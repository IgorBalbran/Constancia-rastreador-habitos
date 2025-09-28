const CACHE_NAME = 'constancia-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/app.js',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap',
  // Adicione os ícones que você criou na pasta /images
  '/images/icon-72x72.png',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
    // Ignora requisições que não são GET
    if (event.request.method !== 'GET') {
        return;
    }
  // Estratégia: Network falling back to cache
  // Tenta buscar na rede primeiro. Se falhar (offline), busca no cache.
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
