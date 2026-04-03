import React, { useEffect, useState } from 'react';
import client from '../../api/client';
import { AdminLayout } from '../../components/AdminLayout';
import { DataTable } from '../../components/admin/DataTable';
import type { Column } from '../../components/admin/DataTable';
import { FormModal } from '../../components/admin/FormModal';
import type { FormField } from '../../components/admin/FormModal';
import type { Periodo, Carrera } from '../../types';
import { Plus, AlertCircle } from 'lucide-react';

export const PeriodosPage: React.FC = () => {
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Periodo | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const columns: Column<Periodo>[] = [
    { key: 'label', label: 'Período', sortable: true },
    { key: 'numero', label: 'Número', sortable: true },
    {
      key: 'fechaInicio',
      label: 'Fecha Inicio',
      render: (value) => new Date(String(value)).toLocaleDateString('es-ES'),
    },
    {
      key: 'fechaFin',
      label: 'Fecha Fin',
      render: (value) => new Date(String(value)).toLocaleDateString('es-ES'),
    },
    {
      key: 'activo',
      label: 'Estado',
      render: (value) => (value ? '✓ Activo' : '✗ Inactivo'),
    },
  ];

  const formFields: FormField[] = [
    {
      name: 'label',
      label: 'Etiqueta del Período',
      type: 'text',
      placeholder: 'ej: 2024-2025',
      required: true,
      value: editingItem?.label || '',
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
    {
      name: 'fechaInicio',
      label: 'Fecha de Inicio',
      type: 'date',
      required: true,
      value: editingItem?.fechaInicio || '',
    },
    {
      name: 'fechaFin',
      label: 'Fecha de Fin',
      type: 'date',
      required: true,
      value: editingItem?.fechaFin || '',
    },
    {
      name: 'activo',
      label: 'Activo',
      type: 'checkbox',
      value: editingItem?.activo ?? true,
    },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [periodosRes, carrerasRes] = await Promise.all([
        client.get<Periodo[]>('/admin/periodos'),
        client.get<Carrera[]>('/admin/carreras'),
      ]);
      setPeriodos(periodosRes.data);
      setCarreras(carrerasRes.data);
    } catch (err) {
      setError('Error al cargar datos');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item: Periodo) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (item: Periodo) => {
    if (window.confirm(`¿Eliminar período "${item.label}"?`)) {
      try {
        await client.delete(`/admin/periodos/${item.id}`);
        setPeriodos(periodos.filter((p) => p.id !== item.id));
      } catch (err) {
        setError('Error al eliminar período');
        console.error(err);
      }
    }
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      setIsSaving(true);
      if (editingItem) {
        await client.put(`/admin/periodos/${editingItem.id}`, data);
      } else {
        await client.post('/admin/periodos', data);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      await fetchData();
    } catch (err) {
      setError('Error al guardar período');
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
    <AdminLayout pageTitle="Gestionar Períodos">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Períodos</h1>
          <button onClick={handleCreateNew} className="btn-primary flex items-center gap-2">
            <Plus size={20} />
            Nuevo Período
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <DataTable<Periodo>
            data={periodos}
            columns={columns}
            searchableFields={['label']}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        </div>
      </div>

      <FormModal
        title={editingItem ? 'Editar Período' : 'Nuevo Período'}
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
