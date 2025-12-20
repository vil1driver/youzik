// Déclaration globale pour pouvoir y accéder plus tard
let ytPlayer = null;
let isManuallySwitching = false;

// Variable globale pour suivre l'origine actuelle
const currentOrigin = window.location.protocol + '//' + window.location.hostname;
if (window.location.port) {
    currentOrigin += ':' + window.location.port;
}

// Fonction pour charger une vidéo youtube dans le lecteur vidéo
function loadVideo(videoId) {
    const playerDiv = document.getElementById('videoPlayer');

    // Destroy existing player if it exists and is ready
    if (ytPlayer && typeof ytPlayer.destroy === 'function') {
        try {
            ytPlayer.destroy();
            console.log("Ancien lecteur YouTube détruit.");
        } catch (e) {
            console.warn("Erreur lors de la destruction de l'ancien lecteur YouTube:", e);
        }
        ytPlayer = null;
    }

    // Nettoyage de l'ancien audio s'il y en a un
    const existingAudio = playerDiv.querySelector('audio');
    if (existingAudio) {
        try {
            existingAudio.pause();
            existingAudio.removeAttribute('src');
            existingAudio.load();
        } catch (e) {
            console.warn('Erreur lors de l’arrêt de l’ancien audio:', e);
        }
        existingAudio.remove();
    }

    // Nettoyer le contenu du conteneur
    playerDiv.innerHTML = '<div id="ytPlayerContainer"></div>';

    // Créer et ajouter le bouton Play/Pause
    const btn = document.createElement('button');
    btn.id = 'videoToggleBtn';
    btn.innerHTML = '<span class="spinner"></span>'; // chargement

    btn.addEventListener('click', function () {
        const state = ytPlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
            ytPlayer.pauseVideo();
        } else {
            ytPlayer.playVideo();
        }
    });

    // Créer une couche transparente pour bloquer les interactions
    const overlay = document.createElement('div');
    overlay.className = 'video-overlay-blocker';
    
    playerDiv.appendChild(btn);
    playerDiv.appendChild(overlay);

    // Initialiser le lecteur YouTube avec l’API
    ytPlayer = new YT.Player('ytPlayerContainer', {
        height: '360',
        width: '640',
        videoId: videoId,
        playerVars: {
            autoplay: 1,
            enablejsapi: 1,
            origin: currentOrigin,
            playsinline: 1,            
            controls: 0,
            rel: 0,
            showinfo: 0
        },
        events: {
            'onStateChange': function (event) {
                switch (event.data) {
                    case YT.PlayerState.BUFFERING:
                        btn.innerHTML = '<span class="spinner"></span>';
                        break;
                    case YT.PlayerState.PLAYING:
                        btn.innerText = '⏸️';
                        break;
                    case YT.PlayerState.PAUSED:
                    case YT.PlayerState.ENDED:
                        btn.innerText = '▶️';
                        break;
                }
            },
            'onError': function (event) {
                console.warn("Erreur YouTube code :", event.data);
                btn.innerText = '';
                console.log("Vidéo en erreur");
            }
        }
    });
}


// Fonction pour charger une web radio avec un bouton Play/Pause personnalisé
function loadStream(url) {
    const playerDiv = document.getElementById('videoPlayer');
    
    // Si un ancien audio existe, on le supprime proprement
    const existingAudio = playerDiv.querySelector('audio');
    if (existingAudio) {
        try {
            existingAudio.pause();
            existingAudio.removeAttribute('src'); // Vide l'attribut src
            existingAudio.load(); // Force l'arrêt du téléchargement
        } catch (e) {
            console.warn('Erreur lors de l’arrêt de l’ancien audio:', e);
        }
        // Supprimer l'élément du DOM
        existingAudio.remove();
    }

    // Nettoyer le contenu du conteneur
    playerDiv.innerHTML = '';

    const audioElement = document.createElement('audio');
    audioElement.setAttribute('preload', 'none');
    audioElement.setAttribute('autoplay', 'autoplay');
    audioElement.setAttribute('src', url);
    audioElement.setAttribute('type', 'audio/mpeg');
    audioElement.style.display = 'none';

    const playPauseBtn = document.createElement('button');
    playPauseBtn.id = 'audioToggleBtn';
    playPauseBtn.innerHTML = '<span class="spinner"></span>';

    let isPlaying = false;
    let isBuffering = false;

    playPauseBtn.onclick = function () {
        if (!isPlaying) {
            playPauseBtn.innerHTML = '<span class="spinner"></span>'; // chargement
            audioElement.play();
        } else {
            audioElement.pause();
        }
    };

    audioElement.addEventListener('playing', () => {
        isBuffering = false;
        isPlaying = true;
        playPauseBtn.textContent = '⏸️';
    });
    audioElement.addEventListener('pause', () => {
        isPlaying = false;
        playPauseBtn.textContent = '▶️';
    });
    audioElement.addEventListener('waiting', () => {
        if (isPlaying) {
            isBuffering = true;
            playPauseBtn.innerHTML = '<span class="spinner"></span>'; // chargement
        }
    });
    audioElement.addEventListener('canplay', () => {
        if (isPlaying && isBuffering) {
            isBuffering = false;
            playPauseBtn.textContent = '⏸️';
        }
    });
    audioElement.addEventListener('ended', () => {
        isPlaying = false;
        playPauseBtn.textContent = '▶️';
    });

    playerDiv.appendChild(audioElement);
    playerDiv.appendChild(playPauseBtn);
}

