/* =====================================================================
   SW.JS — "service worker" : permet d'installer l'app et de l'utiliser
   sans connexion.

   Stratégie "réseau d'abord" : si tu as internet, l'app prend TOUJOURS
   la dernière version en ligne (donc les mises à jour arrivent toutes
   seules). Sans internet, elle utilise la copie gardée en mémoire.
   Tes données d'entraînement ne sont PAS ici : elles sont dans le
   localStorage, que ce fichier ne touche jamais.
   ===================================================================== */
const CACHE = "calisthenie-v14";
const FICHIERS = [
  "./", "index.html", "style.css", "app.js", "programme.js", "illustrations.js", "manifest.json",
  "icones/icone-192.png", "icones/icone-512.png", "tests.html", "tests.js"
];

// À l'installation : on garde une copie des fichiers
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)));
  self.skipWaiting();
});

// À l'activation : on supprime les anciennes copies
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(cles =>
    Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

// À chaque chargement : réseau d'abord, copie en secours
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request, { cache: "no-cache" })
      .then(reponse => {
        const copie = reponse.clone();
        caches.open(CACHE).then(c => c.put(e.request, copie));
        return reponse;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
