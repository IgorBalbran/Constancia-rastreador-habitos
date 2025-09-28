const CACHE_NAME = 'constancia-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/app.js',
  // Adicione aqui o caminho para seu CSS se ele for externo
  // '/style.css',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap'
];

// Evento de instalação: abre o cache e armazena os arquivos principais
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento de fetch: intercepta as requisições
self.addEventListener('fetch', event => {
  event.respondWith(
    // Tenta encontrar a resposta no cache
    caches.match(event.request)
      .then(response => {
        // Se encontrar no cache, retorna a resposta do cache
        if (response) {
          return response;
        }
        // Se não, faz a requisição à rede
        return fetch(event.request);
      }
    )
  );
});