// Fonction pour charger une playlist youtube dans le lecteur : list=PLNeUzEKmiTgj_vuON_DZUp_fLqspZnnRY

const API_KEY = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; // clé à conserver secrette
let videoIds = [];
let currentIndex = 0;

async function loadPlaylist(playlistId) {
    const playerDiv = document.getElementById('videoPlayer');

    // Destroy existing player if it exists and is ready
    if (ytPlayer && typeof ytPlayer.destroy === 'function') {
        try {
            ytPlayer.destroy();
            console.log("Ancien lecteur YouTube détruit.");
        } catch (e) {
            console.warn("Erreur lors de la destruction de l'ancien lecteur YouTube:", e);
        }
        ytPlayer = null;
    }
    
    // Nettoyage de l'ancien audio s'il y en a un
    const existingAudio = playerDiv.querySelector('audio');
    if (existingAudio) {
        try {
            existingAudio.pause();
            existingAudio.removeAttribute('src');
            existingAudio.load();
        } catch (e) {
            console.warn('Erreur lors de l’arrêt de l’ancien audio:', e);
        }
        existingAudio.remove();
    }

    // Récupération des IDs de la playlist
    videoIds = [];
    currentIndex = 0;
    await fetchPlaylistItems(playlistId);

    // Injection HTML
    playerDiv.innerHTML = `
        <div id="ytPlayerContainer"></div>
        <div class="video-controls">
            <button id="prevVideoBtn">⏮️</button>
            <button id="videoToggleBtn"><span class="spinner"></span></button>
            <button id="nextVideoBtn">⏭️</button>
        </div>
        <div class="video-overlay-blocker"></div>
    `;

    // Initialisation du player
    ytPlayer = new YT.Player('ytPlayerContainer', {
        height: '360',
        width: '640',
        videoId: videoIds[currentIndex],
        playerVars: {
            autoplay: 1,
            enablejsapi: 1,
            origin: currentOrigin,
            playsinline: 1,            
            controls: 0,
            rel: 0,
            showinfo: 0
        },
        events: {
            'onStateChange': function (event) {
                if (isManuallySwitching) {
                    if (event.data === YT.PlayerState.BUFFERING) {
                        return;
                    } else if (event.data === YT.PlayerState.PLAYING) {
                        isManuallySwitching = false;
                        toggleBtn.innerText = '⏸️';
                        return;
                    }
                    return;
                }

                switch (event.data) {
                    case YT.PlayerState.BUFFERING:
                        toggleBtn.innerHTML = '<span class="spinner"></span>';
                        break;
                    case YT.PlayerState.PLAYING:
                        toggleBtn.innerText = '⏸️';
                        break;
                    case YT.PlayerState.PAUSED:
                    case YT.PlayerState.ENDED:
                        toggleBtn.innerText = '▶️';
                        if (event.data === YT.PlayerState.ENDED) {
                            toggleBtn.innerHTML = '<span class="spinner"></span>';
                            currentIndex = (currentIndex + 1) % videoIds.length; // boucle circulaire
                            ytPlayer.loadVideoById(videoIds[currentIndex]);
                        }
                        break;
                }
            },
            'onError': function (event) {
                console.warn("Erreur YouTube code :", event.data);
                toggleBtn.innerHTML = '<span class="spinner"></span>';
                console.log("Vidéo en erreur, passage à la suivante");
                if (currentIndex < videoIds.length - 1) {
                    currentIndex++;
                    ytPlayer.loadVideoById(videoIds[currentIndex]);
                }
            }              
        }
    });

    // Récupération des éléments du DOM une fois injectés
    const toggleBtn = document.getElementById('videoToggleBtn');
    const prevBtn = document.getElementById('prevVideoBtn');
    const nextBtn = document.getElementById('nextVideoBtn');

    // Ajout des événements
    toggleBtn.addEventListener('click', function () {
        const state = ytPlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
            ytPlayer.pauseVideo();
        } else {
            ytPlayer.playVideo();
        }
    });

    prevBtn.addEventListener('click', () => {
        console.log("🟡 bouton précédent cliqué");
        isManuallySwitching = true;
        toggleBtn.innerHTML = '<span class="spinner"></span>';
        if (videoIds.length > 0) {
            currentIndex = (currentIndex - 1 + videoIds.length) % videoIds.length;
            ytPlayer.loadVideoById(videoIds[currentIndex]);
        }
    });

    nextBtn.addEventListener('click', () => {
        console.log("🟢 bouton suivant cliqué");
        isManuallySwitching = true;
        toggleBtn.innerHTML = '<span class="spinner"></span>';
        currentIndex = (currentIndex + 1) % videoIds.length; // boucle circulaire
        ytPlayer.loadVideoById(videoIds[currentIndex]);
    });
    
    
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}


async function fetchPlaylistItems(playlistId, pageToken = '') {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${playlistId}&key=${API_KEY}${pageToken ? '&pageToken=' + pageToken : ''}`;
    const res = await fetch(url);
    const data = await res.json();
    data.items.forEach(item => videoIds.push(item.contentDetails.videoId));
    
    if (data.nextPageToken) {
        await fetchPlaylistItems(playlistId, data.nextPageToken);
    } else {
        // Mélanger uniquement après avoir tout récupéré
        shuffleArray(videoIds);
    }
}




