// Gestion du mode édition
let isEditMode = false;
let currentEditList = null;
let draggedElement = null;
let draggedIndex = null;
let touchDragTimeout = null; // Pour le drag mobile
let isTouchDragging = false;

// Fonction pour basculer en mode édition
function toggleEditMode(listKey, listClass) {
    isEditMode = !isEditMode;
    currentEditList = isEditMode ? listKey : null;

    const container = document.querySelector(listClass);
    const menuBtn = document.getElementById('unifiedMenuBtn');
    
    if (!container) {
        console.error('Container non trouvé pour', listClass);
        return;
    }
    
    const buttons = container.querySelectorAll('.button');

    if (isEditMode) {
        // Changer l'icône du menu en mode édition
        menuBtn.textContent = '✅';
        menuBtn.classList.add('edit-mode-active');
        
        // Ajouter les contrôles d'édition à chaque bouton
        buttons.forEach((btn, realIndex) => {
            if (!btn.querySelector('.edit-controls')) {
                const controls = document.createElement('div');
                controls.className = 'edit-controls';
                controls.innerHTML = `
                    <button class="edit-btn" data-index="${realIndex}">✏️</button>
                    <button class="delete-btn" data-index="${realIndex}">❌️</button>
                `;
                btn.appendChild(controls);
                btn.classList.add('edit-mode');
                
                // Rendre le bouton draggable
                btn.setAttribute('draggable', 'true');
                btn.dataset.index = realIndex;
            }
        });

        // Attacher les événements
        attachEditEvents(listKey, listClass);
        attachDragEvents(listKey, listClass);
    } else {
        // Restaurer l'icône du menu
        menuBtn.textContent = '☰';
        menuBtn.classList.remove('edit-mode-active');
        
        // Retirer les contrôles d'édition de TOUTES les listes
        document.querySelectorAll('.liste1, .liste2, .liste3').forEach(list => {
            list.querySelectorAll('.button').forEach(btn => {
                const controls = btn.querySelector('.edit-controls');
                if (controls) {
                    controls.remove();
                }
                btn.classList.remove('edit-mode');
                btn.removeAttribute('draggable');
                btn.removeAttribute('data-index');
            });
        });
    }
}

// Attacher les événements de drag & drop
function attachDragEvents(listKey, listClass) {
    const container = document.querySelector(listClass);
    const buttons = container.querySelectorAll('.button');
    let savedActiveId = null;

    buttons.forEach((btn) => {
        // --- DragStart / DragEnd pour desktop ---
        btn.addEventListener('dragstart', (e) => {
            if (e.target.closest('.edit-btn, .delete-btn')) {
                e.preventDefault(); // empêcher le drag si clic sur edit/delete
                return;
            }
            savedActiveId = container.querySelector('.button.active')?.dataset.id;
            draggedElement = btn;
            btn.classList.add('dragging');
            try { e.dataTransfer.setData('text/plain', 'drag'); } catch {}
            e.dataTransfer.effectAllowed = 'move';
        });

        btn.addEventListener('dragend', () => {
            if (draggedElement) draggedElement.classList.remove('dragging');
            draggedElement = null;
        });

        btn.addEventListener('dragover', (e) => {
            if (!draggedElement || draggedElement === btn) return;
            e.preventDefault();
            const rect = btn.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            if (e.clientY < midpoint) btn.parentNode.insertBefore(draggedElement, btn);
            else btn.parentNode.insertBefore(draggedElement, btn.nextSibling);
        });

        // --- Touch support pour mobile ---
        btn.addEventListener('touchstart', (e) => {
            if (!isEditMode) return;
            if (e.target.closest('.edit-btn, .delete-btn')) return; // empêcher drag sur edit/delete
            e.preventDefault();
            savedActiveId = container.querySelector('.button.active')?.dataset.id;
            draggedElement = btn;
            isTouchDragging = false;
            touchDragTimeout = setTimeout(() => {
                isTouchDragging = true;
                btn.classList.add('dragging');
            }, 50);
        });

        btn.addEventListener('touchmove', (e) => {
            if (!isEditMode || !isTouchDragging || !draggedElement) return;
            e.preventDefault();
            const touch = e.touches[0];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            if (!target || !target.classList.contains('button') || target === draggedElement) return;
            const rect = target.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            if (touch.clientY < midpoint) target.parentNode.insertBefore(draggedElement, target);
            else target.parentNode.insertBefore(draggedElement, target.nextSibling);
        });

        btn.addEventListener('touchend', async (e) => {
            clearTimeout(touchDragTimeout);
        
            if (draggedElement) draggedElement.classList.remove('dragging');
        
            // --- SAUVEGARDE MOBILE ---
            if (isTouchDragging && draggedElement) {
                try {
                    const buttonsNow = container.querySelectorAll('.button');
                    const newOrder = Array.from(buttonsNow).map(btn => [
                        btn.dataset.id ?? btn.getAttribute('data-id') ?? btn.textContent.trim(),
                        btn.dataset.name ?? btn.getAttribute('data-name') ?? btn.textContent.trim()
                    ]);
        
                    const db = await openDB();
                    await saveListToDB(db, listKey, newOrder);
                    console.log('[touchend] ordre sauvegardé ->', newOrder);
        
                    refreshList(listKey, listClass, savedActiveId);
                } catch (err) {
                    console.error('[touchend] erreur sauvegarde ordre', err);
                    Swal.fire('Erreur', 'Impossible de sauvegarder l’ordre après le déplacement.', 'error');
                }
            }
        
            draggedElement = null;
            isTouchDragging = false;
        });

    });

    // --- DROP sur le conteneur entier ---
    if (container._dropHandler) container.removeEventListener('drop', container._dropHandler);

    container._dropHandler = async (e) => {
        e.preventDefault();
        try {
            const buttonsNow = container.querySelectorAll('.button');
            const newOrder = Array.from(buttonsNow).map(btn => [
                btn.dataset.id ?? btn.getAttribute('data-id') ?? btn.textContent.trim(),
                btn.dataset.name ?? btn.getAttribute('data-name') ?? btn.textContent.trim()
            ]);

            console.log('[drop] newOrder ->', newOrder);

            const db = await openDB();
            await saveListToDB(db, listKey, newOrder);
            console.log('[drop] saveListToDB ok');

            refreshList(listKey, listClass, savedActiveId);
        } catch (err) {
            console.error('[drop] erreur sauvegarde ordre', err);
            Swal.fire('Erreur', 'Impossible de sauvegarder l’ordre après le déplacement.', 'error');
        } finally {
            if (draggedElement) draggedElement.classList.remove('dragging');
            draggedElement = null;
        }
    };

    container.addEventListener('drop', container._dropHandler);
    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });
}

