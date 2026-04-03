import React, { useState, useEffect } from 'react';
import type { SesionOnline, SesionPresencial } from '../types';

interface NotificationBannerProps {
  sesionesOnline?: SesionOnline[];
  sesionesPresenciales?: SesionPresencial[];
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  sesionesOnline = [],
  sesionesPresenciales = [],
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const DISMISS_KEY = 'notification-banner-dismissed';

  useEffect(() => {
    if ('Notification' in window) {
      const isDismissed = sessionStorage.getItem(DISMISS_KEY) === 'true';
      if (!isDismissed && Notification.permission === 'default') {
        setIsVisible(true);
      }
    }
  }, []);

  const scheduleNotifications = (sesiones: SesionOnline[], presenciales: SesionPresencial[]) => {
    // Schedule browser notifications 10 min before each upcoming session
    const now = new Date();

    const scheduleOne = (title: string, body: string, date: Date) => {
      const msUntil = date.getTime() - now.getTime() - 10 * 60 * 1000; // 10 min before
      if (msUntil > 0 && msUntil < 24 * 60 * 60 * 1000) {
        // Only schedule within next 24h
        setTimeout(() => {
          new Notification(title, { body, icon: '/favicon.ico' });
        }, msUntil);
      }
    };

    sesiones.forEach((s) => {
      const [h, m] = (s.hora || '0:0').split(':').map(Number);
      const fecha = new Date(s.fecha);
      fecha.setHours(h, m, 0, 0);
      scheduleOne(
        `Clase Online: ${s.materia?.nombre || 'Sesión'}`,
        `Comienza a las ${s.hora}`,
        fecha
      );
    });

    presenciales.forEach((s) => {
      const [h, m] = (s.horaInicio || '0:0').split(':').map(Number);
      const fecha = new Date(s.fecha);
      fecha.setHours(h, m, 0, 0);
      scheduleOne(
        `Presencial: ${s.materia?.nombre || 'Sesión'}`,
        `${s.tipo === 'examen' ? 'Examen' : 'Clase'} a las ${s.horaInicio}`,
        fecha
      );
    });
  };

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, 'true');
    setIsVisible(false);
  };

  const handleActivate = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        scheduleNotifications(sesionesOnline, sesionesPresenciales);
      }
      sessionStorage.setItem(DISMISS_KEY, 'true');
      setIsVisible(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center gap-4">
      <div className="text-2xl">🔔</div>
      <div className="flex-1">
        <p className="font-semibold text-blue-900">Recibe recordatorios</p>
        <p className="text-sm text-blue-700">Te avisamos antes de cada clase virtual y encuentro presencial</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleActivate}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          Activar
        </button>
        <button
          onClick={handleDismiss}
          className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
          aria-label="Cerrar banner de notificaciones"
        >
          ×
        </button>
      </div>
    </div>
  );
};
