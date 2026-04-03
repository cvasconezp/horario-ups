import React from 'react';
import type { SesionPresencial } from '../../types';
import { parseUTCDate, formatSpanishDate } from '../../utils/dates';

interface PresencialSessionsProps {
  sesiones: SesionPresencial[];
}

const getBimestreLabel = (bimestre: number): string => {
  if (bimestre === 1) return '1er Bimestre';
  if (bimestre === 2) return '2do Bimestre';
  return 'Sin bimestre';
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
      return parseUTCDate(a.fecha).getTime() - parseUTCDate(b.fecha).getTime();
    });
  });

  const bimestreOrder = [1, 2, 0].filter((b) => sesioniesByBimestre[b]);
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
                const fecha = parseUTCDate(sesion.fecha);
                const isPast = fecha < now;
                const formattedDate = formatSpanishDate(fecha);

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
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`text-xs font-semibold px-3 py-1 rounded ${
                            sesion.tipo === 'examen'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {sesion.tipo === 'examen' ? 'EXAMEN' : 'CLASE'}
                        </span>
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
          No hay sesiones presenciales programadas
        </p>
      )}
    </div>
  );
};
