
const CACHE_NAME = 'fableforge-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap'
];

// Essential interpreter assets
const INTERPRETER_ASSETS = [
    'https://iplayif.com/',
    'https://iplayif.com/parchment.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([...ASSETS_TO_CACHE, ...INTERPRETER_ASSETS]);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle local game file requests (Virtual File System)
  // This allows us to provide a stable URL for the interpreter, ensuring autosaves work.
  if (url.pathname.startsWith('/local-game/')) {
      const gameId = decodeURIComponent(url.pathname.split('/local-game/')[1]);
      event.respondWith(
          (async () => {
              try {
                  const db = await new Promise((resolve, reject) => {
                      const req = indexedDB.open('FableForgeDB', 1);
                      req.onsuccess = () => resolve(req.result);
                      req.onerror = () => reject(req.error);
                  });
                  
                  const blob = await new Promise((resolve, reject) => {
                      const tx = db.transaction('gameFiles', 'readonly');
                      const store = tx.objectStore('gameFiles');
                      const req = store.get(gameId);
                      req.onsuccess = () => resolve(req.result);
                      req.onerror = () => reject(req.error);
                  });

                  if (!blob) return new Response('Game not found', { status: 404 });
                  
                  // Return the blob as a file response
                  const filename = `game-${gameId}.z5`; // Default extension, MIME type detection handles it mostly
                  return new Response(blob, {
                      headers: {
                          'Content-Type': 'application/octet-stream',
                          'Content-Disposition': `inline; filename="${filename}"`
                      }
                  });
              } catch (e) {
                  console.error("SW: Failed to serve local game", e);
                  return new Response('Error loading game', { status: 500 });
              }
          })()
      );
      return;
  }

  // Stale-While-Revalidate Strategy for other assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Cache the new version if it's a valid response
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
            });
        }
        return networkResponse;
      }).catch(() => {
          // If network fails, we rely purely on cache
      });
      
      return cachedResponse || fetchPromise;
    })
  );
});
