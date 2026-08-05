/* 피치 리더 서비스워커
   자료(data.json)를 한 번만 내려받고 이후에는 기기에서 바로 읽습니다.
   ── data.json을 새 자료로 교체할 때는 아래 CACHE 값의 숫자를 반드시 올리세요.
      (예: pitch-reader-v1 → pitch-reader-v2) 올리지 않으면 옛 자료가 계속 쓰입니다. */

const CACHE = "pitch-reader-v1";
const PRECACHE = ["./", "./index.html", "./data.json", "./manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 자료: 캐시가 있으면 네트워크를 아예 쓰지 않습니다.
  if (url.pathname.endsWith("/data.json")) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      }))
    );
    return;
  }

  // 나머지: 새 것을 먼저 받아보고, 실패하면 캐시로 넘어갑니다.
  event.respondWith(
    fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy));
      return response;
    }).catch(() => caches.match(request))
  );
});
