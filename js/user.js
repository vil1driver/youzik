function stringifySingleLineArrays(obj) {
    const json = JSON.stringify(obj, null, 2);

    // Remplace les tableaux imbriqués formatés sur plusieurs lignes par une version une-ligne
    return json.replace(/\[\s*\n\s*("(?:[^"]|\\")*?"(?:,\s*"(?:[^"]|\\")*?")*)\s*\n\s*\]/g, (match, inner) => {
        return `[${inner.replace(/\n\s*/g, ' ')}]`;
    });
}

async function exportDB() {
    const db = await openDB();
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const allData = {};

    const request = store.openCursor();
    request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
            allData[cursor.key] = cursor.value;
            cursor.continue();
        } else {
            // Remplacement : plus de Blob, on encode dans une URL data:
            const json = stringifySingleLineArrays(allData);
            const encodedData = encodeURIComponent(json);
            const dataUrl = `data:application/json;charset=utf-8,${encodedData}`;

            const now = new Date();
            const pad = num => String(num).padStart(2, '0');
            const fileName = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}-youzik-backup.json`;

            const a = document.createElement("a");
            a.href = dataUrl;
            a.download = fileName;

            // Nécessaire sur WebView : ajouter à DOM puis clic
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    request.onerror = () => {
        console.error("Erreur lors de l'exportation :", request.error);
        Swal.fire({
            title: 'Erreur',
            text: "Erreur lors de l'export.",
            icon: 'error',
            confirmButtonText: 'OK'
        });
    };
}


async function importAndReplaceDB(file) {
    const db = await openDB();

    // Lire le fichier
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const json = JSON.parse(event.target.result);

            // Vider la base
            const clearTx = db.transaction(storeName, "readwrite");
            const clearStore = clearTx.objectStore(storeName);
            clearStore.clear();
            await new Promise(res => clearTx.oncomplete = res);

            // Réécrire les données
            const writeTx = db.transaction(storeName, "readwrite");
            const writeStore = writeTx.objectStore(storeName);
            for (const key in json) {
                writeStore.put(json[key], key);
            }
            writeTx.oncomplete = () => {
                Swal.fire({
                    title: 'Importation réussie !',
                    icon: 'success',
                    confirmButtonText: 'OK'
                }).then(() => {
                    location.reload(); // Recharge pour mettre à jour l'affichage
                });
            };
        } catch (e) {
            console.error("Fichier invalide :", e);
            Swal.fire({
                title: 'Erreur',
                text: "Le fichier n'est pas un JSON valide.",
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    };

    reader.readAsText(file);
}