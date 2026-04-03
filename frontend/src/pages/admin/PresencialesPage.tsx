import React, { useEffect, useState } from 'react';
import client from '../../api/client';
import { AdminLayout } from '../../components/AdminLayout';
import { DataTable } from '../../components/admin/DataTable';
import type { Column } from '../../components/admin/DataTable';
import { FormModal } from '../../components/admin/FormModal';
import type { FormField } from '../../components/admin/FormModal';
import type { SesionPresencial, Materia, Centro, Docente } from '../../types';
import { Plus, AlertCircle } from 'lucide-react';

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

  const columns: Column<SesionPresencial>[] = [
    {
      key: 'materia',
      label: 'Materia',
      render: (_, row) => row.materia?.nombre || '-',
    },
    { key: 'fecha', label: 'Fecha', sortable: true },
    { key: 'diaSemana', label: 'Día' },
    { key: 'horaInicio', label: 'Inicio' },
    {
      key: 'centro',
      label: 'Centro',
      render: (_, row) => row.centro?.nombre || '-',
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
      value: editingItem?.fecha || '',
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
      placeholder: 'ej: Clase, Taller',
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
        client.get<{ data: SesionPresencial[] }>('/admin/sesiones-presenciales'),
        client.get<{ data: Materia[] }>('/admin/materias'),
        client.get<{ data: Centro[] }>('/admin/centros'),
        client.get<{ data: Docente[] }>('/admin/docentes'),
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
    <AdminLayout pageTitle="Gestionar Sesiones Presenciales">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Sesiones Presenciales</h1>
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

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <DataTable<SesionPresencial>
            data={sesiones}
            columns={columns}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={isLoading}
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
