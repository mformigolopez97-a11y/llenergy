/* ═══════════════════════════════════════════════════════════════════════
   LLEnergy · trabajador de servicio

   Esto es lo que hace que la aplicación abra sin internet en un techo de
   El Cobre, y lo que hace que las mejoras lleguen solas sin desinstalar
   nada.

   Cómo funciona la actualización: al publicar una versión nueva se cambia
   el número de VERSION de abajo. El teléfono se da cuenta la próxima vez
   que tenga señal, se descarga la nueva en segundo plano y la aplica en
   el siguiente arranque. Los trabajos guardados no se tocan: viven en el
   almacenamiento del navegador, no aquí.
   ═══════════════════════════════════════════════════════════════════════ */

const VERSION = 'llenergy-v10';

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
];

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(VERSION)
      // si algún archivo falla no se tira la instalación entera
      .then(c => Promise.allSettled(ARCHIVOS.map(a => c.add(a))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Las tipografías de Google se guardan aparte: la primera vez hacen falta
  // datos, después ya no.
  const esFuente = url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com');

  if (url.origin !== location.origin && !esFuente) return;

  ev.respondWith(
    caches.match(req).then(guardado => {
      // Primero lo guardado, para que abra al instante y sin datos.
      // De fondo se busca la versión nueva y se deja lista para la próxima.
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
