import React from 'react';
import type { CalendarioEvento } from '../../types';

interface AcademicCalendarProps {
  eventos: CalendarioEvento[];
}

export const AcademicCalendar: React.FC<AcademicCalendarProps> = ({ eventos }) => {
  // Sort by date
  const sortedEventos = [...eventos].sort((a, b) => {
    const dateA = new Date(a.fecha);
    const dateB = new Date(b.fecha);
    return dateA.getTime() - dateB.getTime();
  });

  const getTypeColor = (tipo: string): string => {
    const tipo_lower = tipo.toLowerCase();
    if (tipo_lower.includes('feriado') || tipo_lower.includes('vacaciones'))
      return 'bg-red-100 border-l-red-500 text-red-900';
    if (tipo_lower.includes('examen'))
      return 'bg-purple-100 border-l-purple-500 text-purple-900';
    if (tipo_lower.includes('evaluacion'))
      return 'bg-orange-100 border-l-orange-500 text-orange-900';
    if (tipo_lower.includes('entrega'))
      return 'bg-blue-100 border-l-blue-500 text-blue-900';
    return 'bg-gray-100 border-l-gray-500 text-gray-900';
  };

  // Group by month
  const eventosByMonth: Record<string, typeof eventos> = {};
  sortedEventos.forEach((evento) => {
    const monthKey = new Date(evento.fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
    });
    if (!eventosByMonth[monthKey]) {
      eventosByMonth[monthKey] = [];
    }
    eventosByMonth[monthKey].push(evento);
  });

  return (
    <div className="space-y-6">
      {Object.entries(eventosByMonth).map(([month, eventos]) => (
        <div key={month}>
          <h3 className="text-lg font-bold text-gray-900 mb-3 capitalize">{month}</h3>
          <div className="space-y-2">
            {eventos.map((evento) => {
              const fechaInicio = new Date(evento.fecha);
              const formattedDate = fechaInicio.toLocaleDateString('es-ES', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });

              let formattedEnd = '';
              if (evento.fechaFin && evento.fechaFin !== evento.fecha) {
                const fechaFin = new Date(evento.fechaFin);
                formattedEnd = ' - ' + fechaFin.toLocaleDateString('es-ES', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                });
              }

              return (
                <div
                  key={evento.id}
                  className={`border-l-4 pl-4 py-3 rounded ${getTypeColor(evento.tipo)} hover:shadow-md transition`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase opacity-75">Fecha</p>
                      <p className="font-medium">
                        {formattedDate}
                        {formattedEnd}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase opacity-75">Tipo</p>
                      <span className="inline-block badge text-xs font-semibold">
                        {evento.tipo}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase opacity-75">Descripción</p>
                      <p>{evento.nota || '-'}</p>
                    </div>
                  </div>
                  {evento.bimestre && (
                    <div className="mt-2">
                      <span className="badge badge-blue text-xs">
                        Bimestre {evento.bimestre}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {eventos.length === 0 && (
        <p className="text-gray-500 text-center py-8">
          No hay eventos en el calendario académico
        </p>
      )}
    </div>
  );
};