// Attacher les événements d'édition et suppression
function attachEditEvents(listKey, listClass) {
    const container = document.querySelector(listClass);
    const buttons = container.querySelectorAll('.button');

    // Recalculer les index en fonction de la position réelle
    buttons.forEach((parentBtn, realIndex) => {
        const editBtn = parentBtn.querySelector('.edit-btn');
        const deleteBtn = parentBtn.querySelector('.delete-btn');
        
        if (editBtn) {
            editBtn.dataset.index = realIndex;
            editBtn.onclick = (e) => {
                e.stopPropagation();
                const index = parseInt(editBtn.dataset.index);
                openEditDialog(listKey, listClass, index);
            };
        }
        
        if (deleteBtn) {
            deleteBtn.dataset.index = realIndex;
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                const index = parseInt(deleteBtn.dataset.index);
                confirmDelete(listKey, listClass, index);
            };
        }
    });
}

// Ouvrir la boîte de dialogue d'édition
async function openEditDialog(listKey, listClass, index) {
    const db = await openDB();
    const list = await getListFromDB(db, listKey);

    if (!list || !list[index]) {
        Swal.fire('Erreur', 'Élément introuvable', 'error');
        return;
    }

    const [id, name] = list[index];
    const isPlaylist = listKey === 'youtubePlaylists';
    const isRadio = listKey === 'radioStations';

    const inputLabel = isRadio ? 'URL du flux' : (isPlaylist ? 'ID Playlist (ou URL)' : 'ID Vidéo (ou URL)');
    const inputPlaceholder = isRadio ? 'https://...' : (isPlaylist ? 'PLxxx... ou URL complète' : 'dQw4w9WgXcQ ou URL complète');

    const result = await Swal.fire({
        title: 'Modifier l\'élément',
        html: `
            <input id="swal-input1" class="swal2-input" placeholder="${inputPlaceholder}" value="${id}">
            <input id="swal-input2" class="swal2-input" placeholder="Nom" value="${name}">
            <div id="type-indicator" style="margin-top: 10px; color: #666;"></div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Sauvegarder',
        cancelButtonText: 'Annuler',
        customClass: {
            confirmButton: 'swal-confirm-button',
            cancelButton: 'swal-cancel-button'
        },
        didOpen: () => {
            const input1 = document.getElementById('swal-input1');
            const typeIndicator = document.getElementById('type-indicator');
            
            // Afficher le type détecté en temps réel
            input1.addEventListener('input', () => {
                const value = input1.value.trim();
                const detectedType = detectContentType(value);
                
                // Avertir si le type change
                if (detectedType && detectedType !== listKey) {
                    typeIndicator.textContent = '⚠️ Attention : type différent détecté !';
                    typeIndicator.style.color = '#f44336';
                } else if (detectedType === listKey) {
                    typeIndicator.textContent = '✅ Type correct';
                    typeIndicator.style.color = '#4CAF50';
                } else if (value) {
                    typeIndicator.textContent = '❓ Type non reconnu';
                    typeIndicator.style.color = '#999';
                } else {
                    typeIndicator.textContent = '';
                }
            });
        },
        preConfirm: () => {
            const newId = document.getElementById('swal-input1').value.trim();
            const newName = document.getElementById('swal-input2').value.trim();

            if (!newId || !newName) {
                Swal.showValidationMessage('Tous les champs sont requis');
                return false;
            }

            const detectedType = detectContentType(newId);
            if (detectedType && detectedType !== listKey) {
                Swal.showValidationMessage('Le type de contenu ne correspond pas à cette liste');
                return false;
            }

            return { newId: extractId(newId, listKey), newName };
        }
    });

    if (result.isConfirmed) {
        list[index] = [result.value.newId, result.value.newName];
        await saveListToDB(db, listKey, list);
        refreshList(listKey, listClass);
        Swal.fire('Modifié !', 'L\'élément a été mis à jour', 'success');
    }
}

// Extraire l'ID depuis une URL ou retourner l'ID directement
function extractId(input, listKey) {
    if (!input) return input;

    // Pour les radios, retourner l'URL complète
    if (listKey === 'radioStations') {
        return input;
    }

    // Pour YouTube (vidéos et playlists)
    // Extraire depuis URL si c'est une URL
    if (input.includes('youtube.com') || input.includes('youtu.be')) {
        if (listKey === 'youtubePlaylists') {
            const match = input.match(/[?&]list=([^&]+)/);
            return match ? match[1] : input;
        } else {
            // Vidéo YouTube
            let match = input.match(/[?&]v=([^&]+)/);
            if (!match) match = input.match(/youtu\.be\/([^?]+)/);
            return match ? match[1] : input;
        }
    }

    return input;
}

// Confirmer la suppression
async function confirmDelete(listKey, listClass, index) {
    const db = await openDB();
    const list = await getListFromDB(db, listKey);

    if (!list || !list[index]) return;

    const result = await Swal.fire({
        title: 'Supprimer ?',
        text: `Voulez-vous vraiment supprimer "${list[index][1]}" ?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Supprimer',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#d33',
        customClass: {
            confirmButton: 'swal-confirm-button',
            cancelButton: 'swal-cancel-button'
        }
    });

    if (result.isConfirmed) {
        list.splice(index, 1);
        await saveListToDB(db, listKey, list);
        refreshList(listKey, listClass);
        Swal.fire('Supprimé !', 'L\'élément a été supprimé', 'success');
    }
}

