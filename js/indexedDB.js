const dbName = "MediaDB";
const dbVersion = 1;
const storeName = "lists"; // par exemple

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);

        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName);
            }
        };

        request.onsuccess = event => {
            resolve(event.target.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}


function getAllKeys(db) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const request = store.getAllKeys();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function saveListToDB(db, key, data) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const request = store.put(data, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function importJsonIfEmpty(db) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const request = store.count();
        request.onsuccess = async () => {
            if (request.result === 0) {
                const response = await fetch("list.json");
                const data = await response.json();
                const txWrite = db.transaction(storeName, "readwrite");
                const storeWrite = txWrite.objectStore(storeName);
                for (const key in data) {
                    storeWrite.put(data[key], key);
                }
                txWrite.oncomplete = () => resolve(true); // base remplie
            } else {
                resolve(false); // base déjà remplie
            }
        };
        request.onerror = () => reject(request.error);
    });
}

function getListFromDB(db, key) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function createButtonsFromDB(db, key, className, clickHandler) {
    return new Promise((resolve, reject) => {
        getListFromDB(db, key).then(list => {
            if (!list || !Array.isArray(list)) {
                console.warn(`Aucune liste trouvée pour ${key}`);
                resolve();
                return;
            }

            const container = document.querySelector(className);
            if (!container) {
                reject(`Conteneur non trouvé : ${className}`);
                return;
            }

            container.innerHTML = ''; // On vide avant d'ajouter

            const fragment = document.createDocumentFragment();
            list.forEach(item => {
                if (typeof item[1] !== 'undefined') {
                    const button = document.createElement('button');
                    button.className = 'button';
                    button.textContent = item[1];
                    button.dataset.id = item[0];
                    button.dataset.name = item[1];
                    
                    // UN SEUL événement qui fait les deux actions
                    button.addEventListener('click', () => {
                        // 1. Retirer la classe active de TOUS les boutons de TOUTES les listes
                        document.querySelectorAll('.liste1 .button, .liste2 .button, .liste3 .button').forEach(b => b.classList.remove('active'));
                        // 2. Ajouter la classe active au bouton cliqué
                        button.classList.add('active');
                        // 3. Appeler le handler (loadVideo, loadStream, ou loadPlaylist)
                        clickHandler(item[0]);
                    });
                    
                    fragment.appendChild(button);
                }
            });
            container.appendChild(fragment);


            resolve(); // tout est prêt
        }).catch(err => {
            console.error(`Erreur lors du chargement de ${key} :`, err);
            resolve(); // même en erreur, on résout pour éviter blocage
        });
    });
}


document.addEventListener("DOMContentLoaded", async () => {
    try {
        const db = await openDB();
        await importJsonIfEmpty(db);
        // tu peux aussi appeler ici createButtonsFromDB(...) si tu veux afficher directement après remplissage
        // Maintenant, on peut créer les boutons
        createButtonsFromDB(db, "youtubeChannels", '.liste1', loadVideo);
        createButtonsFromDB(db, "radioStations", '.liste2', loadStream);
        createButtonsFromDB(db, "youtubePlaylists", '.liste3', loadPlaylist);

        document.getElementById("loader").style.display = "none";
    
    } catch (error) {
        console.error("Erreur d'initialisation :", error);
    }
});
