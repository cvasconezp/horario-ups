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
  FileSpreadsheet,
  CheckSquare,
  Square,
  Loader2,
  Info,
} from 'lucide-react';
import type { Periodo } from '../../types';

/* ─── Export column definitions ─── */
interface ColumnOption {
  key: string;
  label: string;
  description: string;
  group: string;
}

const EXPORT_COLUMNS: ColumnOption[] = [
  { key: 'docenteNombre', label: 'Nombre del Docente', description: 'Nombre completo', group: 'Docente' },
  { key: 'docenteEmail', label: 'Correo del Docente', description: 'Email', group: 'Docente' },
  { key: 'asignatura', label: 'Asignatura', description: 'Nombre completo', group: 'Asignatura' },
  { key: 'asignaturaCorto', label: 'Asignatura (Corto)', description: 'Nombre abreviado', group: 'Asignatura' },
  { key: 'tipo', label: 'Tipo de Materia', description: 'Tipo', group: 'Asignatura' },
  { key: 'tutoria', label: 'Tutoría', description: 'Info de tutoría', group: 'Asignatura' },
  { key: 'nota', label: 'Nota', description: 'Notas adicionales', group: 'Asignatura' },
  { key: 'nivel', label: 'Nivel', description: 'Nombre del nivel', group: 'Nivel / Carrera' },
  { key: 'nivelNumero', label: 'Nivel #', description: 'Número del nivel', group: 'Nivel / Carrera' },
  { key: 'carrera', label: 'Carrera', description: 'Nombre de la carrera', group: 'Nivel / Carrera' },
  { key: 'centro', label: 'Centro (Grupo)', description: 'Centro / grupo', group: 'Centro / Grupo' },
  { key: 'zona', label: 'Zona', description: 'OC, RL, AN, WK', group: 'Centro / Grupo' },
  { key: 'dia', label: 'Día', description: 'Día de sesión online', group: 'Horario' },
  { key: 'hora', label: 'Hora', description: 'Hora de sesión online', group: 'Horario' },
  { key: 'duracion', label: 'Duración (min)', description: 'Duración en minutos', group: 'Horario' },
  { key: 'bimestreOC', label: 'Bimestre OC', description: 'Bimestre zona OC', group: 'Bimestres' },
  { key: 'bimestreRL', label: 'Bimestre RL', description: 'Bimestre zona RL', group: 'Bimestres' },
  { key: 'periodo', label: 'Período', description: 'Período académico', group: 'Otros' },
  { key: 'enlaceVirtual', label: 'Enlace Virtual', description: 'Link de la sesión', group: 'Otros' },
  { key: 'contrasena', label: 'Contraseña', description: 'Contraseña de sala', group: 'Otros' },
];
const EXPORT_GROUPS = [...new Set(EXPORT_COLUMNS.map((c) => c.group))];
const DEFAULT_EXPORT_COLS = ['docenteNombre', 'docenteEmail', 'asignatura', 'nivel', 'centro'];

interface AsignacionFull {
  id: number;
  materiaId: number;
  centroId: number;
  docenteId: number;
  enlaceVirtual: string | null;
  contrasena: string | null;
  diaOverride: string | null;
  horaOverride: string | null;
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

// Effective dia/hora considering per-asignacion overrides
const getEffectiveDia = (asig: AsignacionFull): string | null => asig.diaOverride || asig.materia.dia;
const getEffectiveHora = (asig: AsignacionFull): string | null => asig.horaOverride || asig.materia.hora;

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
  const eDia = getEffectiveDia(asig);
  const eHora = getEffectiveHora(asig);
  if (eDia) timeParts.push(eDia);
  if (eHora) timeParts.push(`| ${eHora}`);
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