// Détecter automatiquement le type de contenu selon l'URL
function detectContentType(url) {
    if (!url) return null;
    
    // Web radio : URL HTTP/HTTPS qui n'est pas YouTube
    if ((url.startsWith('http://') || url.startsWith('https://')) && 
        !url.includes('youtube.com') && !url.includes('youtu.be')) {
        return 'radioStations';
    }
    
    // Playlist YouTube
    if (url.includes('list=') || url.startsWith('PL') || url.startsWith('UU') || 
        url.startsWith('FL') || url.startsWith('RD')) {
        return 'youtubePlaylists';
    }
    
    // Vidéo YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be') || 
        url.match(/^[a-zA-Z0-9_-]{11}$/)) {
        return 'youtubeChannels';
    }
    
    return null;
}

// Ajouter un nouvel élément avec détection automatique
async function addNewItem() {
    const result = await Swal.fire({
        title: 'Ajouter un élément',
        html: `
            <input id="swal-input1" class="swal2-input" placeholder="URL ou ID">
            <input id="swal-input2" class="swal2-input" placeholder="Nom">
            <div id="type-indicator" style="margin-top: 10px; color: #666;"></div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Ajouter',
        cancelButtonText: 'Annuler',
        customClass: {
            confirmButton: 'swal-confirm-button',
            cancelButton: 'swal-cancel-button'
        },
        didOpen: () => {
            const input1 = document.getElementById('swal-input1');
            const typeIndicator = document.getElementById('type-indicator');
            
            // Afficher le type détecté en temps réel
            input1.addEventListener('input', () => {
                const value = input1.value.trim();
                const detectedType = detectContentType(value);
                
                if (detectedType === 'radioStations') {
                    typeIndicator.textContent = '📻 Radio détectée';
                    typeIndicator.style.color = '#2196F3';
                } else if (detectedType === 'youtubePlaylists') {
                    typeIndicator.textContent = '📋 Playlist YouTube détectée';
                    typeIndicator.style.color = '#FF5722';
                } else if (detectedType === 'youtubeChannels') {
                    typeIndicator.textContent = '🎬 Vidéo YouTube détectée';
                    typeIndicator.style.color = '#4CAF50';
                } else if (value) {
                    typeIndicator.textContent = '❓ Type non reconnu';
                    typeIndicator.style.color = '#999';
                } else {
                    typeIndicator.textContent = '';
                }
            });
        },
        preConfirm: () => {
            const url = document.getElementById('swal-input1').value.trim();
            const name = document.getElementById('swal-input2').value.trim();

            if (!url || !name) {
                Swal.showValidationMessage('Tous les champs sont requis');
                return false;
            }

            const detectedType = detectContentType(url);
            if (!detectedType) {
                Swal.showValidationMessage('Type de contenu non reconnu. Vérifiez l\'URL.');
                return false;
            }

            return { url, name, detectedType };
        }
    });

    if (result.isConfirmed) {
        const { url, name, detectedType } = result.value;
        const db = await openDB();
        const list = await getListFromDB(db, detectedType) || [];
        
        const extractedId = extractId(url, detectedType);
        list.push([extractedId, name]);
        await saveListToDB(db, detectedType, list);
        
        // Rafraîchir la liste correspondante
        const listClass = detectedType === 'youtubeChannels' ? '.liste1' : 
                         (detectedType === 'radioStations' ? '.liste2' : '.liste3');
        refreshList(detectedType, listClass);
        
        const typeName = detectedType === 'radioStations' ? 'radio' : 
                        (detectedType === 'youtubePlaylists' ? 'playlist' : 'vidéo');
        Swal.fire('Ajouté !', `La ${typeName} a été ajoutée`, 'success');
    }
}

// Rafraîchir l'affichage de la liste
function refreshList(listKey, listClass, preserveActiveId = null) {
    const wasEditMode = isEditMode && currentEditList === listKey;
    const container = document.querySelector(listClass);
    
    // Sauvegarder l'élément actif (en surbrillance) avant refresh
    const activeId = preserveActiveId || (container.querySelector('.button.active') && container.querySelector('.button.active').dataset.id) || null;

    // Supprimer tous les event listeners en clonant et remplaçant le conteneur
    const newContainer = container.cloneNode(false);
    container.parentNode.replaceChild(newContainer, container);

    const clickHandler = listKey === 'youtubeChannels' ? loadVideo :
                        (listKey === 'radioStations' ? loadStream : loadPlaylist);

    openDB().then(db => {
        // On suppose que createButtonsFromDB est asynchrone et retourne une Promise
        createButtonsFromDB(db, listKey, listClass, clickHandler).then(() => {

            const updatedContainer = document.querySelector(listClass);
            const buttons = updatedContainer.querySelectorAll('.button');

            // Restaurer le bouton actif
            if (activeId) {
                const btnToActivate = Array.from(buttons).find(btn => btn.dataset.id === activeId);
                if (btnToActivate) btnToActivate.classList.add('active');
            }

            // Réactiver le mode édition si besoin
            if (wasEditMode) {
                const editBtn = document.getElementById('editModeBtn');
                if (editBtn) {
                    editBtn.textContent = '✅';
                    editBtn.classList.add('active');
                }

                buttons.forEach((btn, realIndex) => {
                    if (!btn.querySelector('.edit-controls')) {
                        const controls = document.createElement('div');
                        controls.className = 'edit-controls';
                        controls.innerHTML = `
                            <button class="edit-btn" data-index="${realIndex}">✏️</button>
                            <button class="delete-btn" data-index="${realIndex}">❌️</button>
                        `;
                        btn.appendChild(controls);
                        btn.classList.add('edit-mode');
                        btn.setAttribute('draggable', 'true');
                        btn.dataset.index = realIndex;
                    }
                });

                attachEditEvents(listKey, listClass);
                attachDragEvents(listKey, listClass);
            }
        });
    });
}



// Initialisation au chargement de la page
document.addEventListener("DOMContentLoaded", () => {

    // Désactiver le mode édition lors du changement de slide
    if (window.swiper) {
        window.swiper.on('slideChange', () => {
            if (isEditMode) {
                // Restaurer l'icône du menu
                const menuBtn = document.getElementById('unifiedMenuBtn');
                if (menuBtn) {
                    menuBtn.textContent = '☰';
                    menuBtn.classList.remove('edit-mode-active');
                }
                
                // Retirer les contrôles d'édition de TOUTES les listes
                document.querySelectorAll('.liste1, .liste2, .liste3').forEach(list => {
                    list.querySelectorAll('.button').forEach(btn => {
                        const controls = btn.querySelector('.edit-controls');
                        if (controls) {
                            controls.remove();
                        }
                        btn.classList.remove('edit-mode');
                    });
                });
                
                // Désactiver le mode édition
                isEditMode = false;
                currentEditList = null;
            }
        });
    }
});
