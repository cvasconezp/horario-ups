import React, { useEffect, useState } from 'react';
import client from '../../api/client';
import { AdminLayout } from '../../components/AdminLayout';
import { DataTable } from '../../components/admin/DataTable';
import type { Column } from '../../components/admin/DataTable';
import { FormModal } from '../../components/admin/FormModal';
import type { FormField } from '../../components/admin/FormModal';
import type { Asignacion, Materia, Centro, Docente } from '../../types';
import { Plus, AlertCircle } from 'lucide-react';

export const AsignacionesPage: React.FC = () => {
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Asignacion | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const columns: Column<Asignacion>[] = [
    {
      key: 'materia',
      label: 'Materia',
      render: (_, row) => row.materia?.nombre || '-',
    },
    {
      key: 'centro',
      label: 'Centro',
      render: (_, row) => row.centro?.nombre || '-',
    },
    {
      key: 'docente',
      label: 'Docente',
      render: (_, row) => row.docente?.nombre || '-',
    },
    {
      key: 'enlaceVirtual',
      label: 'Enlace Virtual',
      render: (value) => (value ? '✓' : '-'),
    },
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
      label: 'Docente',
      type: 'select',
      required: true,
      options: docentes.map((d) => ({ value: d.id, label: d.nombre })),
      value: editingItem?.docenteId || '',
    },
    {
      name: 'enlaceVirtual',
      label: 'Enlace Virtual',
      type: 'text',
      placeholder: 'ej: https://meet.google.com/...',
      value: editingItem?.enlaceVirtual || '',
    },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [asignacionesRes, materiasRes, centrosRes, docentesRes] = await Promise.all([
        client.get<Asignacion[]>('/admin/asignaciones'),
        client.get<Materia[]>('/admin/materias'),
        client.get<Centro[]>('/admin/centros'),
        client.get<Docente[]>('/admin/docentes'),
      ]);
      setAsignaciones(asignacionesRes.data);
      setMaterias(materiasRes.data);
      setCentros(centrosRes.data);
      setDocentes(docentesRes.data);
    } catch (err) {
      setError('Error al cargar datos');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item: Asignacion) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (item: Asignacion) => {
    if (window.confirm('¿Eliminar esta asignación?')) {
      try {
        await client.delete(`/admin/asignaciones/${item.id}`);
        setAsignaciones(asignaciones.filter((a) => a.id !== item.id));
      } catch (err) {
        setError('Error al eliminar asignación');
        console.error(err);
      }
    }
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      setIsSaving(true);
      if (editingItem) {
        await client.put(`/admin/asignaciones/${editingItem.id}`, data);
      } else {
        await client.post('/admin/asignaciones', data);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      await fetchData();
    } catch (err) {
      setError('Error al guardar asignación');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout pageTitle="Gestionar Asignaciones">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Asignaciones</h1>
          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Nueva Asignación
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <DataTable<Asignacion>
            data={asignaciones}
            columns={columns}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        </div>
      </div>

      <FormModal
        title={editingItem ? 'Editar Asignación' : 'Nueva Asignación'}
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
