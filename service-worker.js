var CACHE_ASSETS = '202512131138';
var assets = [ 
    'index.html',
    'css/base.css',
    'css/editor.css',
    'css/swiper-bundle.min.css',
    'js/jquery-3.7.1.min.js',
    'js/swiper-bundle.min.js',
    'js/swiper-conf.js',
    'js/indexedDB.js',
    'js/user.js',
    'js/sw-main.js',
    'js/players.js',
    'js/editor.js',
    'js/sweetalert2.all.min.js',
    'images/youzic.ico',
    'images/youzic-192.png',
    'images/youzic-256.png',
    'images/youzic-512.png',
    'images/ban.jpg',
    'images/bg.jpg',
    'images/bgbody.jpg',
    'manifest.json'
];

// Lors de l'installation, on force l'activation immédiate du nouveau service worker
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_ASSETS).then(function(cache) {
            console.log("add : ", assets);
            return cache.addAll(assets);
        })
    );
    self.skipWaiting();  // Force l'activation immédiate
});

self.addEventListener('activate', function(event) {
    var cacheWhitelist = [CACHE_ASSETS];
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log("remove : ", cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            self.clients.claim();  // Prendre le contrôle de la page immédiatement

            // Envoyer un message à chaque client pour notifier la mise à jour
            return self.clients.matchAll().then(function(clients) {
                clients.forEach(function(client) {
                    client.postMessage({
                        type: 'UPDATE_AVAILABLE'
                    });
                });
            });
        })
    );
});

// Gestion des requêtes réseau avec cache
self.addEventListener('fetch', function(event) {
    const requestUrl = new URL(event.request.url);

    // ➤ Ne pas intercepter les appels à l’API YouTube
    if (requestUrl.hostname.includes('googleapis.com')) {
        console.log("Bypass du cache pour l'API YouTube :", requestUrl.href);
        return; // on ne touche pas à cette requête
    }
    
    // ➤ Ignorer les flux audio pour ne pas perturber le lecteur
    const isAudio = event.request.destination === 'audio' || requestUrl.pathname.endsWith('.mp3');
    if (isAudio) {
        console.log("skip service worker for audio stream:", event.request.url);
        return; // Laisser passer directement, sans mise en cache
    }

    // Gestion classique pour le reste
    if (requestUrl.pathname.startsWith("/")) {
        event.respondWith(
            caches.open(CACHE_ASSETS).then(function(cache) {
                return cache.match(event.request).then(function(response) {
                    if (response) {
                        console.log("use cache : ", response);
                        return response;
                    } else {
                        return fetch(event.request).then(function(response) {
                            cache.put(event.request, response.clone());
                            console.log("no cache found, download : ", response);
                            return response;
                        });
                    }
                });
            })
        );
    }
});
