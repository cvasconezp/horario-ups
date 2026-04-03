import React from 'react';
import type { Materia } from '../../types';

interface WeeklyScheduleProps {
  materias: (Materia & {
    docente: { id: number; nombre: string; email: string | null };
    enlaceVirtual: string | null;
  })[];
}

const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

const dayColorMap: Record<string, string> = {
  Lunes: 'border-l-schedule-lunes',
  Martes: 'border-l-schedule-martes',
  Miércoles: 'border-l-schedule-miercoles',
  Jueves: 'border-l-schedule-jueves',
  Viernes: 'border-l-schedule-viernes',
};

const getBimestreLabel = (bimestre: number): string => {
  if (bimestre === 1) return '1er Bimestre';
  if (bimestre === 2) return '2do Bimestre';
  return 'Semestral';
};

const getBimestreColor = (bimestre: number): { bg: string; text: string } => {
  if (bimestre === 1) return { bg: '#bee3f8', text: '#2a4365' };
  if (bimestre === 2) return { bg: '#fefcbf', text: '#744210' };
  return { bg: '#c6f6d5', text: '#22543d' };
};

const getClaseTypeColor = (tipo: string): { bg: string; text: string } => {
  if (tipo?.toUpperCase() === 'TUTORÍA') {
    return { bg: '#c6f6d5', text: '#22543d' };
  }
  return { bg: '#bee3f8', text: '#2a4365' };
};

export const WeeklySchedule: React.FC<WeeklyScheduleProps> = ({ materias }) => {
  // Group materias by day
  const materiasByDay: Record<string, typeof materias> = {};
  daysOfWeek.forEach((day) => {
    materiasByDay[day] = materias.filter((m) => m.dia === day);
  });

  return (
    <div className="space-y-6">
      {daysOfWeek.map((day) => (
        <div key={day} className="space-y-2">
          <h3 className="text-lg font-bold text-gray-900">{day}</h3>
          {materiasByDay[day].length === 0 ? (
            <p className="text-gray-500 text-sm">No hay sesiones para este día</p>
          ) : (
            <div className="space-y-2">
              {materiasByDay[day].map((materia) => {
                const bimestreColor = getBimestreColor(materia.bimestreOC);
                const claseTypeColor = getClaseTypeColor(materia.tipo);
                return (
                  <div
                    key={materia.id}
                    className={`schedule-row border-l-4 ${dayColorMap[day] || 'border-l-gray-400'} pl-4 py-3 mb-2 bg-gray-50 rounded hover:shadow-md transition`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{materia.nombre}</p>
                        <p className="text-sm text-gray-600">{materia.nombreCorto}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {materia.hora} {materia.duracion && `(${materia.duracion}h)`}
                        </p>
                        <p className="text-sm text-gray-600">{materia.docente?.nombre}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {materia.enlaceVirtual && (
                          <a
                            href={materia.enlaceVirtual}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-blue-600 hover:text-blue-800 underline"
                          >
                            Enlace Virtual
                          </a>
                        )}
                        {materia.bimestreOC > 0 && (
                          <span
                            className="text-xs font-semibold px-3 py-1 rounded"
                            style={{ backgroundColor: bimestreColor.bg, color: bimestreColor.text }}
                          >
                            {getBimestreLabel(materia.bimestreOC)}
                          </span>
                        )}
                        {materia.tipo && (
                          <span
                            className="text-xs font-semibold px-3 py-1 rounded"
                            style={{ backgroundColor: claseTypeColor.bg, color: claseTypeColor.text }}
                          >
                            {materia.tipo.toUpperCase()}
                          </span>
                        )}
                        {materia.tutoria && (
                          <span className="badge badge-gray text-xs">{materia.tutoria}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
