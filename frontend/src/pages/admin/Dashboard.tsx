import React, { useEffect, useState, useMemo } from 'react';
import client from '../../api/client';
import { AdminLayout } from '../../components/AdminLayout';
import {
  Search,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
  Filter,
} from 'lucide-react';

interface AsignacionFull {
  id: number;
  materiaId: number;
  centroId: number;
  docenteId: number;
  enlaceVirtual: string | null;
  materia: {
    id: number;
    nombre: string;
    nombreCorto: string;
    tipo: string;
    dia: string | null;
    hora: string | null;
    duracion: number | null;
    bimestreOC: number;
    bimestreRL: number;
    tutoria: string | null;
    nota: string | null;
    nivelId: number;
    periodoId: number;
    nivel: {
      id: number;
      numero: number;
      nombre: string;
    };
  };
  docente: {
    id: number;
    nombre: string;
    email: string | null;
  };
  centro: {
    id: number;
    nombre: string;
    zona: string;
  };
}

const getBloqueLabel = (asig: AsignacionFull): string => {
  // Use zona to determine which bimestre field
  const zona = asig.centro.zona;
  let bim: number;
  if (zona === 'RL') {
    bim = asig.materia.bimestreRL;
  } else {
    bim = asig.materia.bimestreOC;
  }
  if (bim === 1) return '1ER BLOQUE';
  if (bim === 2) return '2DO BLOQUE';
  return 'SEMESTRAL';
};

const getBloqueColor = (label: string): string => {
  if (label === '1ER BLOQUE') return 'bg-blue-100 text-blue-800';
  if (label === '2DO BLOQUE') return 'bg-amber-100 text-amber-800';
  return 'bg-green-100 text-green-800';
};

const buildWhatsAppMsg = (asig: AsignacionFull): string => {
  const parts = [
    `*${asig.materia.nombre}*`,
    `con ${asig.docente.nombre}`,
  ];
  if (asig.materia.dia) parts.push(asig.materia.dia);
  if (asig.materia.hora) parts.push(`| ${asig.materia.hora}`);
  if (asig.enlaceVirtual) parts.push(asig.enlaceVirtual);
  return parts.join(' ');
};

