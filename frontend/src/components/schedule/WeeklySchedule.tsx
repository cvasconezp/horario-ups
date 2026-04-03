import React, { useMemo } from 'react';
import type { Materia, SesionOnline, SesionPresencial, CalendarioEvento } from '../../types';
import { Calendar, Clock, Video, MapPin, BookOpen } from 'lucide-react';

interface WeeklyScheduleProps {
  materias: (Materia & {
    docente: { id: number; nombre: string; email: string | null };
    enlaceVirtual: string | null;
  })[];
  sesionesOnline?: SesionOnline[];
  presenciales?: SesionPresencial[];
  eventos?: CalendarioEvento[];
  centroId?: number;
}

// Unified event type for the timeline
interface TimelineEvent {
  id: string;
  fecha: Date;
  fechaStr: string;
  hora: string;
  horaFin?: string;
  titulo: string;
  subtitulo?: string;
  tipo: 'online' | 'presencial' | 'evento';
  badge: string;
  badgeColor: { bg: string; text: string };
  enlace?: string | null;
  isPast: boolean;
}

const getZonaBimestre = (centroId: number | undefined, materia: any): number => {
  if (!centroId) return materia.bimestreOC ?? materia.bimestreRL ?? 0;
  const isZonaNorte = [2, 3, 5, 6].includes(centroId);
  return isZonaNorte ? (materia.bimestreOC ?? 0) : (materia.bimestreRL ?? 0);
};

