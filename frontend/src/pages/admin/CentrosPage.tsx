import React, { useEffect, useState } from 'react';
import client from '../../api/client';
import { AdminLayout } from '../../components/AdminLayout';
import { DataTable } from '../../components/admin/DataTable';
import type { Column } from '../../components/admin/DataTable';
import { FormModal } from '../../components/admin/FormModal';
import type { FormField } from '../../components/admin/FormModal';
import type { Centro } from '../../types';
import { Plus, AlertCircle } from 'lucide-react';

export const CentrosPage: React.FC = () => {
  const [centros, setCentros] = useState<Centro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Centro | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const columns: Column<Centro>[] = [
    { key: 'nombre', label: 'Nombre', sortable: true },
    { key: 'zona', label: 'Zona', sortable: true },
  ];

  const formFields: FormField[] = [
    {
      name: 'nombre',
      label: 'Nombre del Centro',
      type: 'text',
      placeholder: 'ej: Centro Quito',
      required: true,
      value: editingItem?.nombre || '',
    },
    {
      name: 'zona',
      label: 'Zona',
      type: 'select',
      required: true,
      options: [
        { value: 'OC', label: 'OC' },
        { value: 'RL', label: 'RL' },
        { value: 'AN', label: 'AN' },
        { value: 'WK', label: 'WK' },
      ],
      value: editingItem?.zona || '',
    },
  ];

  useEffect(() => {
    fetchCentros();
  }, []);

  const fetchCentros = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await client.get<{ data: Centro[] }>('/admin/centros');
      setCentros(response.data.data);
    } catch (err) {
      setError('Error al cargar centros');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item: Centro) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (item: Centro) => {
    if (window.confirm(`¿Eliminar centro "${item.nombre}"?`)) {
      try {
        await client.delete(`/admin/centros/${item.id}`);
        setCentros(centros.filter((c) => c.id !== item.id));
      } catch (err) {
        setError('Error al eliminar centro');
        console.error(err);
      }
    }
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      setIsSaving(true);
      if (editingItem) {
        await client.put(`/admin/centros/${editingItem.id}`, data);
      } else {
        await client.post('/admin/centros', data);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      await fetchCentros();
    } catch (err) {
      setError('Error al guardar centro');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout pageTitle="Gestionar Centros">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Centros</h1>
          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Nuevo Centro
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <DataTable<Centro>
            data={centros}
            columns={columns}
            searchableFields={['nombre', 'zona']}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        </div>
      </div>

      <FormModal
        title={editingItem ? 'Editar Centro' : 'Nuevo Centro'}
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
