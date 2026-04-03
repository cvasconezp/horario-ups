import React from 'react';
import type { SesionPresencial } from '../../types';

interface PresencialSessionsProps {
  sesiones: SesionPresencial[];
}

export const PresencialSessions: React.FC<PresencialSessionsProps> = ({ sesiones }) => {
  // Group by bimestre
  const sesioniesByBimestre: Record<number, typeof sesiones> = {};
  sesiones.forEach((sesion) => {
    const bimestre = sesion.bimestre || 0;
    if (!sesioniesByBimestre[bimestre]) {
      sesioniesByBimestre[bimestre] = [];
    }
    sesioniesByBimestre[bimestre].push(sesion);
  });

  const bimestreLabels: Record<number, string> = {
    0: 'Sin bimestre',
    1: 'Bimestre 1',
    2: 'Bimestre 2',
  };

  const getBimestreColor = (bimestre: number): string => {
    if (bimestre === 1) return 'bg-blue-100 border-l-blue-500';
    if (bimestre === 2) return 'bg-yellow-100 border-l-yellow-500';
    return 'bg-gray-100 border-l-gray-500';
  };

  return (
    <div className="space-y-6">
      {Object.entries(sesioniesByBimestre).map(([bimestreStr, sesiones]) => {
        const bimestre = Number(bimestreStr);
        return (
          <div key={bimestre}>
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              {bimestreLabels[bimestre]}
            </h3>
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
                    className={`border-l-4 pl-4 py-3 rounded ${getBimestreColor(
                      bimestre
                    )} hover:shadow-md transition`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase">
                          Fecha
                        </p>
                        <p className="font-medium text-gray-900">{formattedDate}</p>
                        <p className="text-sm text-gray-700">{sesion.diaSemana}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase">
                          Horario
                        </p>
                        <p className="font-medium text-gray-900">
                          {sesion.horaInicio} - {sesion.horaFin}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase">
                          Materia
                        </p>
                        <p className="font-medium text-gray-900">{sesion.materia?.nombre}</p>
                        {sesion.docente && (
                          <p className="text-sm text-gray-600">{sesion.docente.nombre}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase">
                          Centro
                        </p>
                        <p className="font-medium text-gray-900">{sesion.centro?.nombre}</p>
                        {sesion.centro?.zona && (
                          <span className="badge badge-gray text-xs">
                            {sesion.centro.zona}
                          </span>
                        )}
                      </div>
                    </div>
                    {sesion.tipo && (
                      <div className="mt-2">
                        <span className="badge badge-green text-xs">{sesion.tipo}</span>
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
