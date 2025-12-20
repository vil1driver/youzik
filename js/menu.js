// Fonction pour détecter quelle liste est visible
function getVisibleList() {
    const slides = document.querySelectorAll('.swiper-slide');
    for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const hasVisible = slide.classList.contains('swiper-slide-visible');
        const slideIndex = slide.getAttribute('data-swiper-slide-index');
        // Utiliser swiper-slide-visible au lieu de swiper-slide-active
        if (hasVisible) {
            const index = parseInt(slideIndex);
            const listMapping = [
                { key: 'youtubeChannels', class: '.liste1', index: 0 },
                { key: 'radioStations', class: '.liste2', index: 1 },
                { key: 'youtubePlaylists', class: '.liste3', index: 2 }
            ];
            const result = listMapping[index] || listMapping[0];
            return result;
        }
    }
    // Par défaut
    return { key: 'youtubeChannels', class: '.liste1', index: 0 };
}

// Variable pour éviter l'initialisation multiple
let editModeInitialized = false;
// Polling pour attendre que le swiper soit prêt
function waitForSwiper(callback) {
    if (window.swiper && window.swiper.activeIndex !== undefined) {
        callback();
    } else {
        setTimeout(() => waitForSwiper(callback), 100);
    }
}
waitForSwiper(function() {
    if (editModeInitialized) {
        return;
    }
    editModeInitialized = true;
    // Gestion du menu unifié
    const unifiedMenuBtn = document.getElementById("unifiedMenuBtn");
    const unifiedMenu = document.getElementById("unifiedMenu");
    const editModeMenuBtn = document.getElementById("editModeMenuBtn");
    const addItemMenuBtn = document.getElementById("addItemMenuBtn");
    const exportMenuBtn = document.getElementById("exportMenuBtn");
    const importMenuBtn = document.getElementById("importMenuBtn");
    // Ouvrir/Fermer le menu OU sortir du mode édition
    unifiedMenuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        // Si on est en mode édition, cliquer ferme le mode édition
        if (isEditMode) {
            const current = getVisibleList();
            toggleEditMode(current.key, current.class);
        } else {
            // Sinon, ouvrir le menu normalement
            unifiedMenu.classList.toggle("active");
        }
    });
    
    // Fermer le menu en cliquant à l'extérieur
    unifiedMenu.addEventListener("click", (e) => {
        e.stopPropagation();
        if (e.target === unifiedMenu) {
            unifiedMenu.classList.remove("active");
        }
    });

    // Mode édition
    editModeMenuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        const current = getVisibleList();
        toggleEditMode(current.key, current.class);
        unifiedMenu.classList.remove("active");
    });
    
    // Ajouter média
    addItemMenuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        addNewItem();
        unifiedMenu.classList.remove("active");
    });
    
    // Exporter
    exportMenuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        exportDB();
        unifiedMenu.classList.remove("active");
    });
    
    // Importer
    importMenuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        document.getElementById("importFile").click();
        unifiedMenu.classList.remove("active");
    });
});

document.getElementById("importFile").addEventListener("change", function () {
    if (this.files.length > 0) {
        importAndReplaceDB(this.files[0]);
    }
});