export const AdminDashboard: React.FC = () => {
  const [asignaciones, setAsignaciones] = useState<AsignacionFull[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [filterNivel, setFilterNivel] = useState('');
  const [filterCentro, setFilterCentro] = useState('');
  const [filterBloque, setFilterBloque] = useState('');
  const [filterDia, setFilterDia] = useState('');

  // Copy state
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Conflicts
  const [conflicts, setConflicts] = useState<any>(null);
  const [conflictsLoading, setConflictsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await client.get<AsignacionFull[]>('/admin/asignaciones-all');
        setAsignaciones(response.data);
      } catch (err) {
        setError('Error cargando asignaciones');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Derive unique filter options
  const niveles = useMemo(() => {
    const set = new Map<number, string>();
    asignaciones.forEach((a) => {
      set.set(a.materia.nivel.numero, `${a.materia.nivel.numero}°`);
    });
    return Array.from(set.entries()).sort((a, b) => a[0] - b[0]);
  }, [asignaciones]);

  const centros = useMemo(() => {
    const set = new Map<number, string>();
    asignaciones.forEach((a) => set.set(a.centro.id, a.centro.nombre));
    return Array.from(set.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [asignaciones]);

  const dias = useMemo(() => {
    const order = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const set = new Set<string>();
    asignaciones.forEach((a) => {
      if (a.materia.dia) set.add(a.materia.dia);
    });
    return order.filter((d) => set.has(d));
  }, [asignaciones]);

  // Apply filters
  const filtered = useMemo(() => {
    return asignaciones.filter((a) => {
      // Search text
      if (searchText) {
        const q = searchText.toLowerCase();
        const matches =
          a.materia.nombre.toLowerCase().includes(q) ||
          a.materia.nombreCorto.toLowerCase().includes(q) ||
          a.docente.nombre.toLowerCase().includes(q) ||
          a.centro.nombre.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Nivel
      if (filterNivel && a.materia.nivel.numero !== parseInt(filterNivel)) return false;

      // Centro
      if (filterCentro && a.centro.id !== parseInt(filterCentro)) return false;

      // Bloque
      if (filterBloque) {
        const bloque = getBloqueLabel(a);
        if (bloque !== filterBloque) return false;
      }

      // Día
      if (filterDia) {
        if (a.materia.dia !== filterDia) return false;
      }

      return true;
    });
  }, [asignaciones, searchText, filterNivel, filterCentro, filterBloque, filterDia]);

  const handleCopyOne = async (asig: AsignacionFull) => {
    const msg = buildWhatsAppMsg(asig);
    await navigator.clipboard.writeText(msg);
    setCopiedId(asig.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCopyAll = async () => {
    const text = filtered
      .map((a) => buildWhatsAppMsg(a))
      .join('\n\n─────\n\n');
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDetectConflicts = async () => {
    setConflictsLoading(true);
    try {
      const response = await client.get('/admin/conflicts');
      setConflicts(response.data);
    } catch (err) {
      console.error('Error detecting conflicts:', err);
    } finally {
      setConflictsLoading(false);
    }
  };

  return (
    <AdminLayout pageTitle="Panel de Administración">
      <div className="space-y-6">
        {/* Header bar */}
        <div className="bg-gradient-header text-white rounded-lg p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Panel de Administración</h2>
            <p className="text-sm opacity-80">EIB en Línea</p>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-lg px-4 py-2 text-sm font-semibold">
            📋 {filtered.length}/{asignaciones.length}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar asignatura, docente o centro..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={filterNivel}
              onChange={(e) => setFilterNivel(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="">Todos los niveles</option>
              {niveles.map(([num, label]) => (
                <option key={num} value={num}>{label}</option>
              ))}
            </select>

            <select
              value={filterCentro}
              onChange={(e) => setFilterCentro(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="">Todos los centros</option>
              {centros.map(([id, nombre]) => (
                <option key={id} value={id}>{nombre}</option>
              ))}
            </select>

            <select
              value={filterBloque}
              onChange={(e) => setFilterBloque(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="">Todos los bloques</option>
              <option value="1ER BLOQUE">1er Bloque</option>
              <option value="2DO BLOQUE">2do Bloque</option>
              <option value="SEMESTRAL">Semestral</option>
            </select>

            <select
              value={filterDia}
              onChange={(e) => setFilterDia(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="">Todos los días</option>
              {dias.map((dia) => (
                <option key={dia} value={dia}>{dia}</option>
              ))}
            </select>

            <button
              onClick={handleCopyAll}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium whitespace-nowrap"
            >
              {copiedAll ? <Check size={16} /> : <Copy size={16} />}
              {copiedAll ? 'Copiado!' : 'Copiar filtrados'}
            </button>
          </div>
        </div>

        {/* Unified Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">Cargando asignaciones...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Nivel</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Centro</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Bloque</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Asignatura</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Docente</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Día</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Hora</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Enlace</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Copiar</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((asig, idx) => {
                    const bloqueLabel = getBloqueLabel(asig);
                    const bloqueColor = getBloqueColor(bloqueLabel);
                    const is2doBimestre = bloqueLabel === '2DO BLOQUE';

                    return (
                      <tr
                        key={asig.id}
                        className={`border-b border-gray-100 hover:bg-blue-50/50 transition ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {asig.materia.nivel.numero}°
                        </td>
                        <td className="px-4 py-3 text-gray-700">{asig.centro.nombre}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded ${bloqueColor}`}>
                            {bloqueLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {asig.materia.nombre}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{asig.docente.nombre}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {is2doBimestre && !asig.materia.dia ? (
                            <span className="text-amber-600 text-xs font-medium">Por confirmar</span>
                          ) : (
                            asig.materia.dia || '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {is2doBimestre && !asig.materia.hora ? (
                            <span className="text-amber-600 text-xs font-medium">Por confirmar</span>
                          ) : (
                            asig.materia.hora || '—'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {asig.enlaceVirtual ? (
                            <a
                              href={asig.enlaceVirtual}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                              title={asig.enlaceVirtual}
                            >
                              <ExternalLink size={16} />
                            </a>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleCopyOne(asig)}
                            className="p-1.5 rounded hover:bg-gray-100 transition text-gray-500 hover:text-green-600"
                            title="Copiar mensaje WhatsApp"
                          >
                            {copiedId === asig.id ? (
                              <Check size={16} className="text-green-600" />
                            ) : (
                              <Copy size={16} />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filtered.length === 0 && !isLoading && (
                <div className="p-8 text-center text-gray-500">
                  No se encontraron asignaciones con los filtros actuales
                </div>
              )}
            </div>
          )}
        </div>

        {/* Conflict Detection Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle size={20} />
            Detección de Cruces de Horario
          </h3>
          <button
            onClick={handleDetectConflicts}
            disabled={conflictsLoading}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
          >
            {conflictsLoading ? 'Analizando...' : 'Detectar Cruces'}
          </button>

          {conflicts && (
            <div className="mt-4">
              {conflicts.conflictCount === 0 ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                  No se detectaron cruces de horario.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 font-medium">
                    Se detectaron {conflicts.conflictCount} cruces
                  </div>
                  {conflicts.conflicts.map((conflict: any, idx: number) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4">
                      <p className="font-semibold text-gray-900 mb-2">
                        {conflict.docenteNombre}
                        <span className="ml-2 text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                          {conflict.type === 'asignacion' ? 'Asignación' : 'Presencial'}
                        </span>
                      </p>
                      <div className="space-y-1">
                        {conflict.conflicts.map((item: any, iIdx: number) => (
                          <div key={iIdx} className="text-sm bg-gray-50 p-2 rounded">
                            <span className="font-medium">{item.materiaNombre}</span>
                            <span className="text-gray-500 ml-2">— {item.centroNombre}</span>
                            {item.dia && <span className="text-gray-500 ml-2">{item.dia} {item.hora}</span>}
                            {item.fechaPresencial && (
                              <span className="text-gray-500 ml-2">
                                {item.fechaPresencial} {item.horaInicio}-{item.horaFin}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};
