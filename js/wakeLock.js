let wakeLock = null;

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('🟢 WakeLock activé');

      // En cas de perte du verrou (ex : écran mis en veille manuellement)
      wakeLock.addEventListener('release', () => {
        console.log('🔴 WakeLock relâché');
      });
    } else {
      console.warn('WakeLock API non supportée sur ce navigateur');
    }
  } catch (err) {
    console.error(`Erreur WakeLock : ${err.name}, ${err.message}`);
  }
}

// Appeler au début de la lecture par exemple :
requestWakeLock();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && wakeLock !== null) {
    requestWakeLock();  // réactiver
  }
});
