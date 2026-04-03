import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client';
import type { HorarioResponse, SesionOnline, SesionPresencial, CalendarioEvento } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { WeeklySchedule } from '../components/schedule/WeeklySchedule';
import { OnlineSessions } from '../components/schedule/OnlineSessions';
import { PresencialSessions } from '../components/schedule/PresencialSessions';
import { AcademicCalendar } from '../components/schedule/AcademicCalendar';
import { AlertCircle } from 'lucide-react';

export const ScheduleView: React.FC = () => {
  const { periodoId, nivelId, centroId } = useParams<{
    periodoId: string;
    nivelId: string;
    centroId: string;
  }>();

  const [horario, setHorario] = useState<HorarioResponse | null>(null);
  const [sesionesOnline, setSesionesOnline] = useState<SesionOnline[]>([]);
  const [sesionesPresenciales, setSesionesPresenciales] = useState<
    SesionPresencial[]
  >([]);
  const [eventos, setEventos] = useState<CalendarioEvento[]>([]);

  const [activeTab, setActiveTab] = useState<
    'semanal' | 'online' | 'presenciales' | 'calendario'
  >('semanal');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!periodoId || !nivelId || !centroId) return;

      try {
        setIsLoading(true);
        setError(null);

        // Fetch main schedule
        const horarioResponse = await client.get<HorarioResponse>(
          `/horarios/${periodoId}/${nivelId}/${centroId}`
        );
        setHorario(horarioResponse.data);

        // Fetch online sessions
        const onlineResponse = await client.get<SesionOnline[]>(
          `/sesiones-online?periodoId=${periodoId}&nivelId=${nivelId}`
        );
        setSesionesOnline(onlineResponse.data);

        // Fetch presencial sessions
        const presencialesResponse = await client.get<SesionPresencial[]>(
          `/sesiones-presenciales?periodoId=${periodoId}&nivelId=${nivelId}&centroId=${centroId}`
        );
        setSesionesPresenciales(presencialesResponse.data);

        // Fetch calendar events
        const eventosResponse = await client.get<CalendarioEvento[]>(
          `/calendario?periodoId=${periodoId}`
        );
        setEventos(eventosResponse.data);
      } catch (err) {
        setError('Error al cargar el horario');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [periodoId, nivelId, centroId]);

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (error || !horario) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-red-800">{error || 'No se encontró el horario'}</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'semanal', label: 'Horario Semanal', count: horario.materias.length },
    { id: 'online', label: 'Sesiones Online', count: sesionesOnline.length },
    { id: 'presenciales', label: 'Sesiones Presenciales', count: sesionesPresenciales.length },
    { id: 'calendario', label: 'Calendario', count: eventos.length },
  ] as const;

  const apiUrl = import.meta.env.VITE_API_URL;
  const googleCalendarUrl = `https://calendar.google.com/calendar/u/0/r?cid=${apiUrl}/ical/${periodoId}/${nivelId}/${centroId}`;
  const appleOutlookUrl = `webcal://${apiUrl.replace('http://', '').replace('https://', '')}/ical/${periodoId}/${nivelId}/${centroId}`;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Horario - {horario.periodo.label}
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Carrera</p>
              <p className="font-semibold text-gray-900">{horario.nivel.nombre}</p>
            </div>
            <div>
              <p className="text-gray-600">Centro</p>
              <p className="font-semibold text-gray-900">{horario.centro.nombre}</p>
            </div>
            <div>
              <p className="text-gray-600">Período</p>
              <p className="font-semibold text-gray-900">{horario.periodo.label}</p>
            </div>
          </div>
        </div>

        {/* Calendar Subscription Buttons */}
        <div className="border-t pt-4 mt-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Suscribirse al horario:</p>
          <div className="flex flex-wrap gap-3">
            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              📅 Google Calendar
            </a>
            <a
              href={appleOutlookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              📅 Apple/Outlook
            </a>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium rounded-lg transition ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            <span className="ml-2 text-sm bg-white/20 px-2 py-0.5 rounded">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        {activeTab === 'semanal' && <WeeklySchedule materias={horario.materias} />}
        {activeTab === 'online' && <OnlineSessions sesiones={sesionesOnline} />}
        {activeTab === 'presenciales' && (
          <PresencialSessions sesiones={sesionesPresenciales} />
        )}
        {activeTab === 'calendario' && <AcademicCalendar eventos={eventos} />}
      </div>
    </div>
  );
};
