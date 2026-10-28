/* Offline support: app files come fresh from the network when online (cache is the offline fallback),
   audio and fonts are kept once downloaded */
const CORE = "gl-core-v2", AUDIO = "gl-audio-v1", FONTS = "gl-fonts-v1";
const NET_TIMEOUT = 3500;
const PACKS = ["ja"];
const CORE_FILES = ["./", "index.html", "app.css", "app.js", "manifest.json",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
  ...PACKS.flatMap(p => [`packs/${p}.js`, `packs/${p}-audio.js`])];
importScripts(...PACKS.map(p => `packs/${p}-audio.js`));

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CORE).then(c => c.addAll(CORE_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (![CORE, AUDIO, FONTS].includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener("message", e => { if (e.data === "cache-audio") e.waitUntil(cacheAudio()); });

let busy = null;
function cacheAudio() {
  if (busy) return busy;
  busy = (async () => {
    const c = await caches.open(AUDIO);
    const have = new Set((await c.keys()).map(r => new URL(r.url).pathname));
    const base = new URL("./", self.registration.scope).pathname;
    const todo = [];
    for (const [pid, map] of Object.entries(self.GL_AUDIO || {}))
      for (const k of Object.values(map)) {
        const u = `audio/${pid}/${k}.mp3`;
        if (!have.has(base + u)) todo.push(u);
      }
    for (let i = 0; i < todo.length; i += 8)
      await Promise.allSettled(todo.slice(i, i + 8).map(u => fetch(u).then(r => r.ok && c.put(u, r))));
  })().finally(() => { busy = null; });
  return busy;
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(cacheFirst(FONTS, req));
    return;
  }
  if (url.origin !== location.origin) return;
  if (url.pathname.includes("/audio/")) { e.respondWith(cacheFirst(AUDIO, req)); return; }
  e.respondWith(networkFirst(req));
});
async function cacheFirst(name, req) {
  const c = await caches.open(name);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") c.put(req, res.clone());
  return res;
}
async function networkFirst(req) {
  const c = await caches.open(CORE);
  const key = req.mode === "navigate" ? "index.html" : req;
  try {
    const res = await Promise.race([
      fetch(req, { cache: "no-cache" }),
      new Promise((_, no) => setTimeout(() => no(new Error("slow network")), NET_TIMEOUT))
    ]);
    if (res.ok) c.put(key, res.clone());
    return res;
  } catch (err) {
    const hit = await c.match(key, { ignoreSearch: true });
    return hit || new Response("Нет соединения", { status: 503 });
  }
}
