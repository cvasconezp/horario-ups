import React from 'react';
import { ExternalLink } from 'lucide-react';
import type { CalendarioEvento } from '../../types';
import { parseUTCDate, formatSpanishDate, spanishMonths } from '../../utils/dates';

interface AcademicCalendarProps {
  eventos: CalendarioEvento[];
}

const getBimestreLabel = (bimestre: number | null): string => {
  if (bimestre === 1) return '1er Bimestre';
  if (bimestre === 2) return '2do Bimestre';
  return 'General';
};

const getTypeColor = (tipo: string): { bg: string; text: string; borderColor: string } => {
  const t = tipo.toLowerCase();
  if (t.includes('feriado') || t.includes('vacaciones'))
    return { bg: '#fed7d7', text: '#9b2c2c', borderColor: '#c53030' };
  if (t.includes('examen') || t.includes('recuperacion') || t.includes('recuperación'))
    return { bg: '#e9d8fd', text: '#553399', borderColor: '#805ad5' };
  if (t.includes('entrega'))
    return { bg: '#bee3f8', text: '#2a4365', borderColor: '#3182ce' };
  if (t.includes('inicio'))
    return { bg: '#c6f6d5', text: '#22543d', borderColor: '#38a169' };
  if (t.includes('paso_notas') || t.includes('notas'))
    return { bg: '#feebc8', text: '#7c2d12', borderColor: '#ed8936' };
  if (t.includes('induccion') || t.includes('inducción'))
    return { bg: '#fefcbf', text: '#744210', borderColor: '#d69e2e' };
  // Extracurricular events
  if (t.includes('eucaristia') || t.includes('eucaristía'))
    return { bg: '#f0e6ff', text: '#5b21b6', borderColor: '#7c3aed' };
  if (t.includes('eleccion') || t.includes('elección') || t.includes('reunion') || t.includes('reunión'))
    return { bg: '#dbeafe', text: '#1e40af', borderColor: '#3b82f6' };
  if (t.includes('cultural') || t.includes('taller'))
    return { bg: '#fce7f3', text: '#9d174d', borderColor: '#ec4899' };
  return { bg: '#e2e8f0', text: '#2d3748', borderColor: '#718096' };
};

export const AcademicCalendar: React.FC<AcademicCalendarProps> = ({ eventos }) => {
  // Sort by date
  const sortedEventos = [...eventos].sort((a, b) => {
    return parseUTCDate(a.fecha).getTime() - parseUTCDate(b.fecha).getTime();
  });

  // Group by bimestre first, then by month within bimestre
  const eventosByBimestre: Record<string, Record<string, typeof eventos>> = {};
  const bimestreOrder: string[] = [];

  sortedEventos.forEach((evento) => {
    const bimestreLabel = getBimestreLabel(evento.bimestre);
    const fecha = parseUTCDate(evento.fecha);
    const monthKey = `${spanishMonths[fecha.getMonth()]} ${fecha.getFullYear()}`;

    if (!eventosByBimestre[bimestreLabel]) {
      eventosByBimestre[bimestreLabel] = {};
      bimestreOrder.push(bimestreLabel);
    }

    if (!eventosByBimestre[bimestreLabel][monthKey]) {
      eventosByBimestre[bimestreLabel][monthKey] = [];
    }

    eventosByBimestre[bimestreLabel][monthKey].push(evento);
  });

  return (
    <div className="space-y-8">
      {bimestreOrder.map((bimestreLabel) => (
        <div key={bimestreLabel}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">{bimestreLabel}</h2>
          <div className="space-y-6">
            {Object.entries(eventosByBimestre[bimestreLabel]).map(([month, eventosEnMes]) => (
              <div key={month}>
                <h3 className="text-lg font-semibold text-gray-700 mb-3 capitalize">{month}</h3>
                <div className="space-y-2">
                  {eventosEnMes.map((evento) => {
                    const fechaInicio = parseUTCDate(evento.fecha);
                    const formattedDate = formatSpanishDate(fechaInicio);
                    const typeColor = getTypeColor(evento.tipo);

                    let formattedEnd = '';
                    if (evento.fechaFin && evento.fechaFin !== evento.fecha) {
                      const fechaFin = parseUTCDate(evento.fechaFin);
                      formattedEnd = ' - ' + formatSpanishDate(fechaFin);
                    }

                    return (
                      <div
                        key={evento.id}
                        className="border-l-4 pl-4 py-3 rounded hover:shadow-md transition"
                        style={{
                          backgroundColor: typeColor.bg,
                          borderColor: typeColor.borderColor,
                          color: typeColor.text,
                        }}
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
                            <span
                              className="inline-block text-xs font-semibold px-3 py-1 rounded"
                              style={{
                                backgroundColor: typeColor.borderColor,
                                color: 'white',
                              }}
                            >
                              {evento.tipo}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase opacity-75">Descripción</p>
                            <p>{evento.nota || '-'}</p>
                            {evento.enlace && (
                              <a
                                href={evento.enlace}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-1 text-sm font-medium underline hover:opacity-80"
                                style={{ color: typeColor.text }}
                              >
                                <ExternalLink size={14} />
                                Enlace
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
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
