import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { Layout } from '../../components/Layout';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import {
  Calendar,
  AlertCircle,
  Search,
  MapPin,
  Clock,
  Video,
  BookOpen,
  User,
} from 'lucide-react';

interface DocenteInfo {
  id: number;
  nombre: string;
}

interface AsignacionDocente {
  id: number;
  materiaId: number;
  materia: {
    id: number;
    nombre: string;
    nombreCorto: string;
    dia: string | null;
    hora: string | null;
    bimestreOC: number;
    bimestreRL: number;
    nivel: { id: number; numero: number; nombre: string };
  };
  centro: { id: number; nombre: string; zona: string };
  enlaceVirtual: string | null;
}

interface SesionOnlineDocente {
  id: number;
  materiaId: number;
  fecha: string;
  hora: string;
  tipo: string;
  unidad: number;
  materia: { nombre: string; nombreCorto: string };
}

interface PresencialDocente {
  id: number;
  fecha: string;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  tipo: string;
  bimestre: number;
  materia: { nombre: string; nombreCorto: string; nivel: { numero: number } };
  centro: { nombre: string };
}

interface PeriodoActivo {
  periodo: { id: number; label: string };
}

const parseUTCDate = (dateStr: string): Date => {
  const d = new Date(dateStr);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

const formatDate = (dateStr: string): string => {
  const d = parseUTCDate(dateStr);
  const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]}`;
};

const getBloqueLabel = (bimestreOC: number, bimestreRL: number, zona: string): string => {
  const bim = zona === 'RL' ? bimestreRL : bimestreOC;
  if (bim === 1) return '1er Bloque';
  if (bim === 2) return '2do Bloque';
  return 'Semestral';
};

export const MiHorario: React.FC = () => {
  useAuth(); // ensure user is authenticated

  // Period info
  const [periodoId, setPeriodoId] = useState<number | null>(null);
  const [periodoLabel, setPeriodoLabel] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DocenteInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedDocente, setSelectedDocente] = useState<DocenteInfo | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Schedule data
  const [asignaciones, setAsignaciones] = useState<AsignacionDocente[]>([]);
  const [sesionesOnline, setSesionesOnline] = useState<SesionOnlineDocente[]>([]);
  const [presenciales, setPresenciales] = useState<PresencialDocente[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab
  const [activeTab, setActiveTab] = useState<'resumen' | 'online' | 'presenciales'>('resumen');

  // Fetch active period on mount
  useEffect(() => {
    const fetchPeriodo = async () => {
      try {
        const res = await client.get<PeriodoActivo>('/activo');
        setPeriodoId(res.data.periodo.id);
        setPeriodoLabel(res.data.periodo.label);
      } catch {
        setError('No se pudo cargar el período activo');
      }
    };
    fetchPeriodo();
  }, []);

  // Search docentes with debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await client.get<DocenteInfo[]>(`/docentes/buscar?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.data);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

  // Load schedule when docente is selected
  useEffect(() => {
    if (!selectedDocente || !periodoId) return;

    const fetchSchedule = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await client.get(
          `/docentes/${selectedDocente.id}/horario?periodoId=${periodoId}`
        );
        setAsignaciones(res.data.asignaciones);
        setSesionesOnline(res.data.sesionesOnline);
        setPresenciales(res.data.presenciales);
      } catch {
        setError('Error al cargar el horario');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSchedule();
  }, [selectedDocente, periodoId]);

  const handleSelectDocente = (docente: DocenteInfo) => {
    setSelectedDocente(docente);
    setSearchQuery(docente.nombre);
    setSearchResults([]);
    setActiveTab('resumen');
  };

  const handleClearSelection = () => {
    setSelectedDocente(null);
    setSearchQuery('');
    setAsignaciones([]);
    setSesionesOnline([]);
    setPresenciales([]);
  };

  // Group asignaciones by centro
  const asignacionesPorCentro = useMemo(() => {
    const map = new Map<string, AsignacionDocente[]>();
    asignaciones.forEach((a) => {
      const key = `${a.centro.nombre} — ${a.materia.nivel.nombre}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return map;
  }, [asignaciones]);

  // Filter upcoming online sessions
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingOnline = useMemo(() => {
    return sesionesOnline
      .filter((s) => parseUTCDate(s.fecha) >= today)
      .slice(0, 20);
  }, [sesionesOnline]);

  const upcomingPresenciales = useMemo(() => {
    return presenciales.filter((s) => parseUTCDate(s.fecha) >= today);
  }, [presenciales]);

  // iCal URLs
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const icalPath = selectedDocente && periodoId ? `/ical/docente/${selectedDocente.id}/${periodoId}` : '';
  const baseHost = apiUrl.replace('https://', '').replace('http://', '');
  const webcalUrl = icalPath ? `webcal://${baseHost}${icalPath}` : '';
  const googleCalendarUrl = webcalUrl
    ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`
    : '';

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <User size={20} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Portal Docente
              </h1>
              <p className="text-sm text-gray-500">{periodoLabel}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Busca tu nombre para ver tu horario
          </label>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (selectedDocente) setSelectedDocente(null);
              }}
              placeholder="Escribe tu nombre..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {selectedDocente && (
              <button
                onClick={handleClearSelection}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search results dropdown */}
          {!selectedDocente && searchResults.length > 0 && (
            <div className="mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((d) => (
                <button
                  key={d.id}
                  onClick={() => handleSelectDocente(d)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <span className="font-medium text-gray-900">{d.nombre}</span>
                </button>
              ))}
            </div>
          )}

          {!selectedDocente && searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
            <p className="mt-2 text-sm text-gray-500">No se encontraron docentes con ese nombre.</p>
          )}

          {searching && (
            <p className="mt-2 text-sm text-gray-400">Buscando...</p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Loading */}
        {isLoading && <LoadingSpinner />}

        {/* Schedule content */}
        {selectedDocente && !isLoading && asignaciones.length > 0 && (
          <>
            {/* Subscription buttons */}
            <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
              <div className="flex flex-wrap gap-3 items-center">
                <span className="text-sm font-medium text-gray-700">Suscríbete:</span>
                <a
                  href={googleCalendarUrl}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Calendar size={16} />
                  Google Calendar
                </a>
                <a
                  href={webcalUrl}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Calendar size={16} />
                  Apple / Outlook
                </a>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {([
                { id: 'resumen', label: 'Mis Materias', count: asignaciones.length },
                { id: 'online', label: 'Clases en Línea', count: upcomingOnline.length },
                { id: 'presenciales', label: 'Presenciales', count: upcomingPresenciales.length },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 font-medium rounded-lg transition text-sm ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {tab.label}
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                    activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              {/* Resumen: materias agrupadas por centro */}
              {activeTab === 'resumen' && (
                <div className="space-y-6">
                  {Array.from(asignacionesPorCentro.entries()).map(([centroKey, asigs]) => (
                    <div key={centroKey}>
                      <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <MapPin size={16} className="text-amber-500" />
                        {centroKey}
                      </h3>
                      <div className="space-y-2">
                        {asigs.map((a) => (
                          <div
                            key={a.id}
                            className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{a.materia.nombre}</p>
                              <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                                {a.materia.dia && (
                                  <span className="flex items-center gap-1">
                                    <Clock size={12} />
                                    {a.materia.dia} {a.materia.hora || ''}
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                                  {getBloqueLabel(a.materia.bimestreOC, a.materia.bimestreRL, a.centro.zona)}
                                </span>
                              </div>
                            </div>
                            {a.enlaceVirtual && (
                              <a
                                href={a.enlaceVirtual}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                              >
                                <Video size={14} />
                                Enlace
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Online sessions */}
              {activeTab === 'online' && (
                <div className="space-y-2">
                  {upcomingOnline.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="mx-auto mb-4 text-gray-400" size={48} />
                      <p className="text-gray-500">No hay sesiones online próximas</p>
                    </div>
                  ) : (
                    upcomingOnline.map((s) => {
                      const isPast = parseUTCDate(s.fecha) < today;
                      return (
                        <div
                          key={s.id}
                          className={`flex items-center gap-4 p-3 rounded-lg border-l-4 ${
                            isPast
                              ? 'bg-gray-50 border-l-gray-300 opacity-60'
                              : 'bg-blue-50/50 border-l-blue-400'
                          }`}
                        >
                          <div className="text-sm font-medium text-gray-700 w-24 flex-shrink-0">
                            {formatDate(s.fecha)}
                          </div>
                          <div className="text-sm text-gray-600 w-14 flex-shrink-0">
                            {s.hora}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {s.materia.nombreCorto}
                            </p>
                            <p className="text-xs text-gray-500">
                              {s.tipo === 'tutoria' ? 'Tutoría' : 'Clase'} U.{s.unidad}
                            </p>
                          </div>
                          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium flex-shrink-0">
                            {s.tipo === 'tutoria' ? 'Tutoría' : 'Clase'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Presenciales */}
              {activeTab === 'presenciales' && (
                <div className="space-y-2">
                  {upcomingPresenciales.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="mx-auto mb-4 text-gray-400" size={48} />
                      <p className="text-gray-500">No hay sesiones presenciales próximas</p>
                    </div>
                  ) : (
                    upcomingPresenciales.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-4 p-3 rounded-lg border-l-4 bg-amber-50/50 border-l-amber-400"
                      >
                        <div className="text-sm font-medium text-gray-700 w-24 flex-shrink-0">
                          {formatDate(s.fecha)}
                        </div>
                        <div className="text-sm text-gray-600 w-28 flex-shrink-0">
                          {s.horaInicio} - {s.horaFin}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {s.materia.nombreCorto}
                          </p>
                          <p className="text-xs text-gray-500">
                            {s.materia.nivel.numero}° Nivel · {s.centro.nombre}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded font-medium flex-shrink-0 ${
                          s.tipo === 'examen'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {s.tipo === 'examen' ? 'Examen' : 'Tutoría'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Empty state when docente selected but no data */}
        {selectedDocente && !isLoading && asignaciones.length === 0 && !error && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <BookOpen className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-500">
              No se encontraron asignaciones para {selectedDocente.nombre} en este período.
            </p>
          </div>
        )}

        {/* Initial state - no docente selected */}
        {!selectedDocente && !error && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <Search className="mx-auto mb-4 text-gray-300" size={48} />
            <p className="text-gray-400 text-lg">
              Busca tu nombre para ver tus materias, horarios y sesiones
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};
