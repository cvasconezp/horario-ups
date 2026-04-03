import React from 'react';
import type { SesionPresencial } from '../../types';

interface PresencialSessionsProps {
  sesiones: SesionPresencial[];
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

const formatSpanishDate = (date: Date): string => {
  const dayName = spanishDays[date.getDay()];
  const dayNum = date.getDate();
  const monthName = spanishMonths[date.getMonth()];
  return `${dayName} ${dayNum} de ${monthName}`;
};

const getBimestreLabel = (bimestre: number): string => {
  if (bimestre === 1) return '1er Bimestre';
  if (bimestre === 2) return '2do Bimestre';
  return 'Sin bimestre';
};

const getTypeColor = (tipo: string): { bg: string; text: string } => {
  if (tipo?.toUpperCase() === 'EXAMEN') {
    return { bg: '#fed7d7', text: '#9b2c2c' };
  }
  return { bg: '#bee3f8', text: '#2a4365' };
};

export const PresencialSessions: React.FC<PresencialSessionsProps> = ({ sesiones }) => {
  // Group by bimestre and sort within each bimestre
  const sesioniesByBimestre: Record<number, typeof sesiones> = {};
  sesiones.forEach((sesion) => {
    const bimestre = sesion.bimestre || 0;
    if (!sesioniesByBimestre[bimestre]) {
      sesioniesByBimestre[bimestre] = [];
    }
    sesioniesByBimestre[bimestre].push(sesion);
  });

  // Sort each bimestre by date
  Object.keys(sesioniesByBimestre).forEach((bimestreKey) => {
    sesioniesByBimestre[Number(bimestreKey)].sort((a, b) => {
      const dateA = new Date(a.fecha);
      const dateB = new Date(b.fecha);
      return dateA.getTime() - dateB.getTime();
    });
  });

  const bimestreOrder = [1, 2, 0].filter((b) => sesioniesByBimestre[b]);

  // Get the current time for fading past sessions
  const now = new Date();

  return (
    <div className="space-y-6">
      {bimestreOrder.map((bimestre) => {
        const sesionesEnBimestre = sesioniesByBimestre[bimestre];
        return (
          <div key={bimestre}>
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              {getBimestreLabel(bimestre)}
            </h3>
            <div className="space-y-2">
              {sesionesEnBimestre.map((sesion) => {
                const fecha = new Date(sesion.fecha);
                const isPast = fecha < now;
                const formattedDate = formatSpanishDate(fecha);
                const typeColor = getTypeColor(sesion.tipo);

                return (
                  <div
                    key={sesion.id}
                    className={`border-l-4 pl-4 py-3 rounded transition ${
                      isPast ? 'opacity-50 bg-gray-100 border-l-gray-500' : 'bg-white border-l-blue-500 hover:shadow-md'
                    }`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase">Fecha</p>
                        <p className="font-medium text-gray-900">{formattedDate}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase">Horario</p>
                        <p className="font-medium text-gray-900">
                          {sesion.horaInicio} - {sesion.horaFin}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase">Materia</p>
                        <p className="font-medium text-gray-900">{sesion.materia?.nombre}</p>
                        {sesion.docente && (
                          <p className="text-sm text-gray-600">{sesion.docente.nombre}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase">Centro</p>
                        <p className="font-medium text-gray-900">{sesion.centro?.nombre}</p>
                        {sesion.centro?.zona && (
                          <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-200 text-gray-800">
                            {sesion.centro.zona}
                          </span>
                        )}
                      </div>
                    </div>
                    {sesion.tipo && (
                      <div className="mt-2">
                        <span
                          className="text-xs font-semibold px-3 py-1 rounded"
                          style={{ backgroundColor: typeColor.bg, color: typeColor.text }}
                        >
                          {sesion.tipo.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {sesiones.length === 0 && (
        <p className="text-gray-500 text-center py-8">
          No hay sesiones presenciales programadas
        </p>
      )}
    </div>
  );
};
