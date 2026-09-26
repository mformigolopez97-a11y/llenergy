/* ═══════════════════════════════════════════════════════════════════════
   LLEnergy · trabajador de servicio

   Esto es lo que hace que la aplicación abra sin internet en un techo de
   El Cobre, y lo que hace que las mejoras lleguen solas.

   ─── Por qué cambió esto (v16) ───
   La versión anterior guardaba los archivos con cache.add(), que se
   conforma con lo que el navegador tenga en su propia caché. GitHub sirve
   los archivos con max-age de 10 minutos, así que al instalar una versión
   nueva se podía guardar el archivo VIEJO: número de versión nuevo,
   contenido viejo. Por eso una actualización podía no llegar nunca.

   Dos arreglos:
   1. Al instalar se pide todo con cache:'reload', que salta la caché del
      navegador y va al servidor de verdad.
   2. Para el programa (html y js) se mira primero la red, con dos segundos
      y medio de paciencia; si no contesta, se tira de lo guardado. Con
      señal se ve siempre lo último; sin señal se abre igual al instante.
   ═══════════════════════════════════════════════════════════════════════ */

const VERSION = 'llenergy-v30';

const ARCHIVOS = [
  './',
  './index.html',
  './app.js',
  './motor.js',
  './datos.js',
  './cotizacion.js',
  './manifest.webmanifest',
  './icono-192.png',
  './icono-512.png',
  './icono-maskable.png',
];

const ESPERA = 2500;   // lo que se aguanta a la red antes de tirar de lo guardado

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(VERSION).then(c => Promise.allSettled(
      // cache:'reload' = no te fíes de la caché del navegador, ve al servidor
      ARCHIVOS.map(a => fetch(new Request(a, { cache: 'reload' }))
        .then(res => (res && res.ok) ? c.put(a, res) : null))
    )).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* la app puede preguntar qué versión está corriendo */
self.addEventListener('message', ev => {
  if (ev.data === 'version' && ev.source) ev.source.postMessage({ version: VERSION });
});

const esPrograma = url =>
  url.origin === location.origin &&
  (url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('/'));

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const esFuente = url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com');
  if (url.origin !== location.origin && !esFuente) return;

  /* El programa: primero la red; si tarda o no hay, lo guardado. */
  if (esPrograma(url)) {
    ev.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try {
        const res = await Promise.race([
          fetch(new Request(req, { cache: 'no-cache' })),
          new Promise((_, no) => setTimeout(() => no(new Error('lenta')), ESPERA)),
        ]);
        if (res && res.ok) { cache.put(req, res.clone()); return res; }
        throw new Error('respuesta mala');
      } catch (e) {
        return (await cache.match(req))
          || (await cache.match('./index.html'))
          || Response.error();
      }
    })());
    return;
  }

  /* Lo demás (iconos, tipografías): primero lo guardado, que no cambia. */
  ev.respondWith(
    caches.match(req).then(guardado => {
      const red = fetch(req).then(res => {
        if (res && res.ok) {
          const copia = res.clone();
          caches.open(VERSION).then(c => c.put(req, copia));
        }
        return res;
      }).catch(() => guardado);
      return guardado || red;
    })
  );
});
