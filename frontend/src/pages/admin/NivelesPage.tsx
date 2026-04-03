import React, { useEffect, useState } from 'react';
import client from '../../api/client';
import { AdminLayout } from '../../components/AdminLayout';
import { DataTable } from '../../components/admin/DataTable';
import type { Column } from '../../components/admin/DataTable';
import { FormModal } from '../../components/admin/FormModal';
import type { FormField } from '../../components/admin/FormModal';
import type { Nivel, Carrera } from '../../types';
import { Plus, AlertCircle } from 'lucide-react';

export const NivelesPage: React.FC = () => {
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Nivel | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const columns: Column<Nivel>[] = [
    { key: 'nombre', label: 'Nombre', sortable: true },
    { key: 'numero', label: 'Número de Nivel', sortable: true },
    { key: 'carreraId', label: 'Carrera', sortable: true },
  ];

  const formFields: FormField[] = [
    {
      name: 'nombre',
      label: 'Nombre del Nivel',
      type: 'text',
      placeholder: 'ej: Nivel 1',
      required: true,
      value: editingItem?.nombre || '',
    },
    {
      name: 'numero',
      label: 'Número',
      type: 'number',
      required: true,
      value: editingItem?.numero || '',
    },
    {
      name: 'carreraId',
      label: 'Carrera',
      type: 'select',
      required: true,
      options: carreras.map((c) => ({ value: c.id, label: c.nombre })),
      value: editingItem?.carreraId || '',
    },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [nivelesRes, carrerasRes] = await Promise.all([
        client.get<{ data: Nivel[] }>('/admin/niveles'),
        client.get<{ data: Carrera[] }>('/admin/carreras'),
      ]);
      setNiveles(nivelesRes.data.data);
      setCarreras(carrerasRes.data.data);
    } catch (err) {
      setError('Error al cargar datos');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item: Nivel) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (item: Nivel) => {
    if (window.confirm(`¿Eliminar nivel "${item.nombre}"?`)) {
      try {
        await client.delete(`/admin/niveles/${item.id}`);
        setNiveles(niveles.filter((n) => n.id !== item.id));
      } catch (err) {
        setError('Error al eliminar nivel');
        console.error(err);
      }
    }
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      setIsSaving(true);
      if (editingItem) {
        await client.put(`/admin/niveles/${editingItem.id}`, data);
      } else {
        await client.post('/admin/niveles', data);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      await fetchData();
    } catch (err) {
      setError('Error al guardar nivel');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout pageTitle="Gestionar Niveles">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Niveles</h1>
          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Nuevo Nivel
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <DataTable<Nivel>
            data={niveles}
            columns={columns}
            searchableFields={['nombre']}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        </div>
      </div>

      <FormModal
        title={editingItem ? 'Editar Nivel' : 'Nuevo Nivel'}
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
