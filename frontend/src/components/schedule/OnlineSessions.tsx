import React from 'react';
import type { SesionOnline } from '../../types';

interface OnlineSessionsProps {
  sesiones: SesionOnline[];
}

export const OnlineSessions: React.FC<OnlineSessionsProps> = ({ sesiones }) => {
  // Sort by date and time
  const sortedSesiones = [...sesiones].sort((a, b) => {
    const dateA = new Date(`${a.fecha}T${a.hora}`);
    const dateB = new Date(`${b.fecha}T${b.hora}`);
    return dateA.getTime() - dateB.getTime();
  });

  // Group by month
  const sesioniesByMonth: Record<string, typeof sesiones> = {};
  sortedSesiones.forEach((sesion) => {
    const monthKey = new Date(sesion.fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
    });
    if (!sesioniesByMonth[monthKey]) {
      sesioniesByMonth[monthKey] = [];
    }
    sesioniesByMonth[monthKey].push(sesion);
  });

  return (
    <div className="space-y-6">
      {Object.entries(sesioniesByMonth).map(([month, sesiones]) => (
        <div key={month}>
          <h3 className="text-lg font-bold text-gray-900 mb-3 capitalize">{month}</h3>
          <div className="space-y-2">
            {sesiones.map((sesion) => {
              const fecha = new Date(sesion.fecha);
              const formattedDate = fecha.toLocaleDateString('es-ES', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={sesion.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Fecha</p>
                      <p className="font-medium text-gray-900">{formattedDate}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Hora</p>
                      <p className="font-medium text-gray-900">{sesion.hora}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Materia</p>
                      <p className="font-medium text-gray-900">{sesion.materia?.nombre}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="badge badge-blue text-xs self-start">
                        {sesion.tipo}
                      </span>
                      {sesion.unidad > 0 && (
                        <span className="badge badge-gray text-xs self-start">
                          Unidad {sesion.unidad}
                        </span>
                      )}
                      {sesion.grupo && (
                        <span className="badge badge-green text-xs self-start">
                          {sesion.grupo}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {sesiones.length === 0 && (
        <p className="text-gray-500 text-center py-8">
          No hay sesiones online programadas
        </p>
      )}
    </div>
  );
};
