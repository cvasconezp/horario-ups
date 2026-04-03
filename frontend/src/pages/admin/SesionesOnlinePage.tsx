import React, { useEffect, useState } from 'react';
import client from '../../api/client';
import { AdminLayout } from '../../components/AdminLayout';
import { DataTable } from '../../components/admin/DataTable';
import type { Column } from '../../components/admin/DataTable';
import { FormModal } from '../../components/admin/FormModal';
import type { FormField } from '../../components/admin/FormModal';
import type { SesionOnline, Materia } from '../../types';
import { Plus, AlertCircle } from 'lucide-react';

export const SesionesOnlinePage: React.FC = () => {
  const [sesiones, setSesiones] = useState<SesionOnline[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SesionOnline | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const columns: Column<SesionOnline>[] = [
    {
      key: 'materia',
      label: 'Materia',
      render: (_, row) => row.materia?.nombre || '-',
    },
    { key: 'fecha', label: 'Fecha', sortable: true },
    { key: 'hora', label: 'Hora' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'unidad', label: 'Unidad' },
    { key: 'grupo', label: 'Grupo' },
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
      name: 'fecha',
      label: 'Fecha',
      type: 'date',
      required: true,
      value: editingItem?.fecha || '',
    },
    {
      name: 'hora',
      label: 'Hora',
      type: 'text',
      placeholder: 'ej: 08:00',
      required: true,
      value: editingItem?.hora || '',
    },
    {
      name: 'tipo',
      label: 'Tipo',
      type: 'text',
      placeholder: 'ej: Clase, Taller',
      value: editingItem?.tipo || '',
    },
    {
      name: 'unidad',
      label: 'Unidad',
      type: 'number',
      value: editingItem?.unidad || '',
    },
    {
      name: 'grupo',
      label: 'Grupo',
      type: 'text',
      value: editingItem?.grupo || '',
    },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [sesionesRes, materiasRes] = await Promise.all([
        client.get<SesionOnline[]>('/admin/sesiones-online'),
        client.get<Materia[]>('/admin/materias'),
      ]);
      setSesiones(sesionesRes.data);
      setMaterias(materiasRes.data);
    } catch (err) {
      setError('Error al cargar datos');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item: SesionOnline) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (item: SesionOnline) => {
    if (window.confirm('¿Eliminar esta sesión?')) {
      try {
        await client.delete(`/admin/sesiones-online/${item.id}`);
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
        await client.put(`/admin/sesiones-online/${editingItem.id}`, data);
      } else {
        await client.post('/admin/sesiones-online', data);
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
    <AdminLayout pageTitle="Gestionar Sesiones Online">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Sesiones Online</h1>
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
          <DataTable<SesionOnline>
            data={sesiones}
            columns={columns}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        </div>
      </div>

      <FormModal
        title={editingItem ? 'Editar Sesión' : 'Nueva Sesión Online'}
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
