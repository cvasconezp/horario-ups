import React, { useEffect, useState, useMemo } from 'react';
import client from '../../api/client';
import { AdminLayout } from '../../components/AdminLayout';
import { BarChart3, RefreshCw, Calendar, Users, MapPin, Info, ArrowUpDown } from 'lucide-react';

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

  const formatDateShort = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('es-EC', {
        day: '2-digit',
        month: 'short',
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

  // Compute derived stats
  const derivedStats = useMemo(() => {
    if (!stats) return null;
    const totalUnique = stats.summary.estudiantes.unique + stats.summary.docentes.unique;
    const totalRefreshes = stats.summary.totalRequests - totalUnique;
    const avgRefreshPerSub = totalUnique > 0 ? (stats.summary.totalRequests / totalUnique).toFixed(1) : '0';

    // Group by device
    const deviceCounts: Record<string, number> = {};
    stats.suscripciones.forEach((s) => {
      const dev = detectDevice(s.userAgent);
      deviceCounts[dev] = (deviceCounts[dev] || 0) + 1;
    });
    const deviceEntries = Object.entries(deviceCounts).sort((a, b) => b[1] - a[1]);

    // Group by centro
    const centroCounts: Record<string, { unique: number; requests: number }> = {};
    stats.suscripciones.forEach((s) => {
      const name = s.centro || 'Sin centro';
      if (!centroCounts[name]) centroCounts[name] = { unique: 0, requests: 0 };
      centroCounts[name].unique += 1;
      centroCounts[name].requests += s.count;
    });
    const centroEntries = Object.entries(centroCounts).sort((a, b) => b[1].unique - a[1].unique);

    return { totalUnique, totalRefreshes, avgRefreshPerSub, deviceEntries, centroEntries };
  }, [stats]);

  // Max count for bar width
  const maxCount = useMemo(() => {
    if (!stats) return 1;
    return Math.max(...stats.suscripciones.map((s) => s.count), 1);
  }, [stats]);

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

        {/* Explanation banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 text-sm text-blue-800">
          <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">¿Por qué hay más solicitudes que suscripciones?</p>
            <p>
              Las aplicaciones de calendario (Google Calendar, Apple Calendar, etc.) refrescan
              automáticamente las suscripciones iCal cada pocas horas para detectar cambios.
              Cada refresco incrementa el contador de solicitudes, pero <strong>no crea una nueva suscripción</strong>.
              Las <strong>suscripciones únicas</strong> representan personas reales suscritas.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            {error}
          </div>
        )}

        {isLoading && !stats && (
          <div className="text-center py-12 text-gray-500">Cargando estadísticas...</div>
        )}

        {stats && derivedStats && (
          <>
            {/* Summary Cards - Row 1: Key metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Unique subscriptions - PRIMARY */}
              <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-l-green-500">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users size={22} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Suscripciones Reales</p>
                    <p className="text-3xl font-bold text-green-700">{derivedStats.totalUnique}</p>
                    <p className="text-xs text-gray-400">personas suscritas</p>
                  </div>
                </div>
              </div>

              {/* Total requests - SECONDARY */}
              <div className="bg-white rounded-lg shadow-md p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <ArrowUpDown size={22} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Solicitudes</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.summary.totalRequests}</p>
                    <p className="text-xs text-gray-400">
                      {derivedStats.totalRefreshes} son refrescos automáticos
                    </p>
                  </div>
                </div>
              </div>

              {/* Students */}
              <div className="bg-white rounded-lg shadow-md p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users size={22} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Estudiantes</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-purple-700">{stats.summary.estudiantes.unique}</p>
                      <p className="text-sm text-gray-400">únicos</p>
                    </div>
                    <p className="text-xs text-gray-400">
                      {stats.summary.estudiantes.totalRequests} solicitudes totales
                    </p>
                  </div>
                </div>
              </div>

              {/* Docentes */}
              <div className="bg-white rounded-lg shadow-md p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <MapPin size={22} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Docentes</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-orange-700">{stats.summary.docentes.unique}</p>
                      <p className="text-sm text-gray-400">únicos</p>
                    </div>
                    <p className="text-xs text-gray-400">
                      {stats.summary.docentes.totalRequests} solicitudes totales
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Visual breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Subscriptions vs Refreshes visual */}
              <div className="bg-white rounded-lg shadow-md p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Suscripciones vs. Refrescos</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-green-700 font-medium">Suscripciones reales</span>
                      <span className="font-bold text-green-700">{derivedStats.totalUnique}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-green-500 h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-bold transition-all"
                        style={{ width: `${Math.max((derivedStats.totalUnique / stats.summary.totalRequests) * 100, 8)}%` }}
                      >
                        {((derivedStats.totalUnique / stats.summary.totalRequests) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500 font-medium">Refrescos automáticos</span>
                      <span className="font-bold text-gray-500">{derivedStats.totalRefreshes}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-gray-400 h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-bold transition-all"
                        style={{ width: `${Math.max((derivedStats.totalRefreshes / stats.summary.totalRequests) * 100, 8)}%` }}
                      >
                        {((derivedStats.totalRefreshes / stats.summary.totalRequests) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Promedio: ~{derivedStats.avgRefreshPerSub} solicitudes por suscripción
                  </p>
                </div>
              </div>

              {/* By device & centro */}
              <div className="bg-white rounded-lg shadow-md p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Por Aplicación de Calendario</h3>
                <div className="space-y-2">
                  {derivedStats.deviceEntries.map(([device, count]) => (
                    <div key={device} className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 w-36 truncate">{device}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div
                          className="bg-blue-500 h-5 rounded-full transition-all"
                          style={{ width: `${(count / derivedStats.totalUnique) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-8 text-right">{count}</span>
                    </div>
                  ))}
                </div>

                <h3 className="text-sm font-semibold text-gray-700 mt-5 mb-3">Por Centro</h3>
                <div className="space-y-2">
                  {derivedStats.centroEntries.map(([centro, data]) => (
                    <div key={centro} className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 w-36 truncate" title={centro}>{centro}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-5 rounded-full transition-all"
                          style={{ width: `${(data.unique / derivedStats.totalUnique) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-700 w-20 text-right">
                        <span className="font-semibold">{data.unique}</span>
                        <span className="text-gray-400 text-xs ml-1">({data.requests})</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Detail Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Detalle de Suscripciones</h2>
                <span className="text-xs text-gray-400">
                  {stats.suscripciones.length} suscripción{stats.suscripciones.length !== 1 ? 'es' : ''} únicas
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-left">Nivel</th>
                      <th className="px-4 py-3 text-left">Centro</th>
                      <th className="px-4 py-3 text-left">Docente</th>
                      <th className="px-4 py-3 text-left">Actividad</th>
                      <th className="px-4 py-3 text-left">App</th>
                      <th className="px-4 py-3 text-left">Primera vez</th>
                      <th className="px-4 py-3 text-left">Última vez</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.suscripciones.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
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
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-100 rounded-full h-3 overflow-hidden">
                                <div
                                  className="bg-green-500 h-3 rounded-full"
                                  style={{ width: `${(s.count / maxCount) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-gray-700">{s.count}×</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                              {detectDevice(s.userAgent)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{formatDateShort(s.createdAt)}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{formatDateShort(s.lastFetch)}</td>
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
