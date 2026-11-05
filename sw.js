/* 플레이트 로그 오프라인용 서비스 워커 (https에서만 등록됨)
   - 앱 파일: 저장해 둔 것을 바로 보여 주고, 뒤에서 새 버전을 받아 둠 → 새 버전은 다음에 열 때 적용
   - 글꼴·three.js 같은 외부 파일: 처음 받을 때 저장해 두고 그다음부터는 저장본을 씀(주소에 버전이 있어 바뀌지 않음)
   - 운동 기록은 localStorage·IndexedDB에 있어서 여기서 다루지 않음 */
/* GitHub Pages는 브라우저가 파일을 10분 동안 그대로 쓰게 해서, 앱 파일은 항상 서버에 새 버전이 있는지 물어보고 받음(cache:'no-cache' / 'reload') */
const APP = 'platelog-app-v2', EXT = 'platelog-ext-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
const EXT_HOSTS = /^(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net)$/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== APP && k !== EXT).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    /* 화면 이동(앱 열기)은 주소에 상관없이 index.html 하나로 저장 */
    const key = r.mode === 'navigate' ? new URL('./index.html', location).href : r;
    const net = fetch(r.url, { cache: 'no-cache', credentials: 'same-origin' }).then(async res => {
      if (res.ok) { const c = await caches.open(APP); await c.put(key, res.clone()); }
      return res;
    });
    e.waitUntil(net.then(() => {}, () => {}));
    e.respondWith(caches.open(APP).then(c => c.match(key, { ignoreSearch: true })).then(hit => hit || net));
    return;
  }
  if (EXT_HOSTS.test(u.hostname)) {
    e.respondWith(caches.open(EXT).then(async c => {
      const hit = await c.match(r);
      if (hit) return hit;
      const res = await fetch(r);
      if (res.ok || res.type === 'opaque') c.put(r, res.clone());
      return res;
    }));
  }
});