  // ─── Export modal state ───
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportCols, setExportCols] = useState<Set<string>>(new Set(DEFAULT_EXPORT_COLS));
  const [exportPeriodos, setExportPeriodos] = useState<Periodo[]>([]);
  const [exportSelectedPeriodo, setExportSelectedPeriodo] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

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
    asignaciones.forEach((a) => { const d = getEffectiveDia(a); if (d) set.add(d); });
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
      if (filterDia && getEffectiveDia(a) !== filterDia) return false;
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
        case 'dia': aVal = DIAS.indexOf(getEffectiveDia(a) || ''); bVal = DIAS.indexOf(getEffectiveDia(b) || ''); break;
        case 'hora': aVal = getEffectiveHora(a) || ''; bVal = getEffectiveHora(b) || ''; break;
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

  // ─── Export modal helpers ───
  useEffect(() => {
    if (!showExportModal) return;
    const fetchPeriodos = async () => {
      try {
        const res = await client.get('/admin/periodos', { params: { limit: 100 } });
        const data = res.data.data || res.data;
        setExportPeriodos(Array.isArray(data) ? data : []);
      } catch { /* optional filter */ }
    };
    fetchPeriodos();
  }, [showExportModal]);

  const toggleExportCol = (key: string) => {
    setExportCols((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };
  const toggleExportGroup = (group: string) => {
    const keys = EXPORT_COLUMNS.filter((c) => c.group === group).map((c) => c.key);
    const all = keys.every((k) => exportCols.has(k));
    setExportCols((prev) => { const n = new Set(prev); keys.forEach((k) => all ? n.delete(k) : n.add(k)); return n; });
  };
  const isExportGroupSelected = (g: string) => EXPORT_COLUMNS.filter((c) => c.group === g).every((c) => exportCols.has(c.key));
  const isExportGroupPartial = (g: string) => {
    const keys = EXPORT_COLUMNS.filter((c) => c.group === g).map((c) => c.key);
    const cnt = keys.filter((k) => exportCols.has(k)).length;
    return cnt > 0 && cnt < keys.length;
  };

  const handleExport = async () => {
    if (exportCols.size === 0) { setExportError('Selecciona al menos una columna.'); return; }
    try {
      setIsExporting(true);
      setExportError(null);
      const payload: any = { columns: Array.from(exportCols) };
      if (exportSelectedPeriodo) payload.periodoId = parseInt(exportSelectedPeriodo);
      const response = await client.post('/admin/export-excel', payload, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'exportacion_horarios.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setShowExportModal(false);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Error al exportar.');
    } finally {
      setIsExporting(false);
    }
  };

  // === EDIT MODAL LOGIC ===
  const openEditModal = async (asig: AsignacionFull) => {
    setEditingAsig(asig);
    setEditDia(getEffectiveDia(asig) || '');
    setEditHora(getEffectiveHora(asig) || '');
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

      // Clear overrides on ALL asignaciones for this materia (base changed)
      const sameMateria = asignaciones.filter((a) => a.materia.id === editingAsig.materia.id && (a.diaOverride || a.horaOverride));
      for (const a of sameMateria) {
        await client.patch(`/admin/asignaciones/${a.id}`, { diaOverride: null, horaOverride: null });
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
                diaOverride: null, horaOverride: null,
                ...(a.id === editingAsig.id ? { enlaceVirtual: editEnlace || null, contrasena: editContrasena || null } : {}) }
            : a
        )
      );
      setSaveMsg('Todos los centros actualizados');
      setTimeout(closeEditModal, 1200);
    } catch (err) {
      setSaveMsg('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveThisCenter = async () => {
    if (!editingAsig) return;
    setSaving(true);
    setSaveMsg('');
    try {
      // Save dia/hora as overrides on THIS asignacion only
      await client.patch(`/admin/asignaciones/${editingAsig.id}`, {
        diaOverride: editDia || null,
        horaOverride: editHora || null,
        enlaceVirtual: editEnlace || null,
        contrasena: editContrasena || null,
      });

      // Update local state
      setAsignaciones((prev) =>
        prev.map((a) =>
          a.id === editingAsig.id
            ? { ...a, diaOverride: editDia || null, horaOverride: editHora || null,
                enlaceVirtual: editEnlace || null, contrasena: editContrasena || null }
            : a
        )
      );
      setSaveMsg(`Solo ${editingAsig.centro.nombre} actualizado`);
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
            <button onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium whitespace-nowrap">
              <FileSpreadsheet size={16} />
              Exportar Excel
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
                          {is2do && !getEffectiveDia(asig)
                            ? <span className="text-amber-600 text-xs font-medium">Por confirmar</span>
                            : <>
                                {getEffectiveDia(asig) || '—'}
                                {asig.diaOverride && <span className="ml-1 text-xs text-indigo-500" title="Día personalizado para este centro">★</span>}
                              </>}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {is2do && !getEffectiveHora(asig)
                            ? <span className="text-amber-600 text-xs font-medium">Por confirmar</span>
                            : <>
                                {getEffectiveHora(asig) || '—'}
                                {asig.horaOverride && <span className="ml-1 text-xs text-indigo-500" title="Hora personalizada para este centro">★</span>}
                              </>}
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
                  <p><span className="font-medium">Actual:</span> {getEffectiveDia(editingAsig) || '—'} | {getEffectiveHora(editingAsig) || '—'}
                    {(editingAsig.diaOverride || editingAsig.horaOverride) && <span className="text-indigo-500 text-xs ml-2">(personalizado para este centro)</span>}
                  </p>
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

                {/* Option 1: All centers */}
                <button onClick={handleSaveAll} disabled={saving}
                  className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition disabled:opacity-50">
                  <p className="font-bold text-gray-900">Todos los centros</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Cambia el horario base de la materia para TODOS los centros.
                    Se refleja en la app web y en las suscripciones de calendario.
                  </p>
                </button>

                {/* Option 2: This center only */}
                <button onClick={handleSaveThisCenter} disabled={saving}
                  className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition disabled:opacity-50">
                  <p className="font-bold text-gray-900">Solo este centro ({editingAsig?.centro.nombre})</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Personaliza el día/hora únicamente para <strong>{editingAsig?.centro.nombre}</strong>.
                    Los demás centros mantienen el horario base.
                  </p>
                </button>

                {/* Option 3: Single event */}
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
      {/* ===== EXPORT MODAL ===== */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FileSpreadsheet size={20} className="text-emerald-600" />
                  Exportar Datos a Excel
                </h3>
                <p className="text-sm text-gray-500 mt-1">Selecciona las columnas a incluir en el archivo.</p>
              </div>
              <button onClick={() => setShowExportModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2 text-xs text-blue-800">
                <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <span>El archivo incluye dos hojas: <strong>Asignaciones</strong> (detalle) y <strong>Cruce Docente-Asignaturas</strong> (resumen agrupado).</span>
              </div>

              {/* Period filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Período (opcional)</label>
                <select value={exportSelectedPeriodo} onChange={(e) => setExportSelectedPeriodo(e.target.value)}
                  className="w-full md:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="">Todos los períodos</option>
                  {exportPeriodos.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>

              {/* Column selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-800">Columnas a Exportar</span>
                  <div className="flex gap-2">
                    <button onClick={() => setExportCols(new Set(EXPORT_COLUMNS.map((c) => c.key)))}
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 font-medium">Todas</button>
                    <button onClick={() => setExportCols(new Set())}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 font-medium">Limpiar</button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                  {EXPORT_GROUPS.map((group) => {
                    const cols = EXPORT_COLUMNS.filter((c) => c.group === group);
                    const allSel = isExportGroupSelected(group);
                    const partial = isExportGroupPartial(group);
                    return (
                      <div key={group} className="border border-gray-200 rounded-lg">
                        <button onClick={() => toggleExportGroup(group)}
                          className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 transition rounded-t-lg text-sm">
                          {allSel ? <CheckSquare size={16} className="text-blue-600" /> :
                           partial ? <div className="w-4 h-4 border-2 border-blue-400 rounded bg-blue-100 flex items-center justify-center"><div className="w-2 h-0.5 bg-blue-500 rounded" /></div> :
                           <Square size={16} className="text-gray-400" />}
                          <span className="font-semibold text-gray-800">{group}</span>
                          <span className="text-xs text-gray-500 ml-auto">
                            {cols.filter((c) => exportCols.has(c.key)).length}/{cols.length}
                          </span>
                        </button>
                        <div className="px-3 py-1.5 space-y-0.5">
                          {cols.map((col) => (
                            <label key={col.key} className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-gray-50 cursor-pointer text-sm">
                              <input type="checkbox" checked={exportCols.has(col.key)}
                                onChange={() => toggleExportCol(col.key)}
                                className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                              <span className="text-gray-800 font-medium">{col.label}</span>
                              <span className="text-xs text-gray-400">— {col.description}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                <span className="font-semibold">{exportCols.size}</span> columna{exportCols.size !== 1 ? 's' : ''} seleccionada{exportCols.size !== 1 ? 's' : ''}
                {exportSelectedPeriodo
                  ? ` — Período: ${exportPeriodos.find((p) => p.id === parseInt(exportSelectedPeriodo))?.label || exportSelectedPeriodo}`
                  : ' — Todos los períodos'}
              </div>

              {/* Error */}
              {exportError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                  <AlertTriangle size={16} className="text-red-600 flex-shrink-0" />
                  {exportError}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowExportModal(false)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                  Cancelar
                </button>
                <button onClick={handleExport} disabled={isExporting || exportCols.size === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md text-sm">
                  {isExporting ? <><Loader2 size={16} className="animate-spin" /> Exportando...</> : <><FileSpreadsheet size={16} /> Exportar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
