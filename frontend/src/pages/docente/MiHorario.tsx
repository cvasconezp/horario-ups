import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { Layout } from '../../components/Layout';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import type { SesionOnline, SesionPresencial, CalendarioEvento } from '../../types';
import { OnlineSessions } from '../../components/schedule/OnlineSessions';
import { PresencialSessions } from '../../components/schedule/PresencialSessions';
import { AcademicCalendar } from '../../components/schedule/AcademicCalendar';
import { Calendar, AlertCircle, Download } from 'lucide-react';

export const MiHorario: React.FC = () => {
  const { usuario } = useAuth();
  const [sesionesOnline, setSesionesOnline] = useState<SesionOnline[]>([]);
  const [sesionesPresenciales, setSesionesPresenciales] = useState<
    SesionPresencial[]
  >([]);
  const [eventos, setEventos] = useState<CalendarioEvento[]>([]);
  const [activeTab, setActiveTab] = useState<
    'online' | 'presenciales' | 'calendario'
  >('online');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!usuario?.id) return;

      try {
        setIsLoading(true);
        setError(null);

        const [onlineRes, presencialesRes, eventosRes] = await Promise.all([
          client.get<SesionOnline[]>(`/docente/${usuario.id}/sesiones-online`),
          client.get<SesionPresencial[]>(
            `/docente/${usuario.id}/sesiones-presenciales`
          ),
          client.get<CalendarioEvento[]>('/calendario'),
        ]);

        setSesionesOnline(onlineRes.data);
        setSesionesPresenciales(presencialesRes.data);
        setEventos(eventosRes.data);
      } catch (err) {
        setError('Error al cargar tu horario');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [usuario?.id]);

  const handleDownloadCalendar = async () => {
    try {
      const response = await client.get(`/docente/${usuario?.id}/calendar.ics`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `horario-${usuario?.email?.split('@')[0]}.ics`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error descargando calendario:', err);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <LoadingSpinner fullScreen />
      </Layout>
    );
  }

  const tabs = [
    { id: 'online', label: 'Sesiones Online', count: sesionesOnline.length },
    {
      id: 'presenciales',
      label: 'Sesiones Presenciales',
      count: sesionesPresenciales.length,
    },
    { id: 'calendario', label: 'Calendario', count: eventos.length },
  ] as const;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Mi Horario
              </h1>
              <p className="text-gray-600">
                Bienvenido, {usuario?.nombre}
              </p>
            </div>
            <button
              onClick={handleDownloadCalendar}
              className="btn-primary flex items-center gap-2"
            >
              <Download size={20} />
              Descargar (.ics)
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        )}

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
          {activeTab === 'online' && (
            <>
              {sesionesOnline.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="mx-auto mb-4 text-gray-400" size={48} />
                  <p className="text-gray-500">
                    No tienes sesiones online programadas
                  </p>
                </div>
              ) : (
                <OnlineSessions sesiones={sesionesOnline} />
              )}
            </>
          )}

          {activeTab === 'presenciales' && (
            <>
              {sesionesPresenciales.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="mx-auto mb-4 text-gray-400" size={48} />
                  <p className="text-gray-500">
                    No tienes sesiones presenciales programadas
                  </p>
                </div>
              ) : (
                <PresencialSessions sesiones={sesionesPresenciales} />
              )}
            </>
          )}

          {activeTab === 'calendario' && <AcademicCalendar eventos={eventos} />}
        </div>

        {/* Info Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-bold text-blue-900 mb-1">Sesiones Online</h3>
            <p className="text-2xl font-bold text-blue-600">{sesionesOnline.length}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-bold text-green-900 mb-1">
              Sesiones Presenciales
            </h3>
            <p className="text-2xl font-bold text-green-600">
              {sesionesPresenciales.length}
            </p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-bold text-orange-900 mb-1">Eventos</h3>
            <p className="text-2xl font-bold text-orange-600">{eventos.length}</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};