const parseUTCDate = (dateStr: string): Date => {
  const d = new Date(dateStr);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

const formatDateLong = (date: Date): string => {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]}`;
};

const formatDateShort = (date: Date): string => {
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
};

const getWeekKey = (date: Date): string => {
  // ISO week: Monday-based
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // go to Monday
  return d.toISOString().slice(0, 10);
};

const getWeekLabel = (weekStart: Date): string => {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const startStr = `${weekStart.getDate()} ${months[weekStart.getMonth()]}`;
  const endStr = `${weekEnd.getDate()} ${months[weekEnd.getMonth()]}`;
  return `Semana del ${startStr} al ${endStr}`;
};

export const WeeklySchedule: React.FC<WeeklyScheduleProps> = ({
  materias,
  sesionesOnline = [],
  presenciales = [],
  eventos = [],
  centroId,
}) => {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const timelineEvents = useMemo(() => {
    const allEvents: TimelineEvent[] = [];

    // Build enlaceVirtual lookup from materias prop (which has asignacion data)
    const enlaceMap = new Map<number, string>();
    materias.forEach((m) => {
      if (m.enlaceVirtual) enlaceMap.set(m.id, m.enlaceVirtual);
    });

    // Filter out 2do bimestre materias
    const filteredOnline = sesionesOnline.filter((s) => {
      if (!s.materia) return true;
      const bim = getZonaBimestre(centroId, s.materia);
      return bim !== 2;
    });

    // 1. Online sessions → timeline events
    filteredOnline.forEach((sesion) => {
      const fecha = parseUTCDate(sesion.fecha);
      const materia = sesion.materia;
      const duracion = materia?.duracion; // in minutes
      let horaFin: string | undefined;
      if (duracion && sesion.hora) {
        const [h, m] = sesion.hora.split(':').map(Number);
        const totalMin = h * 60 + m + duracion;
        horaFin = `${Math.floor(totalMin / 60).toString().padStart(2, '0')}:${(totalMin % 60).toString().padStart(2, '0')}`;
      }

      allEvents.push({
        id: `online-${sesion.id}`,
        fecha,
        fechaStr: sesion.fecha,
        hora: sesion.hora,
        horaFin,
        titulo: materia?.nombre || 'Sesión en línea',
        subtitulo: materia ? `${sesion.tipo} U.${sesion.unidad}` : undefined,
        tipo: 'online',
        badge: sesion.tipo?.toUpperCase() === 'TUTORÍA' ? 'TUTORÍA EN LÍNEA' : 'CLASE EN LÍNEA',
        badgeColor: sesion.tipo?.toUpperCase() === 'TUTORÍA'
          ? { bg: '#c6f6d5', text: '#22543d' }
          : { bg: '#bee3f8', text: '#2a4365' },
        enlace: (materia ? enlaceMap.get(materia.id) : null) || null,
        isPast: fecha < today,
      });
    });

    // 2. Presencial sessions → timeline events
    presenciales.forEach((sesion) => {
      const fecha = parseUTCDate(sesion.fecha);
      allEvents.push({
        id: `presencial-${sesion.id}`,
        fecha,
        fechaStr: sesion.fecha,
        hora: sesion.horaInicio,
        horaFin: sesion.horaFin,
        titulo: sesion.materia?.nombre || 'Sesión presencial',
        subtitulo: sesion.docente?.nombre,
        tipo: 'presencial',
        badge: sesion.tipo?.toUpperCase() === 'EXAMEN' ? 'EXAMEN PRESENCIAL' : 'TUTORÍA PRESENCIAL',
        badgeColor: sesion.tipo?.toUpperCase() === 'EXAMEN'
          ? { bg: '#fed7d7', text: '#742a2a' }
          : { bg: '#fefcbf', text: '#744210' },
        isPast: fecha < today,
      });
    });

    // 3. Calendar events → timeline events
    eventos.forEach((evento) => {
      const fecha = parseUTCDate(evento.fecha);
      allEvents.push({
        id: `evento-${evento.id}`,
        fecha,
        fechaStr: evento.fecha,
        hora: '',
        titulo: evento.nota || evento.tipo,
        subtitulo: evento.fechaFin && evento.fechaFin !== evento.fecha
          ? `Hasta ${formatDateShort(parseUTCDate(evento.fechaFin))}`
          : undefined,
        tipo: 'evento',
        badge: evento.tipo.toUpperCase(),
        badgeColor: evento.tipo.toLowerCase().includes('entrega')
          ? { bg: '#bee3f8', text: '#2a4365' }
          : evento.tipo.toLowerCase().includes('inicio')
            ? { bg: '#c6f6d5', text: '#22543d' }
            : evento.tipo.toLowerCase().includes('fin')
              ? { bg: '#fbd38d', text: '#744210' }
              : { bg: '#e6e6fa', text: '#2d2d4d' },
        isPast: fecha < today,
      });
    });

    // Sort chronologically, then by hora
    allEvents.sort((a, b) => {
      const dateDiff = a.fecha.getTime() - b.fecha.getTime();
      if (dateDiff !== 0) return dateDiff;
      return (a.hora || '').localeCompare(b.hora || '');
    });

    return allEvents;
  }, [sesionesOnline, presenciales, eventos, centroId, today]);

  // Group events by week
  const weekGroups = useMemo(() => {
    const groups: { weekKey: string; weekStart: Date; events: TimelineEvent[] }[] = [];
    const weekMap = new Map<string, TimelineEvent[]>();

    timelineEvents.forEach((event) => {
      const key = getWeekKey(event.fecha);
      if (!weekMap.has(key)) weekMap.set(key, []);
      weekMap.get(key)!.push(event);
    });

    // Sort weeks chronologically
    const sortedKeys = [...weekMap.keys()].sort();
    sortedKeys.forEach((key) => {
      const weekStart = new Date(key + 'T00:00:00');
      groups.push({ weekKey: key, weekStart, events: weekMap.get(key)! });
    });

    return groups;
  }, [timelineEvents]);

  // Find the current week key to highlight it
  const currentWeekKey = useMemo(() => getWeekKey(today), [today]);

  // Group events within a week by date
  const groupByDate = (events: TimelineEvent[]) => {
    const dateMap = new Map<string, TimelineEvent[]>();
    events.forEach((e) => {
      const key = e.fecha.toISOString().slice(0, 10);
      if (!dateMap.has(key)) dateMap.set(key, []);
      dateMap.get(key)!.push(e);
    });
    return [...dateMap.entries()].sort(([a], [b]) => a.localeCompare(b));
  };

  const getIcon = (tipo: TimelineEvent['tipo']) => {
    switch (tipo) {
      case 'online': return <Video size={14} className="flex-shrink-0" />;
      case 'presencial': return <MapPin size={14} className="flex-shrink-0" />;
      case 'evento': return <BookOpen size={14} className="flex-shrink-0" />;
    }
  };

  const getBorderColor = (tipo: TimelineEvent['tipo']) => {
    switch (tipo) {
      case 'online': return 'border-l-blue-400';
      case 'presencial': return 'border-l-amber-400';
      case 'evento': return 'border-l-purple-400';
    }
  };

  const getBgColor = (tipo: TimelineEvent['tipo'], isPast: boolean) => {
    if (isPast) return 'bg-gray-50 opacity-60';
    switch (tipo) {
      case 'online': return 'bg-blue-50';
      case 'presencial': return 'bg-amber-50';
      case 'evento': return 'bg-purple-50';
    }
  };

  if (timelineEvents.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
        <p>No hay eventos programados</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {weekGroups.map(({ weekKey, weekStart, events }) => {
        const isCurrentWeek = weekKey === currentWeekKey;
        const allPast = events.every((e) => e.isPast);
        const dateGroups = groupByDate(events);

        return (
          <section key={weekKey} className={allPast ? 'opacity-60' : ''}>
            {/* Week header */}
            <div className={`flex items-center gap-3 mb-4 pb-2 border-b-2 ${
              isCurrentWeek ? 'border-blue-500' : 'border-gray-200'
            }`}>
              <Calendar size={18} className={isCurrentWeek ? 'text-blue-600' : 'text-gray-400'} />
              <h3 className={`text-base font-bold ${
                isCurrentWeek ? 'text-blue-700' : 'text-gray-700'
              }`}>
                {getWeekLabel(weekStart)}
              </h3>
              {isCurrentWeek && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                  SEMANA ACTUAL
                </span>
              )}
            </div>

            {/* Days within the week */}
            <div className="space-y-4 ml-2">
              {dateGroups.map(([dateKey, dayEvents]) => {
                const date = new Date(dateKey + 'T00:00:00');
                const isToday = dateKey === today.toISOString().slice(0, 10);

                return (
                  <div key={dateKey}>
                    {/* Day header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-sm font-semibold ${
                        isToday ? 'text-blue-700 bg-blue-100 px-2 py-0.5 rounded' : 'text-gray-600'
                      }`}>
                        {formatDateLong(date)}
                        {isToday && ' — Hoy'}
                      </span>
                    </div>

                    {/* Events for the day */}
                    <div className="space-y-2 ml-4">
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          className={`border-l-4 ${getBorderColor(event.tipo)} ${getBgColor(event.tipo, event.isPast)} rounded-lg p-3 hover:shadow-md transition`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            {/* Time */}
                            {event.hora && (
                              <div className="flex items-center gap-1 text-sm font-mono font-medium text-gray-700 sm:w-32 flex-shrink-0">
                                <Clock size={14} className="text-gray-400 flex-shrink-0" />
                                {event.hora}
                                {event.horaFin && ` - ${event.horaFin}`}
                              </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 text-sm leading-tight">
                                {event.titulo}
                              </p>
                              {event.subtitulo && (
                                <p className="text-xs text-gray-600 mt-0.5">{event.subtitulo}</p>
                              )}
                            </div>

                            {/* Badge + link */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {event.enlace && (
                                <a
                                  href={event.enlace}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-medium text-blue-600 hover:text-blue-800 underline whitespace-nowrap"
                                >
                                  Enlace
                                </a>
                              )}
                              <span
                                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded whitespace-nowrap"
                                style={{ backgroundColor: event.badgeColor.bg, color: event.badgeColor.text }}
                              >
                                {getIcon(event.tipo)}
                                {event.badge}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};
