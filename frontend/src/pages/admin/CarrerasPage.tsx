import React, { useEffect, useState } from 'react';
import client from '../../api/client';
import { AdminLayout } from '../../components/AdminLayout';
import { DataTable } from '../../components/admin/DataTable';
import type { Column } from '../../components/admin/DataTable';
import { FormModal } from '../../components/admin/FormModal';
import type { FormField } from '../../components/admin/FormModal';
import type { Carrera } from '../../types';
import { Plus, AlertCircle } from 'lucide-react';

export const CarrerasPage: React.FC = () => {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Carrera | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const columns: Column<Carrera>[] = [
    { key: 'nombre', label: 'Nombre', sortable: true },
    { key: 'codigo', label: 'Código', sortable: true },
    {
      key: 'activa',
      label: 'Estado',
      render: (value) => (value ? '✓ Activa' : '✗ Inactiva'),
    },
  ];

  const formFields: FormField[] = [
    {
      name: 'nombre',
      label: 'Nombre de la Carrera',
      type: 'text',
      placeholder: 'ej: Ingeniería en Sistemas',
      required: true,
      value: editingItem?.nombre || '',
    },
    {
      name: 'codigo',
      label: 'Código',
      type: 'text',
      placeholder: 'ej: SIS',
      required: true,
      value: editingItem?.codigo || '',
    },
    {
      name: 'activa',
      label: 'Activa',
      type: 'checkbox',
      value: editingItem?.activa ?? true,
    },
  ];

  // Fetch carreras
  useEffect(() => {
    fetchCarreras();
  }, []);

  const fetchCarreras = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await client.get<Carrera[]>('/admin/carreras');
      setCarreras(response.data);
    } catch (err) {
      setError('Error al cargar carreras');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item: Carrera) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (item: Carrera) => {
    if (window.confirm(`¿Eliminar carrera "${item.nombre}"?`)) {
      try {
        await client.delete(`/admin/carreras/${item.id}`);
        setCarreras(carreras.filter((c) => c.id !== item.id));
      } catch (err) {
        setError('Error al eliminar carrera');
        console.error(err);
      }
    }
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      setIsSaving(true);
      if (editingItem) {
        await client.put(`/admin/carreras/${editingItem.id}`, data);
      } else {
        await client.post('/admin/carreras', data);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      await fetchCarreras();
    } catch (err) {
      setError('Error al guardar carrera');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNew = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  return (
    <AdminLayout pageTitle="Gestionar Carreras">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Carreras</h1>
          <button onClick={handleCreateNew} className="btn-primary flex items-center gap-2">
            <Plus size={20} />
            Nueva Carrera
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Data table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <DataTable<Carrera>
            data={carreras}
            columns={columns}
            searchableFields={['nombre', 'codigo']}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Form modal */}
      <FormModal
        title={editingItem ? 'Editar Carrera' : 'Nueva Carrera'}
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
