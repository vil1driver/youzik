if ('serviceWorker' in navigator) {  
    window.addEventListener('load', function() {
        // Enregistrement du service worker avec portée relative au dossier courant
        navigator.serviceWorker.register('service-worker.js', { scope: './' }).then(function(registration) {
            console.log("Enregistrement du service worker réussi pour le périmètre : ", registration.scope);
            
            // Vérifie si c'est le premier accès
            let isFirstInstall = localStorage.getItem('sw_installed') === null;

            // Écoute des messages envoyés par le service worker
            navigator.serviceWorker.addEventListener('message', function(event) {
                if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
                    if (!isFirstInstall) {
                        Swal.fire({
                            title: 'Mise à jour disponible',
                            text: 'Voulez-vous recharger la page pour l\'appliquer ?',
                            imageUrl: "images/youzic-256.png",
                            showCancelButton: true,
                            confirmButtonText: 'Recharger',
                            cancelButtonText: 'Plus tard',
                            customClass: {
                                title: 'swal-title',
                                htmlContainer: 'swal-text',
                                confirmButton: 'swal-confirm-button',
                                cancelButton: 'swal-cancel-button'
                            },
                            backdrop: "rgba(0,0,0,0.6)",
                            allowOutsideClick: false,
                            allowEscapeKey: false,
                            focusConfirm: true
                        }).then((result) => {
                            if (result.isConfirmed) {
                                window.location.reload();
                            }
                        });
                    } else {
                        localStorage.setItem('sw_installed', 'true');
                    }
                }
            });

        }, function(err) {
            console.log("Échec de l'enregistrement du service worker: ", err);
        });
    });
}
