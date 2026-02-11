
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
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle local game file requests (Virtual File System)
  if (url.pathname.includes('/local-game/')) {
      const parts = url.pathname.split('/local-game/');
      if (!parts[1]) return; 
      
      const gameId = decodeURIComponent(parts[1]);
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
                  
                  return new Response(blob, {
                      headers: {
                          'Content-Type': 'application/octet-stream',
                          'Content-Disposition': `inline; filename="game.z5"`
                      }
                  });
              } catch (e) {
                  console.error("SW: Failed to serve local game", e);
                  return new Response('Error loading local game', { status: 500 });
              }
          })()
      );
      return;
  }

  // Handle Remote Game Proxy (Stable URL for Autosaves + CORS Bypass)
  // Maps /remote-game-proxy/<encoded_url> to the actual file content via proxies
  if (url.pathname.includes('/remote-game-proxy/')) {
      const parts = url.pathname.split('/remote-game-proxy/');
      if (!parts[1]) return;

      const targetUrl = decodeURIComponent(parts[1]);
      
      event.respondWith(
          (async () => {
              const proxies = [
                  // 1. CorsProxy.io (Fast, binary support)
                  (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
                  // 2. AllOrigins Raw (Backup)
                  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
              ];

              for (const createProxyUrl of proxies) {
                  try {
                      const proxyUrl = createProxyUrl(targetUrl);
                      const response = await fetch(proxyUrl);
                      if (response.ok) {
                          // Return a new response to ensure headers are clean/correct for Parchment
                          const blob = await response.blob();
                          return new Response(blob, {
                              status: 200,
                              headers: {
                                  'Content-Type': 'application/octet-stream',
                                  'Cache-Control': 'public, max-age=31536000' // Cache aggressively
                              }
                          });
                      }
                  } catch (e) {
                      console.warn(`Proxy failed for ${targetUrl}`, e);
                  }
              }

              // Fallback: Try direct (might work if CORS is enabled on source)
              try {
                  const directRes = await fetch(targetUrl);
                  if (directRes.ok) return directRes;
              } catch (e) { /* ignore */ }

              return new Response("Failed to load game file from all sources.", { status: 502 });
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
