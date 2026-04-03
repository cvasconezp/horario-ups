import React from 'react';
import type { SesionOnline } from '../../types';

interface OnlineSessionsProps {
  sesiones: SesionOnline[];
}

const spanishDays = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const spanishMonths = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const getWeekStartDate = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  return new Date(d.setDate(diff));
};

const formatSpanishDate = (date: Date): string => {
  const dayName = spanishDays[date.getDay()];
  const dayNum = date.getDate();
  const monthName = spanishMonths[date.getMonth()];
  return `${dayName} ${dayNum} de ${monthName}`;
};

const getWeekKey = (date: Date): string => {
  const weekStart = getWeekStartDate(date);
  return weekStart.toISOString().split('T')[0];
};

export const OnlineSessions: React.FC<OnlineSessionsProps> = ({ sesiones }) => {
  // Sort by date and time
  const sortedSesiones = [...sesiones].sort((a, b) => {
    const dateA = new Date(`${a.fecha}T${a.hora}`);
    const dateB = new Date(`${b.fecha}T${b.hora}`);
    return dateA.getTime() - dateB.getTime();
  });

  // Group by week
  const sesioniesByWeek: Record<string, typeof sesiones> = {};
  const weekOrder: string[] = [];

  sortedSesiones.forEach((sesion) => {
    const weekKey = getWeekKey(new Date(sesion.fecha));
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
        const weekStart = new Date(weekKey);
        const weekStartSpanish = formatSpanishDate(weekStart);

        return (
          <div key={weekKey}>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Semana del {weekStartSpanish}</h3>
            <div className="space-y-2">
              {sesionesEnSemana.map((sesion) => {
                const fechaCompleta = new Date(`${sesion.fecha}T${sesion.hora}`);
                const isPast = fechaCompleta < now;
                const isNextUpcoming =
                  !isPast &&
                  sesionesEnSemana.every(
                    (s) => new Date(`${s.fecha}T${s.hora}`) >= fechaCompleta
                  );

                const formattedDate = formatSpanishDate(new Date(sesion.fecha));

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
                          className="text-xs font-semibold px-3 py-1 rounded self-start"
                          style={{
                            backgroundColor: '#bee3f8',
                            color: '#2a4365',
                          }}
                        >
                          {sesion.tipo?.toUpperCase()}
                        </span>
                        {sesion.unidad > 0 && (
                          <span className="text-xs font-semibold px-3 py-1 rounded self-start bg-gray-200 text-gray-800">
                            U.{sesion.unidad}
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
