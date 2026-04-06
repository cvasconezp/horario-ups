import React, { useEffect, useState, useMemo } from 'react';
import client from '../../api/client';
import { AdminLayout } from '../../components/AdminLayout';
import { BarChart3, RefreshCw, Users, Eye, Monitor, TrendingUp, Layers } from 'lucide-react';

interface DailyPoint {
  date: string;
  views: number;
  visitors: number;
}

interface NivelStat {
  nivelId: number;
  nombre: string;
  numero: number;
  views: number;
  unique: number;
}

interface CentroStat {
  centroId: number;
  nombre: string;
  zona: string;
  views: number;
  unique: number;
}

interface CrossStat {
  nivelId: number;
  centroId: number;
  nivelNombre: string;
  nivelNumero: number;
  centroNombre: string;
  views: number;
  unique: number;
}

interface AnalyticsData {
  days: number;
  totalViews: number;
  uniqueSessions: number;
  byPage: Record<string, number>;
  nivelStats: NivelStat[];
  centroStats: CentroStat[];
  crossStats: CrossStat[];
  dailyChart: DailyPoint[];
  devices: Record<string, number>;
}

const PAGE_LABELS: Record<string, string> = {
  inicio: 'Página de Inicio',
  horario: 'Vista de Horario',
  selector: 'Selector',
  docente: 'Horario Docente',
};

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await client.get<AnalyticsData>(`/admin/analytics?days=${days}`);
      setData(res.data);
    } catch (err) {
      setError('Error al cargar analíticas. La tabla puede no existir aún.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [days]);

  // Max values for bar sizing
  const maxNivelUnique = useMemo(() => data ? Math.max(...data.nivelStats.map((n) => n.unique), 1) : 1, [data]);
  const maxCentroUnique = useMemo(() => data ? Math.max(...data.centroStats.map((c) => c.unique), 1) : 1, [data]);
  const maxDaily = useMemo(() => data ? Math.max(...data.dailyChart.map((d) => d.views), 1) : 1, [data]);
  const maxCrossUnique = useMemo(() => data ? Math.max(...data.crossStats.map((c) => c.unique), 1) : 1, [data]);

  const formatDate = (dateStr: string): string => {
    const [, m, d] = dateStr.split('-');
    const months = ['', 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${parseInt(d)} ${months[parseInt(m)]}`;
  };

  return (
    <AdminLayout pageTitle="Analíticas de Uso">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 size={28} />
            Analíticas de Uso
          </h1>
          <div className="flex items-center gap-3">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value={7}>Últimos 7 días</option>
              <option value={14}>Últimos 14 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value={60}>Últimos 60 días</option>
              <option value={90}>Últimos 90 días</option>
            </select>
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="btn-primary flex items-center gap-2"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            {error}
          </div>
        )}

        {isLoading && !data && (
          <div className="text-center py-12 text-gray-500">Cargando analíticas...</div>
        )}

        {data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-l-blue-500">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users size={22} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Visitantes Únicos</p>
                    <p className="text-3xl font-bold text-blue-700">{data.uniqueSessions}</p>
                    <p className="text-xs text-gray-400">últimos {data.days} días</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Eye size={22} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total de Vistas</p>
                    <p className="text-2xl font-bold text-gray-900">{data.totalViews}</p>
                    <p className="text-xs text-gray-400">
                      ~{data.uniqueSessions > 0 ? (data.totalViews / data.uniqueSessions).toFixed(1) : 0} vistas/visitante
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp size={22} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Horarios Consultados</p>
                    <p className="text-2xl font-bold text-purple-700">{data.byPage['horario'] || 0}</p>
                    <p className="text-xs text-gray-400">vistas de horarios</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Monitor size={22} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Dispositivos</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(data.devices).sort((a, b) => b[1] - a[1]).map(([dev, count]) => (
                        <span key={dev} className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                          {dev}: {count}
                        </span>
                      ))}
                      {Object.keys(data.devices).length === 0 && (
                        <span className="text-xs text-gray-400">Sin datos aún</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Chart */}
            <div className="bg-white rounded-lg shadow-md p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Visitas Diarias</h3>
              {data.dailyChart.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No hay datos para el período seleccionado</p>
              ) : (
                <div className="space-y-1">
                  {data.dailyChart.map((point) => (
                    <div key={point.date} className="flex items-center gap-3 text-sm">
                      <span className="w-16 text-gray-500 text-xs text-right flex-shrink-0">{formatDate(point.date)}</span>
                      <div className="flex-1 flex items-center gap-1">
                        <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden relative">
                          <div
                            className="bg-blue-500 h-5 rounded-full transition-all absolute left-0 top-0"
                            style={{ width: `${(point.views / maxDaily) * 100}%` }}
                          />
                          <div
                            className="bg-blue-700 h-5 rounded-full transition-all absolute left-0 top-0"
                            style={{ width: `${(point.visitors / maxDaily) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs w-20 text-right flex-shrink-0">
                          <span className="font-semibold text-blue-700">{point.visitors}</span>
                          <span className="text-gray-400"> / {point.views}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 justify-end">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-700 rounded" />
                      <span>Visitantes únicos</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-500 rounded" />
                      <span>Total vistas</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* By Nivel & Centro */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* By Nivel */}
              <div className="bg-white rounded-lg shadow-md p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Layers size={16} />
                  Por Nivel
                </h3>
                {data.nivelStats.length === 0 ? (
                  <p className="text-gray-400 text-center py-4 text-sm">Sin datos aún</p>
                ) : (
                  <div className="space-y-2">
                    {data.nivelStats.map((n) => (
                      <div key={n.nivelId} className="flex items-center gap-3">
                        <span className="text-sm text-gray-700 w-28 truncate font-medium">{n.numero}° Nivel</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden relative">
                          <div
                            className="bg-purple-200 h-6 rounded-full absolute left-0 top-0 transition-all"
                            style={{ width: `${(n.views / Math.max(...data.nivelStats.map((x) => x.views), 1)) * 100}%` }}
                          />
                          <div
                            className="bg-purple-600 h-6 rounded-full absolute left-0 top-0 flex items-center pl-2 transition-all"
                            style={{ width: `${(n.unique / Math.max(...data.nivelStats.map((x) => x.views), 1)) * 100}%` }}
                          >
                            {n.unique > 0 && <span className="text-white text-xs font-bold">{n.unique}</span>}
                          </div>
                        </div>
                        <span className="text-xs w-16 text-right flex-shrink-0 text-gray-500">
                          {n.views} vistas
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 justify-end">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-purple-600 rounded" />
                        <span>Únicos</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-purple-200 rounded" />
                        <span>Total vistas</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* By Centro */}
              <div className="bg-white rounded-lg shadow-md p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Users size={16} />
                  Por Centro
                </h3>
                {data.centroStats.length === 0 ? (
                  <p className="text-gray-400 text-center py-4 text-sm">Sin datos aún</p>
                ) : (
                  <div className="space-y-2">
                    {data.centroStats.map((c) => (
                      <div key={c.centroId} className="flex items-center gap-3">
                        <span className="text-sm text-gray-700 w-28 truncate font-medium" title={c.nombre}>{c.nombre}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden relative">
                          <div
                            className="bg-green-200 h-6 rounded-full absolute left-0 top-0 transition-all"
                            style={{ width: `${(c.views / Math.max(...data.centroStats.map((x) => x.views), 1)) * 100}%` }}
                          />
                          <div
                            className="bg-green-600 h-6 rounded-full absolute left-0 top-0 flex items-center pl-2 transition-all"
                            style={{ width: `${(c.unique / Math.max(...data.centroStats.map((x) => x.views), 1)) * 100}%` }}
                          >
                            {c.unique > 0 && <span className="text-white text-xs font-bold">{c.unique}</span>}
                          </div>
                        </div>
                        <span className="text-xs w-16 text-right flex-shrink-0 text-gray-500">
                          {c.views} vistas
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 justify-end">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-600 rounded" />
                        <span>Únicos</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-200 rounded" />
                        <span>Total vistas</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cross Nivel × Centro Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Cruce Nivel × Centro</h2>
                <p className="text-xs text-gray-400 mt-1">Visitantes únicos y total de vistas por cada combinación</p>
              </div>
              <div className="overflow-x-auto">
                {data.crossStats.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">No hay datos para el período seleccionado</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3 text-left">Nivel</th>
                        <th className="px-4 py-3 text-left">Centro</th>
                        <th className="px-4 py-3 text-right">Visitantes Únicos</th>
                        <th className="px-4 py-3 text-right">Total Vistas</th>
                        <th className="px-4 py-3 text-left">Actividad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.crossStats.map((row) => (
                        <tr key={`${row.nivelId}_${row.centroId}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{row.nivelNumero}° Nivel</td>
                          <td className="px-4 py-3">{row.centroNombre}</td>
                          <td className="px-4 py-3 text-right font-bold text-blue-700">{row.unique}</td>
                          <td className="px-4 py-3 text-right text-gray-500">{row.views}</td>
                          <td className="px-4 py-3">
                            <div className="w-32 bg-gray-100 rounded-full h-3 overflow-hidden">
                              <div
                                className="bg-blue-500 h-3 rounded-full"
                                style={{ width: `${(row.unique / maxCrossUnique) * 100}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* By Page */}
            <div className="bg-white rounded-lg shadow-md p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Vistas por Sección</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(data.byPage).sort((a, b) => b[1] - a[1]).map(([page, count]) => (
                  <div key={page} className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-xs text-gray-500 mt-1">{PAGE_LABELS[page] || page}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};
