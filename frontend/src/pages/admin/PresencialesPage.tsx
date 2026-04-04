import React, { useEffect, useState, useMemo } from 'react';
import client from '../../api/client';
import { AdminLayout } from '../../components/AdminLayout';
import { DataTable } from '../../components/admin/DataTable';
import type { Column } from '../../components/admin/DataTable';
import { FormModal } from '../../components/admin/FormModal';
import type { FormField } from '../../components/admin/FormModal';
import type { SesionPresencial, Materia, Centro, Docente } from '../../types';
import { Plus, AlertCircle, Filter, X } from 'lucide-react';

const formatFecha = (raw: string): string => {
  try {
    const d = new Date(raw);
    return d.toLocaleDateString('es-EC', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return raw;
  }
};

export const PresencialesPage: React.FC = () => {
  const [sesiones, setSesiones] = useState<SesionPresencial[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SesionPresencial | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filters
  const [filterMateria, setFilterMateria] = useState('');
  const [filterCentro, setFilterCentro] = useState('');
  const [filterBimestre, setFilterBimestre] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const columns: Column<SesionPresencial>[] = [
    {
      key: 'materia',
      label: 'Materia',
      render: (_, row) => row.materia?.nombre || '-',
      sortValue: (row) => row.materia?.nombre || '',
    },
    {
      key: 'fecha',
      label: 'Fecha',
      render: (val) => formatFecha(String(val)),
      sortValue: (row) => new Date(row.fecha).getTime(),
    },
    { key: 'diaSemana', label: 'Día' },
    { key: 'horaInicio', label: 'Inicio' },
    {
      key: 'centro',
      label: 'Centro',
      render: (_, row) => row.centro?.nombre || '-',
      sortValue: (row) => row.centro?.nombre || '',
    },
    { key: 'bimestre', label: 'Bimestre' },
  ];

  const formFields: FormField[] = [
    {
      name: 'materiaId',
      label: 'Materia',
      type: 'select',
      required: true,
      options: materias.map((m) => ({ value: m.id, label: m.nombre })),
      value: editingItem?.materiaId || '',
    },
    {
      name: 'centroId',
      label: 'Centro',
      type: 'select',
      required: true,
      options: centros.map((c) => ({ value: c.id, label: c.nombre })),
      value: editingItem?.centroId || '',
    },
    {
      name: 'docenteId',
      label: 'Docente (Opcional)',
      type: 'select',
      options: docentes.map((d) => ({ value: d.id, label: d.nombre })),
      value: editingItem?.docenteId || '',
    },
    {
      name: 'fecha',
      label: 'Fecha',
      type: 'date',
      required: true,
      value: editingItem?.fecha ? editingItem.fecha.split('T')[0] : '',
    },
    {
      name: 'diaSemana',
      label: 'Día de la Semana',
      type: 'select',
      options: [
        { value: 'Lunes', label: 'Lunes' },
        { value: 'Martes', label: 'Martes' },
        { value: 'Miércoles', label: 'Miércoles' },
        { value: 'Jueves', label: 'Jueves' },
        { value: 'Viernes', label: 'Viernes' },
        { value: 'Sábado', label: 'Sábado' },
        { value: 'Domingo', label: 'Domingo' },
      ],
      value: editingItem?.diaSemana || '',
    },
    {
      name: 'horaInicio',
      label: 'Hora de Inicio',
      type: 'text',
      placeholder: 'ej: 08:00',
      required: true,
      value: editingItem?.horaInicio || '',
    },
    {
      name: 'horaFin',
      label: 'Hora de Fin',
      type: 'text',
      placeholder: 'ej: 10:00',
      required: true,
      value: editingItem?.horaFin || '',
    },
    {
      name: 'tipo',
      label: 'Tipo',
      type: 'text',
      placeholder: 'ej: Clase, Taller, Tutoría',
      value: editingItem?.tipo || '',
    },
    {
      name: 'bimestre',
      label: 'Bimestre',
      type: 'number',
      value: editingItem?.bimestre || '',
    },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [sesionesRes, materiasRes, centrosRes, docentesRes] = await Promise.all([
        client.get<{ data: SesionPresencial[] }>('/admin/sesiones-presenciales?limit=500'),
        client.get<{ data: Materia[] }>('/admin/materias?limit=500'),
        client.get<{ data: Centro[] }>('/admin/centros'),
        client.get<{ data: Docente[] }>('/admin/docentes?limit=500'),
      ]);
      setSesiones(sesionesRes.data.data);
      setMaterias(materiasRes.data.data);
      setCentros(centrosRes.data.data);
      setDocentes(docentesRes.data.data);
    } catch (err) {
      setError('Error al cargar datos');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Derive unique values for filters
  const uniqueMaterias = useMemo(() => {
    const names = new Set(sesiones.map((s) => s.materia?.nombre).filter(Boolean));
    return Array.from(names).sort() as string[];
  }, [sesiones]);

  const uniqueCentros = useMemo(() => {
    const names = new Set(sesiones.map((s) => s.centro?.nombre).filter(Boolean));
    return Array.from(names).sort() as string[];
  }, [sesiones]);

  const uniqueBimestres = useMemo(() => {
    const vals = new Set(sesiones.map((s) => s.bimestre).filter((b) => b != null));
    return Array.from(vals).sort((a, b) => (a as number) - (b as number));
  }, [sesiones]);

  // Apply filters
  const filteredSesiones = useMemo(() => {
    return sesiones.filter((s) => {
      if (filterMateria && s.materia?.nombre !== filterMateria) return false;
      if (filterCentro && s.centro?.nombre !== filterCentro) return false;
      if (filterBimestre && String(s.bimestre) !== filterBimestre) return false;
      return true;
    });
  }, [sesiones, filterMateria, filterCentro, filterBimestre]);

  const activeFilterCount = [filterMateria, filterCentro, filterBimestre].filter(Boolean).length;

  const clearFilters = () => {
    setFilterMateria('');
    setFilterCentro('');
    setFilterBimestre('');
  };

  const handleEdit = (item: SesionPresencial) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (item: SesionPresencial) => {
    if (window.confirm('¿Eliminar esta sesión?')) {
      try {
        await client.delete(`/admin/sesiones-presenciales/${item.id}`);
        setSesiones(sesiones.filter((s) => s.id !== item.id));
      } catch (err) {
        setError('Error al eliminar sesión');
        console.error(err);
      }
    }
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      setIsSaving(true);
      if (editingItem) {
        await client.put(`/admin/sesiones-presenciales/${editingItem.id}`, data);
      } else {
        await client.post('/admin/sesiones-presenciales', data);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      await fetchData();
    } catch (err) {
      setError('Error al guardar sesión');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout pageTitle="Sesiones Presenciales">
      <div className="space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">Sesiones Presenciales</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                activeFilterCount > 0
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter size={16} />
              Filtros{activeFilterCount > 0 && ` (${activeFilterCount})`}
            </button>
            <button
              onClick={() => {
                setEditingItem(null);
                setIsModalOpen(true);
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              Nueva Sesión
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-md p-4 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Materia</label>
              <select
                value={filterMateria}
                onChange={(e) => setFilterMateria(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Todas</option>
                {uniqueMaterias.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Centro</label>
              <select
                value={filterCentro}
                onChange={(e) => setFilterCentro(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                {uniqueCentros.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[100px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Bimestre</label>
              <select
                value={filterBimestre}
                onChange={(e) => setFilterBimestre(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                {uniqueBimestres.map((b) => (
                  <option key={String(b)} value={String(b)}>{b}</option>
                ))}
              </select>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <X size={14} />
                Limpiar
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <DataTable<SesionPresencial>
            data={filteredSesiones}
            columns={columns}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={isLoading}
            pageSize={50}
          />
        </div>
      </div>

      <FormModal
        title={editingItem ? 'Editar Sesión' : 'Nueva Sesión Presencial'}
        fields={formFields}
        isOpen={isModalOpen}
        isLoading={isSaving}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleSubmit}
      />
    </AdminLayout>
  );
};
