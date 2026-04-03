import React from 'react';
import type { SesionOnline } from '../../types';
import { parseUTCDate, formatSpanishDate, getWeekKey, getWeekStartDate } from '../../utils/dates';

interface OnlineSessionsProps {
  sesiones: SesionOnline[];
}

export const OnlineSessions: React.FC<OnlineSessionsProps> = ({ sesiones }) => {
  // Sort by date and time
  const sortedSesiones = [...sesiones].sort((a, b) => {
    const dateA = parseUTCDate(a.fecha);
    const dateB = parseUTCDate(b.fecha);
    if (dateA.getTime() !== dateB.getTime()) return dateA.getTime() - dateB.getTime();
    return (a.hora || '').localeCompare(b.hora || '');
  });

  // Group by week
  const sesioniesByWeek: Record<string, typeof sesiones> = {};
  const weekOrder: string[] = [];

  sortedSesiones.forEach((sesion) => {
    const weekKey = getWeekKey(parseUTCDate(sesion.fecha));
    if (!sesioniesByWeek[weekKey]) {
      sesioniesByWeek[weekKey] = [];
      weekOrder.push(weekKey);
    }
    sesioniesByWeek[weekKey].push(sesion);
  });

  // Get the current time for highlighting upcoming sessions
  const now = new Date();

  return (
    <div className="space-y-6">
      {weekOrder.map((weekKey) => {
        const sesionesEnSemana = sesioniesByWeek[weekKey];
        const weekStart = getWeekStartDate(parseUTCDate(sesionesEnSemana[0].fecha));
        const weekStartSpanish = formatSpanishDate(weekStart);

        return (
          <div key={weekKey}>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Semana del {weekStartSpanish}</h3>
            <div className="space-y-2">
              {sesionesEnSemana.map((sesion) => {
                const fechaSesion = parseUTCDate(sesion.fecha);
                const isPast = fechaSesion < now;
                const isNextUpcoming =
                  !isPast &&
                  sortedSesiones.filter((s) => parseUTCDate(s.fecha) >= now)[0]?.id === sesion.id;

                const formattedDate = formatSpanishDate(fechaSesion);

                return (
                  <div
                    key={sesion.id}
                    className={`rounded-lg p-4 transition ${
                      isPast
                        ? 'opacity-50 bg-gray-50 border border-gray-200'
                        : isNextUpcoming
                          ? 'border-l-4 border-l-blue-600 bg-blue-50 border border-blue-200'
                          : 'bg-white border border-gray-200'
                    } hover:shadow-md`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase">Fecha</p>
                        <p className="font-medium text-gray-900">{formattedDate}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase">Hora</p>
                        <p className="font-medium text-gray-900">{sesion.hora}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase">Materia</p>
                        <p className="font-medium text-gray-900">{sesion.materia?.nombre}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <span
                          className={`text-xs font-semibold px-3 py-1 rounded self-start ${
                            sesion.tipo === 'tutoria'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {sesion.tipo === 'tutoria' ? 'TUTORÍA' : 'CLASE'}
                        </span>
                        {sesion.unidad > 0 && (
                          <span className="text-xs font-semibold px-3 py-1 rounded self-start bg-gray-200 text-gray-800">
                            U.{sesion.unidad}
                          </span>
                        )}
                        {sesion.grupo && (
                          <span className="text-xs font-semibold px-3 py-1 rounded self-start bg-green-100 text-green-800">
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
        );
      })}

      {sesiones.length === 0 && (
        <p className="text-gray-500 text-center py-8">
          No hay sesiones online programadas
        </p>
      )}
    </div>
  );
};
