import React from 'react';
import type { Materia, SesionPresencial, CalendarioEvento } from '../../types';
import { Calendar, Clock } from 'lucide-react';

interface WeeklyScheduleProps {
  materias: (Materia & {
    docente: { id: number; nombre: string; email: string | null };
    enlaceVirtual: string | null;
  })[];
  presenciales?: SesionPresencial[];
  eventos?: CalendarioEvento[];
  centroId?: number;
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

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const day = date.getDate();
  const monthIndex = date.getMonth();
  const months = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
  ];
  return `${day} ${months[monthIndex]}`;
};

const getZonaBimestre = (centroId: number | undefined, materia: any): number => {
  if (!centroId) {
    return materia.bimestreOC ?? materia.bimestreRL ?? 0;
  }
  // Zona Norte: centroId 2, 3, 5, 6 -> use bimestreOC
  // Zona Sur: centroId 1, 4 -> use bimestreRL
  const isZonaNorte = [2, 3, 5, 6].includes(centroId);
  if (isZonaNorte) {
    return materia.bimestreOC ?? 0;
  } else {
    return materia.bimestreRL ?? 0;
  }
};

const getPresencialTypeColor = (tipo: string): { bg: string; text: string } => {
  const tipoUpper = tipo?.toUpperCase() || '';
  if (tipoUpper === 'EXAMEN') {
    return { bg: '#fed7d7', text: '#742a2a' };
  }
  if (tipoUpper === 'CLASE') {
    return { bg: '#bee3f8', text: '#2a4365' };
  }
  return { bg: '#e6f3ff', text: '#1e3a5f' };
};

const getEventTypeColor = (tipo: string): { bg: string; text: string } => {
  const tipoLower = tipo?.toLowerCase() || '';
  if (tipoLower.includes('fin')) {
    return { bg: '#fbd38d', text: '#744210' };
  }
  if (tipoLower.includes('inicio')) {
    return { bg: '#c6f6d5', text: '#22543d' };
  }
  if (tipoLower.includes('entrega')) {
    return { bg: '#bee3f8', text: '#2a4365' };
  }
  return { bg: '#e6e6fa', text: '#2d2d4d' };
};

const isFutureDate = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
};

export const WeeklySchedule: React.FC<WeeklyScheduleProps> = ({
  materias,
  presenciales = [],
  eventos = [],
  centroId,
}) => {
  // Filter out 2do bimestre materias (not yet confirmed) and group by day
  const filteredMaterias = materias.filter((m) => {
    const bim = getZonaBimestre(centroId, m);
    // Hide 2do bimestre materias — schedule not confirmed yet
    return bim !== 2;
  });

  const materiasByDay: Record<string, typeof materias> = {};
  daysOfWeek.forEach((day) => {
    materiasByDay[day] = filteredMaterias.filter((m) => m.dia === day);
  });

  // Get upcoming presencial sessions (next 5, sorted by date)
  const upcomingPresenciales = presenciales
    .filter((p) => isFutureDate(p.fecha))
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .slice(0, 5);

  // Get upcoming calendar events (next 5, sorted by date)
  const upcomingEventos = eventos
    .filter((e) => isFutureDate(e.fecha))
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Weekly Schedule Grid */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-6">Horario Semanal</h2>
        <div className="space-y-6">
          {daysOfWeek.map((day) => (
            <div key={day} className="space-y-2">
              <h3 className="text-lg font-bold text-gray-900">{day}</h3>
              {materiasByDay[day].length === 0 ? (
                <p className="text-gray-500 text-sm">No hay sesiones para este día</p>
              ) : (
                <div className="space-y-2">
                  {materiasByDay[day].map((materia) => {
                    const bimestre = getZonaBimestre(centroId, materia);
                    const bimestreColor = getBimestreColor(bimestre);
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
                            {bimestre > 0 && (
                              <span
                                className="text-xs font-semibold px-3 py-1 rounded"
                                style={{ backgroundColor: bimestreColor.bg, color: bimestreColor.text }}
                              >
                                {getBimestreLabel(bimestre)}
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
      </section>

      {/* Upcoming Presencial Sessions */}
      {upcomingPresenciales.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={20} />
            Próximas Presenciales
          </h2>
          <div className="space-y-3">
            {upcomingPresenciales.map((sesion) => {
              const typeColor = getPresencialTypeColor(sesion.tipo);
              return (
                <div
                  key={sesion.id}
                  className="border-l-4 border-l-indigo-400 bg-indigo-50 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-gray-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">{formatDate(sesion.fecha)}</p>
                        <p className="text-xs text-gray-600">{sesion.diaSemana}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-gray-500 flex-shrink-0" />
                      <p className="text-sm font-medium text-gray-900">
                        {sesion.horaInicio} - {sesion.horaFin}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{sesion.materia?.nombre || 'Sesión'}</p>
                      {sesion.docente && (
                        <p className="text-xs text-gray-600">{sesion.docente.nombre}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-end">
                      <span
                        className="text-xs font-semibold px-3 py-1 rounded whitespace-nowrap"
                        style={{ backgroundColor: typeColor.bg, color: typeColor.text }}
                      >
                        {sesion.tipo.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Upcoming Calendar Events */}
      {upcomingEventos.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={20} />
            Próximas Fechas Importantes
          </h2>
          <div className="space-y-3">
            {upcomingEventos.map((evento) => {
              const eventColor = getEventTypeColor(evento.tipo);
              return (
                <div
                  key={evento.id}
                  className="border-l-4 border-l-purple-400 bg-purple-50 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-gray-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{formatDate(evento.fecha)}</p>
                        {evento.fechaFin && evento.fechaFin !== evento.fecha && (
                          <p className="text-xs text-gray-600">hasta {formatDate(evento.fechaFin)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-semibold px-3 py-1 rounded whitespace-nowrap"
                        style={{ backgroundColor: eventColor.bg, color: eventColor.text }}
                      >
                        {evento.tipo}
                      </span>
                    </div>
                    <div>
                      {evento.nota && (
                        <p className="text-sm text-gray-900">{evento.nota}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
