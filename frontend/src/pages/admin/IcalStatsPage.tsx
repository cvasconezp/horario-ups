import React, { useEffect, useState } from 'react';
import client from '../../api/client';
import { AdminLayout } from '../../components/AdminLayout';
import { BarChart3, RefreshCw, Calendar, Users, MapPin } from 'lucide-react';

interface IcalSuscripcion {
  id: number;
  tipo: string;
  nivel: string | null;
  centro: string | null;
  docente: string | null;
  count: number;
  lastFetch: string;
  createdAt: string;
  userAgent: string | null;
}

interface IcalStats {
  summary: {
    totalRequests: number;
    estudiantes: { unique: number; totalRequests: number };
    docentes: { unique: number; totalRequests: number };
  };
  suscripciones: IcalSuscripcion[];
}

export const IcalStatsPage: React.FC = () => {
  const [stats, setStats] = useState<IcalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await client.get<IcalStats>('/admin/ical-stats');
      setStats(res.data);
    } catch (err) {
      setError('Error al cargar estadísticas. La tabla puede no existir aún.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('es-EC', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const detectDevice = (ua: string | null): string => {
    if (!ua) return 'Desconocido';
    if (ua.includes('Thunderbird')) return 'Thunderbird';
    if (ua.includes('Google-Calendar')) return 'Google Calendar';
    if (ua.includes('Microsoft Outlook')) return 'Outlook';
    if (ua.includes('CalendarAgent') || ua.includes('dataaccessd')) return 'Apple Calendar';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    return 'Otro';
  };

  return (
    <AdminLayout pageTitle="Suscripciones iCal">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 size={28} />
            Suscripciones iCal
          </h1>
          <button
            onClick={fetchStats}
            disabled={isLoading}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>

        {error && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            {error}
          </div>
        )}

        {isLoading && !stats && (
          <div className="text-center py-12 text-gray-500">Cargando estadísticas...</div>
        )}

        {stats && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-md p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar size={22} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Solicitudes</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.summary.totalRequests}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users size={22} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Suscripciones Únicas</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.summary.estudiantes.unique + stats.summary.docentes.unique}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users size={22} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Estudiantes</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.summary.estudiantes.totalRequests}</p>
                    <p className="text-xs text-gray-400">{stats.summary.estudiantes.unique} únicos</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <MapPin size={22} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Docentes</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.summary.docentes.totalRequests}</p>
                    <p className="text-xs text-gray-400">{stats.summary.docentes.unique} únicos</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Detalle de Suscripciones</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-left">Nivel</th>
                      <th className="px-4 py-3 text-left">Centro</th>
                      <th className="px-4 py-3 text-left">Docente</th>
                      <th className="px-4 py-3 text-right">Solicitudes</th>
                      <th className="px-4 py-3 text-left">Dispositivo</th>
                      <th className="px-4 py-3 text-left">Última vez</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.suscripciones.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                          Aún no hay suscripciones registradas
                        </td>
                      </tr>
                    ) : (
                      stats.suscripciones.map((s) => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                s.tipo === 'docente'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {s.tipo === 'docente' ? 'Docente' : 'Estudiante'}
                            </span>
                          </td>
                          <td className="px-4 py-3">{s.nivel || '-'}</td>
                          <td className="px-4 py-3">{s.centro || '-'}</td>
                          <td className="px-4 py-3 text-gray-500">
                            {s.tipo === 'docente' ? (s.docente || '-') : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">{s.count}</td>
                          <td className="px-4 py-3 text-gray-500">{detectDevice(s.userAgent)}</td>
                          <td className="px-4 py-3 text-gray-500">{formatDate(s.lastFetch)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};
