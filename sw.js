const CACHE_NAME = "lexicon-pdf-ui-v2"; // меняй версию при изменениях

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        const resClone = networkRes.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, resClone);
        });

        return networkRes;
      })
      .catch(() => {
        return caches.match(req);
      })
  );
});
