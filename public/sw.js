const CACHE_NAME = 'fableforge-v10';
const CORE_ASSETS = ['./', './index.html', './manifest.json', './parchment.html', './catalog.json'];
const DATABASE_NAME = 'FableForgeDB';
const GAME_STORE = 'gameFiles';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

function readGame(gameId) {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(DATABASE_NAME, 1);
    openRequest.onerror = () => reject(openRequest.error);
    openRequest.onsuccess = () => {
      const database = openRequest.result;
      const request = database.transaction(GAME_STORE).objectStore(GAME_STORE).get(gameId);
      request.onsuccess = () => {
        database.close();
        resolve(request.result);
      };
      request.onerror = () => {
        database.close();
        reject(request.error);
      };
    };
  });
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  const marker = '/local-game/';
  const markerIndex = requestUrl.pathname.indexOf(marker);

  if (markerIndex >= 0) {
    const storyPath = requestUrl.pathname.slice(markerIndex + marker.length);
    const gameId = decodeURIComponent(storyPath.split('/')[0]);
    event.respondWith(
      readGame(gameId)
        .then(file => file
          ? new Response(file, { headers: { 'Content-Type': 'application/octet-stream' } })
          : new Response('Story file not found.', { status: 404 }))
        .catch(() => new Response('Could not read the story file.', { status: 500 })),
    );
    return;
  }

  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || Response.error())),
    );
    return;
  }

  if (requestUrl.pathname.endsWith('/catalog.json')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || Response.error())),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const fresh = fetch(event.request).then(response => {
        if (response.ok) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      });
      return cached || fresh;
    }),
  );
});
