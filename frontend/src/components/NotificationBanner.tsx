import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X } from 'lucide-react';
import type { SesionOnline, SesionPresencial } from '../types';

interface NotificationBannerProps {
  sesionesOnline: SesionOnline[];
  sesionesPresenciales: SesionPresencial[];
}

// Service Worker code as string for inline registration
const SW_CODE = `
var SCHEDULE_DATA = null;

self.addEventListener("install", function(e) { self.skipWaiting(); });
self.addEventListener("activate", function(e) {
  e.waitUntil(self.clients.matchAll().then(function(clients) {
    clients.forEach(function(c) { c.postMessage({type:"SW_READY"}); });
  }));
});

self.addEventListener("message", function(e) {
  if (e.data && e.data.type === "SCHEDULE_DATA") {
    SCHEDULE_DATA = e.data.sessions;
    scheduleChecks();
  }
  if (e.data && e.data.type === "SCHEDULE_CHECK") {
    checkUpcoming();
  }
});

var checkInterval = null;
function scheduleChecks() {
  if (checkInterval) clearInterval(checkInterval);
  checkInterval = setInterval(checkUpcoming, 60000);
  checkUpcoming();
}

function checkUpcoming() {
  if (!SCHEDULE_DATA || SCHEDULE_DATA.length === 0) return;
  var now = new Date();
  SCHEDULE_DATA.forEach(function(ses) {
    var sesTime = new Date(ses.datetime);
    var diffMs = sesTime - now;
    var diffMin = diffMs / 60000;

    if (diffMin > 9 && diffMin <= 10.5) {
      self.registration.showNotification("EIB - Clase en 10 min", {
        body: ses.materia + " a las " + ses.hora,
        icon: "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%231a365d" width="100" height="100" rx="20"/><text x="50" y="65" text-anchor="middle" fill="white" font-size="50" font-family="sans-serif">EIB</text></svg>'),
        tag: "eib-" + ses.datetime,
        requireInteraction: true
      });
    }

    if (diffMin > 4 && diffMin <= 5.5) {
      self.registration.showNotification("EIB - Clase en 5 min!", {
        body: ses.materia + " a las " + ses.hora + " - ¡Ya casi inicia!",
        icon: "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23c53030" width="100" height="100" rx="20"/><text x="50" y="65" text-anchor="middle" fill="white" font-size="50" font-family="sans-serif">EIB</text></svg>'),
        tag: "eib-5-" + ses.datetime,
        requireInteraction: true
      });
    }
  });
}

self.addEventListener("notificationclick", function(e) {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({type:"window"}).then(function(clients) {
      if (clients.length > 0) { clients[0].focus(); }
      else { self.clients.openWindow(self.location.origin); }
    })
  );
});
`;

function buildSessionData(
  sesionesOnline: SesionOnline[],
  sesionesPresenciales: SesionPresencial[]
) {
  const sessions: { materia: string; hora: string; datetime: string; virtual: boolean }[] = [];

  for (const s of sesionesOnline) {
    const fecha = new Date(s.fecha).toISOString().split('T')[0];
    sessions.push({
      materia: s.materia?.nombreCorto || s.materia?.nombre || 'Sesión Online',
      hora: s.hora,
      datetime: `${fecha}T${s.hora}:00`,
      virtual: true,
    });
  }

  for (const s of sesionesPresenciales) {
    const fecha = new Date(s.fecha).toISOString().split('T')[0];
    sessions.push({
      materia: s.materia?.nombreCorto || s.materia?.nombre || 'Sesión Presencial',
      hora: s.horaInicio,
      datetime: `${fecha}T${s.horaInicio}:00`,
      virtual: false,
    });
  }

  return sessions;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  sesionesOnline,
  sesionesPresenciales,
}) => {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [dismissed, setDismissed] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Register service worker on mount
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const blob = new Blob([SW_CODE], { type: 'application/javascript' });
    const swUrl = URL.createObjectURL(blob);

    navigator.serviceWorker
      .register(swUrl, { scope: '/' })
      .then((reg) => {
        setSwRegistration(reg);

        const waitForActive = () => {
          if (reg.active) {
            sendDataToSW(reg);
          }
        };

        if (reg.active) {
          waitForActive();
        } else {
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                waitForActive();
              }
            });
          });
        }
      })
      .catch((err) => {
        console.log('SW registration failed:', err.message);
      });

    return () => {
      URL.revokeObjectURL(swUrl);
    };
  }, []);

  const sendDataToSW = useCallback(
    (reg?: ServiceWorkerRegistration) => {
      const registration = reg || swRegistration;
      if (!registration?.active) return;

      const sessions = buildSessionData(sesionesOnline, sesionesPresenciales);
      registration.active.postMessage({
        type: 'SCHEDULE_DATA',
        sessions,
      });
    },
    [sesionesOnline, sesionesPresenciales, swRegistration]
  );

  // Send updated data whenever sessions change
  useEffect(() => {
    if (permission === 'granted' && swRegistration?.active) {
      sendDataToSW();
    }
  }, [sesionesOnline, sesionesPresenciales, permission, sendDataToSW, swRegistration]);

  const requestPerm = () => {
    Notification.requestPermission().then((p) => {
      setPermission(p);
      if (p === 'granted' && swRegistration?.active) {
        sendDataToSW();
        swRegistration.active.postMessage({ type: 'SCHEDULE_CHECK' });
      }
    });
  };

  // Don't show if: no Notification API, already granted, denied, or dismissed
  if (
    typeof Notification === 'undefined' ||
    permission === 'granted' ||
    permission === 'denied' ||
    dismissed
  ) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 px-4 mb-4 flex items-center gap-3 text-sm">
      <Bell className="text-yellow-500 flex-shrink-0" size={22} />
      <div className="flex-1">
        <strong className="text-gray-900">Recibe recordatorios</strong>
        <p className="text-gray-600 mt-0.5 text-xs">
          Te avisamos antes de cada clase virtual y encuentro presencial
        </p>
      </div>
      <button
        onClick={requestPerm}
        className="bg-blue-600 text-white font-semibold text-xs px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
      >
        Activar
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="text-gray-400 hover:text-gray-600 transition-colors p-1"
      >
        <X size={18} />
      </button>
    </div>
  );
};
