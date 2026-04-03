import React, { useEffect, useState } from 'react';
import client from '../../api/client';
import { AdminLayout } from '../../components/AdminLayout';
import { DataTable } from '../../components/admin/DataTable';
import type { Column } from '../../components/admin/DataTable';
import { FormModal } from '../../components/admin/FormModal';
import type { FormField } from '../../components/admin/FormModal';
import type { Docente } from '../../types';
import { Plus, AlertCircle } from 'lucide-react';

export const DocentesPage: React.FC = () => {
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Docente | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const columns: Column<Docente>[] = [
    { key: 'nombre', label: 'Nombre', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
  ];

  const formFields: FormField[] = [
    {
      name: 'nombre',
      label: 'Nombre Completo',
      type: 'text',
      placeholder: 'ej: Juan García',
      required: true,
      value: editingItem?.nombre || '',
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      placeholder: 'ej: juan@ups.edu.ec',
      value: editingItem?.email || '',
    },
  ];

  useEffect(() => {
    fetchDocentes();
  }, []);

  const fetchDocentes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await client.get<{ data: Docente[] }>('/admin/docentes');
      setDocentes(response.data.data);
    } catch (err) {
      setError('Error al cargar docentes');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item: Docente) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (item: Docente) => {
    if (window.confirm(`¿Eliminar docente "${item.nombre}"?`)) {
      try {
        await client.delete(`/admin/docentes/${item.id}`);
        setDocentes(docentes.filter((d) => d.id !== item.id));
      } catch (err) {
        setError('Error al eliminar docente');
        console.error(err);
      }
    }
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      setIsSaving(true);
      if (editingItem) {
        await client.put(`/admin/docentes/${editingItem.id}`, data);
      } else {
        await client.post('/admin/docentes', data);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      await fetchDocentes();
    } catch (err) {
      setError('Error al guardar docente');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout pageTitle="Gestionar Docentes">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Docentes</h1>
          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Nuevo Docente
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <DataTable<Docente>
            data={docentes}
            columns={columns}
            searchableFields={['nombre', 'email']}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        </div>
      </div>

      <FormModal
        title={editingItem ? 'Editar Docente' : 'Nuevo Docente'}
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
