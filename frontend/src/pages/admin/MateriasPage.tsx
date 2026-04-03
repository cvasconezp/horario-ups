import React, { useEffect, useState } from 'react';
import client from '../../api/client';
import { AdminLayout } from '../../components/AdminLayout';
import { DataTable } from '../../components/admin/DataTable';
import type { Column } from '../../components/admin/DataTable';
import { FormModal } from '../../components/admin/FormModal';
import type { FormField } from '../../components/admin/FormModal';
import type { Materia, Nivel, Periodo } from '../../types';
import { Plus, AlertCircle } from 'lucide-react';

export const MateriasPage: React.FC = () => {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Materia | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const columns: Column<Materia>[] = [
    { key: 'nombre', label: 'Materia', sortable: true },
    { key: 'nombreCorto', label: 'Código' },
    { key: 'tipo', label: 'Tipo', sortable: true },
    { key: 'dia', label: 'Día' },
  ];

  const formFields: FormField[] = [
    {
      name: 'nombre',
      label: 'Nombre de la Materia',
      type: 'text',
      required: true,
      value: editingItem?.nombre || '',
    },
    {
      name: 'nombreCorto',
      label: 'Código/Abreviatura',
      type: 'text',
      required: true,
      value: editingItem?.nombreCorto || '',
    },
    {
      name: 'nivelId',
      label: 'Nivel',
      type: 'select',
      required: true,
      options: niveles.map((n) => ({ value: n.id, label: n.nombre })),
      value: editingItem?.nivelId || '',
    },
    {
      name: 'periodoId',
      label: 'Período',
      type: 'select',
      required: true,
      options: periodos.map((p) => ({ value: p.id, label: p.label })),
      value: editingItem?.periodoId || '',
    },
    {
      name: 'tipo',
      label: 'Tipo',
      type: 'select',
      options: [
        { value: 'Teórica', label: 'Teórica' },
        { value: 'Práctica', label: 'Práctica' },
        { value: 'Mixta', label: 'Mixta' },
      ],
      value: editingItem?.tipo || '',
    },
    {
      name: 'dia',
      label: 'Día de la Semana',
      type: 'select',
      options: [
        { value: 'Lunes', label: 'Lunes' },
        { value: 'Martes', label: 'Martes' },
        { value: 'Miércoles', label: 'Miércoles' },
        { value: 'Jueves', label: 'Jueves' },
        { value: 'Viernes', label: 'Viernes' },
      ],
      value: editingItem?.dia || '',
    },
    {
      name: 'hora',
      label: 'Hora',
      type: 'text',
      placeholder: 'ej: 08:00',
      value: editingItem?.hora || '',
    },
    {
      name: 'duracion',
      label: 'Duración (horas)',
      type: 'number',
      value: editingItem?.duracion || '',
    },
    {
      name: 'bimestreOC',
      label: 'Bloque Zona Norte',
      type: 'number',
      value: editingItem?.bimestreOC || '',
    },
    {
      name: 'bimestreRL',
      label: 'Bloque Zona Sur',
      type: 'number',
      value: editingItem?.bimestreRL || '',
    },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [materiasRes, nivelesRes, periodosRes] = await Promise.all([
        client.get<{ data: Materia[] }>('/admin/materias'),
        client.get<{ data: Nivel[] }>('/admin/niveles'),
        client.get<{ data: Periodo[] }>('/admin/periodos'),
      ]);
      setMaterias(materiasRes.data.data);
      setNiveles(nivelesRes.data.data);
      setPeriodos(periodosRes.data.data);
    } catch (err) {
      setError('Error al cargar datos');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item: Materia) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (item: Materia) => {
    if (window.confirm(`¿Eliminar materia "${item.nombre}"?`)) {
      try {
        await client.delete(`/admin/materias/${item.id}`);
        setMaterias(materias.filter((m) => m.id !== item.id));
      } catch (err) {
        setError('Error al eliminar materia');
        console.error(err);
      }
    }
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      setIsSaving(true);
      if (editingItem) {
        await client.put(`/admin/materias/${editingItem.id}`, data);
      } else {
        await client.post('/admin/materias', data);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      await fetchData();
    } catch (err) {
      setError('Error al guardar materia');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout pageTitle="Gestionar Materias">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Materias</h1>
          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Nueva Materia
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <DataTable<Materia>
            data={materias}
            columns={columns}
            searchableFields={['nombre', 'nombreCorto']}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        </div>
      </div>

      <FormModal
        title={editingItem ? 'Editar Materia' : 'Nueva Materia'}
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
