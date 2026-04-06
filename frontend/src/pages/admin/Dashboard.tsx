import React, { useEffect, useState, useMemo } from 'react';
import client from '../../api/client';
import { AdminLayout } from '../../components/AdminLayout';
import {
  Search,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
  Pencil,
  X,
  Undo2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-react';

interface AsignacionFull {
  id: number;
  materiaId: number;
  centroId: number;
  docenteId: number;
  enlaceVirtual: string | null;
  contrasena: string | null;
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

interface UpcomingSesion {
  id: number;
  materiaId: number;
  fecha: string;
  hora: string;
  tipo: string;
  unidad: number;
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const getBloqueLabel = (asig: AsignacionFull): string => {
  const zona = asig.centro.zona;
  const bim = zona === 'RL' ? asig.materia.bimestreRL : asig.materia.bimestreOC;
  if (bim === 1) return '1ER BLOQUE';
  if (bim === 2) return '2DO BLOQUE';
  return 'SEMESTRAL';
};

const getBloqueColor = (label: string): string => {
  if (label === '1ER BLOQUE') return 'bg-blue-100 text-blue-800';
  if (label === '2DO BLOQUE') return 'bg-amber-100 text-amber-800';
  return 'bg-green-100 text-green-800';
};

const getNivelShort = (numero: number): string => {
  const map: Record<number, string> = { 2: '2do nivel', 4: '4to nivel', 6: '6to nivel', 8: '8vo nivel', 9: 'Contingencia' };
  return map[numero] || `${numero}° nivel`;
};

const buildWhatsAppMsg = (asig: AsignacionFull): string => {
  const lines: string[] = [];
  // Line 1: "2do nivel - Cayambe"
  lines.push(`"${getNivelShort(asig.materia.nivel.numero)} - ${asig.centro.nombre}"`);
  // Line 2: *Asignatura* con Docente
  lines.push(`*${asig.materia.nombre}* con ${asig.docente.nombre}`);
  // Line 3: Día | Hora enlace [Contraseña: "xxx"]
  const timeParts: string[] = [];
  if (asig.materia.dia) timeParts.push(asig.materia.dia);
  if (asig.materia.hora) timeParts.push(`| ${asig.materia.hora}`);
  if (asig.enlaceVirtual) timeParts.push(asig.enlaceVirtual);
  if (asig.contrasena) timeParts.push(`Contraseña: "${asig.contrasena}"`);
  if (timeParts.length > 0) lines.push(timeParts.join(' '));
  return lines.join('\n');
};

const formatSessionDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  const day = d.getUTCDate();
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${day} ${months[d.getUTCMonth()]}`;
};

export const AdminDashboard: React.FC = () => {
  const [asignaciones, setAsignaciones] = useState<AsignacionFull[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [filterNivel, setFilterNivel] = useState('');
  const [filterCentro, setFilterCentro] = useState('');
  const [filterBloques, setFilterBloques] = useState<string[]>([]);
  const [filterDia, setFilterDia] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Copy state
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Edit modal state
  const [editingAsig, setEditingAsig] = useState<AsignacionFull | null>(null);
  const [editDia, setEditDia] = useState('');
  const [editHora, setEditHora] = useState('');
  const [editFecha, setEditFecha] = useState(''); // for single session date override
  const [editEnlace, setEditEnlace] = useState('');
  const [editContrasena, setEditContrasena] = useState('');
  const [editStep, setEditStep] = useState<'form' | 'choose'>('form');
  const [upcomingSesiones, setUpcomingSesiones] = useState<UpcomingSesion[]>([]);
  const [selectedSesionId, setSelectedSesionId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Conflicts
  const [conflicts, setConflicts] = useState<any>(null);
  const [conflictsLoading, setConflictsLoading] = useState(false);

  // Change tracking: store recently modified materia IDs and their previous values
  const [recentChanges, setRecentChanges] = useState<Array<{
    materiaId: number;
    prevDia: string | null;
    prevHora: string | null;
    timestamp: number;
  }>>([]);

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
    asignaciones.forEach((a) => set.set(a.materia.nivel.numero, `${a.materia.nivel.numero}°`));
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
    asignaciones.forEach((a) => { if (a.materia.dia) set.add(a.materia.dia); });
    return order.filter((d) => set.has(d));
  }, [asignaciones]);

  // Apply filters
  const filtered = useMemo(() => {
    return asignaciones.filter((a) => {
      if (searchText) {
        const q = searchText.toLowerCase();
        const matches =
          a.materia.nombre.toLowerCase().includes(q) ||
          a.materia.nombreCorto.toLowerCase().includes(q) ||
          a.docente.nombre.toLowerCase().includes(q) ||
          a.centro.nombre.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (filterNivel && a.materia.nivel.numero !== parseInt(filterNivel)) return false;
      if (filterCentro && a.centro.id !== parseInt(filterCentro)) return false;
      if (filterBloques.length > 0 && !filterBloques.includes(getBloqueLabel(a))) return false;
      if (filterDia && a.materia.dia !== filterDia) return false;
      return true;
    });
  }, [asignaciones, searchText, filterNivel, filterCentro, filterBloques, filterDia]);

  // Sort filtered
  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      switch (sortCol) {
        case 'nivel': aVal = a.materia.nivel.numero; bVal = b.materia.nivel.numero; break;
        case 'centro': aVal = a.centro.nombre; bVal = b.centro.nombre; break;
        case 'bloque': aVal = getBloqueLabel(a); bVal = getBloqueLabel(b); break;
        case 'asignatura': aVal = a.materia.nombre; bVal = b.materia.nombre; break;
        case 'docente': aVal = a.docente.nombre; bVal = b.docente.nombre; break;
        case 'dia': aVal = DIAS.indexOf(a.materia.dia || ''); bVal = DIAS.indexOf(b.materia.dia || ''); break;
        case 'hora': aVal = a.materia.hora || ''; bVal = b.materia.hora || ''; break;
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortCol, sortDir]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const handleCopyOne = async (asig: AsignacionFull) => {
    await navigator.clipboard.writeText(buildWhatsAppMsg(asig));
    setCopiedId(asig.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCopyAll = async () => {
    const text = sorted.map((a) => buildWhatsAppMsg(a)).join('\n\n─────\n\n');
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
      console.error(err);
    } finally {
      setConflictsLoading(false);
    }
  };

  // === EDIT MODAL LOGIC ===
  const openEditModal = async (asig: AsignacionFull) => {
    setEditingAsig(asig);
    setEditDia(asig.materia.dia || '');
    setEditHora(asig.materia.hora || '');
    setEditFecha('');
    setEditEnlace(asig.enlaceVirtual || '');
    setEditContrasena(asig.contrasena || '');
    setEditStep('form');
    setSaveMsg('');
    setSelectedSesionId(null);

    // Fetch upcoming sessions for this materia
    try {
      const res = await client.get<UpcomingSesion[]>(`/admin/materias/${asig.materia.id}/sesiones-upcoming`);
      setUpcomingSesiones(res.data);
    } catch {
      setUpcomingSesiones([]);
    }
  };

  const closeEditModal = () => {
    setEditingAsig(null);
    setEditStep('form');
    setSaveMsg('');
  };

  const handleEditNext = () => {
    setEditStep('choose');
  };

  const handleSaveAll = async () => {
    if (!editingAsig) return;
    setSaving(true);
    setSaveMsg('');
    try {
      // Store previous values for undo
      const prevDia = editingAsig.materia.dia;
      const prevHora = editingAsig.materia.hora;

      await client.patch(`/admin/materias/${editingAsig.materia.id}`, {
        dia: editDia || null,
        hora: editHora || null,
      });

      // Save enlace + contrasena on the asignacion if changed
      const enlaceChanged = editEnlace !== (editingAsig.enlaceVirtual || '');
      const contrasenaChanged = editContrasena !== (editingAsig.contrasena || '');
      if (enlaceChanged || contrasenaChanged) {
        await client.patch(`/admin/asignaciones/${editingAsig.id}`, {
          enlaceVirtual: editEnlace || null,
          contrasena: editContrasena || null,
        });
      }

      // Track this change for undo/highlight
      setRecentChanges((prev) => [
        { materiaId: editingAsig.materia.id, prevDia, prevHora, timestamp: Date.now() },
        ...prev,
      ]);

      // Update local state
      setAsignaciones((prev) =>
        prev.map((a) =>
          a.materia.id === editingAsig.materia.id
            ? { ...a, materia: { ...a.materia, dia: editDia || null, hora: editHora || null },
                ...(a.id === editingAsig.id ? { enlaceVirtual: editEnlace || null, contrasena: editContrasena || null } : {}) }
            : a
        )
      );
      setSaveMsg('Todos los eventos actualizados');
      setTimeout(closeEditModal, 1200);
    } catch (err) {
      setSaveMsg('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleUndo = async () => {
    if (recentChanges.length === 0) return;
    const lastChange = recentChanges[0];
    try {
      await client.patch(`/admin/materias/${lastChange.materiaId}`, {
        dia: lastChange.prevDia,
        hora: lastChange.prevHora,
      });
      // Revert local state
      setAsignaciones((prev) =>
        prev.map((a) =>
          a.materia.id === lastChange.materiaId
            ? { ...a, materia: { ...a.materia, dia: lastChange.prevDia, hora: lastChange.prevHora } }
            : a
        )
      );
      setRecentChanges((prev) => prev.slice(1));
    } catch {
      console.error('Error al deshacer');
    }
  };

  const handleSaveSingle = async () => {
    if (!selectedSesionId) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const patchData: Record<string, any> = {};
      if (editHora) patchData.hora = editHora;
      if (editFecha) patchData.fecha = editFecha;

      await client.patch(`/admin/sesiones-online/${selectedSesionId}`, patchData);

      // Update local upcoming sessions list to reflect the change
      setUpcomingSesiones((prev) =>
        prev.map((s) =>
          s.id === selectedSesionId
            ? { ...s, hora: editHora || s.hora, fecha: editFecha || s.fecha }
            : s
        )
      );

      setSaveMsg('Sesión individual actualizada correctamente');
      setTimeout(closeEditModal, 1500);
    } catch (err) {
      setSaveMsg('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout pageTitle="Panel de Administración">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-header text-white rounded-lg p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Panel de Administración</h2>
            <p className="text-sm opacity-80">EIB en Línea</p>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-lg px-4 py-2 text-sm font-semibold">
            {sorted.length}/{asignaciones.length}
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
            <select value={filterNivel} onChange={(e) => setFilterNivel(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">Todos los niveles</option>
              {niveles.map(([num, label]) => <option key={num} value={num}>{label}</option>)}
            </select>
            <select value={filterCentro} onChange={(e) => setFilterCentro(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">Todos los centros</option>
              {centros.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
            </select>
            <div className="flex items-center gap-3 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <span className="text-gray-500 text-xs font-medium">Bloque:</span>
              {['1ER BLOQUE', '2DO BLOQUE', 'SEMESTRAL'].map((b) => {
                const labels: Record<string, string> = { '1ER BLOQUE': '1er', '2DO BLOQUE': '2do', 'SEMESTRAL': 'Sem.' };
                const checked = filterBloques.includes(b);
                return (
                  <label key={b} className="flex items-center gap-1 cursor-pointer select-none">
                    <input type="checkbox" checked={checked}
                      onChange={() => setFilterBloques(checked ? filterBloques.filter((x) => x !== b) : [...filterBloques, b])}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-xs">{labels[b]}</span>
                  </label>
                );
              })}
            </div>
            <select value={filterDia} onChange={(e) => setFilterDia(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">Todos los días</option>
              {dias.map((dia) => <option key={dia} value={dia}>{dia}</option>)}
            </select>
            <button onClick={handleCopyAll}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium whitespace-nowrap">
              {copiedAll ? <Check size={16} /> : <Copy size={16} />}
              {copiedAll ? 'Copiado!' : 'Copiar filtrados'}
            </button>
            {recentChanges.length > 0 && (
              <button onClick={handleUndo}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition text-sm font-medium whitespace-nowrap"
                title="Deshacer último cambio">
                <Undo2 size={16} />
                Deshacer ({recentChanges.length})
              </button>
            )}
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
                    {[
                      { id: 'nivel', label: 'Nivel' },
                      { id: 'centro', label: 'Centro' },
                      { id: 'bloque', label: 'Bloque' },
                      { id: 'asignatura', label: 'Asignatura' },
                      { id: 'docente', label: 'Docente' },
                      { id: 'dia', label: 'Día' },
                      { id: 'hora', label: 'Hora' },
                    ].map((col) => (
                      <th key={col.id} className="px-4 py-3 text-left font-semibold text-gray-600">
                        <button onClick={() => handleSort(col.id)}
                          className="flex items-center gap-1 hover:text-blue-600 transition group">
                          {col.label}
                          {sortCol === col.id ? (
                            sortDir === 'asc' ? <ChevronUp size={14} className="text-blue-600" /> : <ChevronDown size={14} className="text-blue-600" />
                          ) : (
                            <ChevronsUpDown size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Enlace</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((asig, idx) => {
                    const bloqueLabel = getBloqueLabel(asig);
                    const bloqueColor = getBloqueColor(bloqueLabel);
                    const is2do = bloqueLabel === '2DO BLOQUE';
                    const isRecentlyChanged = recentChanges.some((c) => c.materiaId === asig.materia.id);

                    return (
                      <tr key={asig.id}
                        className={`border-b transition ${isRecentlyChanged ? 'bg-amber-50 border-l-4 border-l-amber-400 border-b-amber-100' : `border-gray-100 hover:bg-blue-50/50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}`}>
                        <td className="px-4 py-3 font-medium text-gray-900">{asig.materia.nivel.numero}°</td>
                        <td className="px-4 py-3 text-gray-700">{asig.centro.nombre}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded ${bloqueColor}`}>{bloqueLabel}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{asig.materia.nombre}</td>
                        <td className="px-4 py-3 text-gray-700">{asig.docente.nombre}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {is2do && !asig.materia.dia
                            ? <span className="text-amber-600 text-xs font-medium">Por confirmar</span>
                            : asig.materia.dia || '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {is2do && !asig.materia.hora
                            ? <span className="text-amber-600 text-xs font-medium">Por confirmar</span>
                            : asig.materia.hora || '—'}
                        </td>
                        <td className="px-4 py-3">
                          {asig.enlaceVirtual ? (
                            <a href={asig.enlaceVirtual} target="_blank" rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800" title={asig.enlaceVirtual}>
                              <ExternalLink size={16} />
                            </a>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openEditModal(asig)}
                              className="p-1.5 rounded hover:bg-blue-100 transition text-gray-500 hover:text-blue-600"
                              title="Editar día/hora">
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => handleCopyOne(asig)}
                              className="p-1.5 rounded hover:bg-gray-100 transition text-gray-500 hover:text-green-600"
                              title="Copiar WhatsApp">
                              {copiedId === asig.id ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {sorted.length === 0 && !isLoading && (
                <div className="p-8 text-center text-gray-500">No se encontraron asignaciones con los filtros actuales</div>
              )}
            </div>
          )}
        </div>

        {/* Conflict Detection */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle size={20} />
            Detección de Cruces de Horario
          </h3>
          <button onClick={handleDetectConflicts} disabled={conflictsLoading}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50">
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
                  {conflicts.conflicts.map((c: any, idx: number) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4">
                      <p className="font-semibold text-gray-900 mb-2">
                        {c.docenteNombre}
                        <span className="ml-2 text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                          {c.type === 'asignacion' ? 'Asignación' : 'Presencial'}
                        </span>
                      </p>
                      <div className="space-y-1">
                        {c.conflicts.map((item: any, i: number) => (
                          <div key={i} className="text-sm bg-gray-50 p-2 rounded">
                            <span className="font-medium">{item.materiaNombre}</span>
                            <span className="text-gray-500 ml-2">— {item.centroNombre}</span>
                            {item.dia && <span className="text-gray-500 ml-2">{item.dia} {item.hora}</span>}
                            {item.fechaPresencial && (
                              <span className="text-gray-500 ml-2">{item.fechaPresencial} {item.horaInicio}-{item.horaFin}</span>
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

      {/* ===== EDIT MODAL ===== */}
      {editingAsig && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Editar Horario</h3>
                <p className="text-sm text-gray-500">{editingAsig.materia.nombre}</p>
              </div>
              <button onClick={closeEditModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {/* Step 1: Edit form */}
            {editStep === 'form' && (
              <div className="p-5 space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p><span className="font-medium">Docente:</span> {editingAsig.docente.nombre}</p>
                  <p><span className="font-medium">Centro:</span> {editingAsig.centro.nombre}</p>
                  <p><span className="font-medium">Actual:</span> {editingAsig.materia.dia || '—'} | {editingAsig.materia.hora || '—'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Día</label>
                  <select value={editDia} onChange={(e) => setEditDia(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Sin día</option>
                    {DIAS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                  <input type="time" value={editHora} onChange={(e) => setEditHora(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enlace (Zoom, Meet, etc.)</label>
                  <input type="url" value={editEnlace} onChange={(e) => setEditEnlace(e.target.value)}
                    placeholder="https://zoom.us/j/123456"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña (opcional)</label>
                  <input type="text" value={editContrasena} onChange={(e) => setEditContrasena(e.target.value)}
                    placeholder="Contraseña de la sala"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>

                <button onClick={handleEditNext}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
                  Continuar
                </button>
              </div>
            )}

            {/* Step 2: Choose scope */}
            {editStep === 'choose' && (
              <div className="p-5 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <p className="font-medium">Nuevo horario:</p>
                  <p>{editDia || '(sin día)'} | {editHora || '(sin hora)'}</p>
                </div>

                <p className="text-sm font-medium text-gray-700">¿Aplicar cambio a:</p>

                {/* Option 1: All events */}
                <button onClick={handleSaveAll} disabled={saving}
                  className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition disabled:opacity-50">
                  <p className="font-bold text-gray-900">Todos los eventos</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Cambia el horario base de la materia y actualiza TODAS las sesiones online futuras.
                    Se refleja en la app web y en las suscripciones de calendario.
                  </p>
                </button>

                {/* Option 2: Single event */}
                <div className="border-2 border-gray-200 rounded-lg p-4">
                  <p className="font-bold text-gray-900 mb-2">Solo un evento específico</p>
                  <p className="text-sm text-gray-600 mb-3">
                    Cambia la fecha y/o hora de UNA sola sesión. El horario base no se modifica.
                  </p>

                  {upcomingSesiones.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No hay sesiones futuras para esta materia</p>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                        {upcomingSesiones.map((s) => (
                          <label key={s.id}
                            className={`flex items-center gap-3 p-2 rounded cursor-pointer text-sm transition ${
                              selectedSesionId === s.id ? 'bg-blue-100 border border-blue-300' : 'hover:bg-gray-50 border border-transparent'
                            }`}>
                            <input type="radio" name="sesion" value={s.id}
                              checked={selectedSesionId === s.id}
                              onChange={() => {
                                setSelectedSesionId(s.id);
                                // Pre-fill the date with the session's current date
                                const d = new Date(s.fecha);
                                const yyyy = d.getUTCFullYear();
                                const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
                                const dd = String(d.getUTCDate()).padStart(2, '0');
                                setEditFecha(`${yyyy}-${mm}-${dd}`);
                              }}
                              className="text-blue-600" />
                            <span className="font-medium">{formatSessionDate(s.fecha)}</span>
                            <span className="text-gray-500">{s.hora}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                              {s.tipo === 'tutoria' ? 'Tutoría' : 'Clase'} U.{s.unidad}
                            </span>
                          </label>
                        ))}
                      </div>

                      {selectedSesionId && (
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nueva fecha para esta sesión</label>
                          <input type="date" value={editFecha}
                            onChange={(e) => setEditFecha(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                        </div>
                      )}
                    </>
                  )}

                  <button onClick={handleSaveSingle}
                    disabled={saving || !selectedSesionId}
                    className="mt-3 w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                    Aplicar solo a este evento
                  </button>
                </div>

                {/* Feedback */}
                {saveMsg && (
                  <div className={`p-3 rounded-lg text-sm font-medium text-center ${
                    saveMsg.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                  }`}>
                    {saveMsg}
                  </div>
                )}

                <button onClick={() => setEditStep('form')}
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition">
                  Volver
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
