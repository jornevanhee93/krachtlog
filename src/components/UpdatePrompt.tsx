import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { nl } from '../i18n/nl';

// Toont een melding als er een nieuwe versie klaarstaat, of als de app offline klaar is.
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Elk uur nakijken of er een nieuwe versie is.
      if (registration) setInterval(() => void registration.update(), 60 * 60 * 1000);
    },
  });

  // De melding "werkt offline" verdwijnt vanzelf na 5 seconden.
  useEffect(() => {
    if (!offlineReady) return;
    const t = setTimeout(() => setOfflineReady(false), 5000);
    return () => clearTimeout(t);
  }, [offlineReady, setOfflineReady]);

  if (!needRefresh && !offlineReady) return null;

  const close = () => {
    setNeedRefresh(false);
    setOfflineReady(false);
  };

  return (
    <div className="toast" role="status">
      <p>{needRefresh ? nl.pwa.updateAvailable : nl.pwa.offlineReady}</p>
      <div className="toast-actions">
        {needRefresh && (
          <button className="btn btn-primary" onClick={() => void updateServiceWorker(true)}>
            {nl.pwa.update}
          </button>
        )}
        <button className="btn" onClick={close}>
          {nl.pwa.close}
        </button>
      </div>
    </div>
  );
}
