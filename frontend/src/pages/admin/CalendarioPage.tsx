import React, { useEffect, useState } from 'react';
import client from '../../api/client';
import { AdminLayout } from '../../components/AdminLayout';
import { DataTable } from '../../components/admin/DataTable';
import type { Column } from '../../components/admin/DataTable';
import { FormModal } from '../../components/admin/FormModal';
import type { FormField } from '../../components/admin/FormModal';
import type { CalendarioEvento, Periodo } from '../../types';
import { Plus, AlertCircle } from 'lucide-react';

export const CalendarioPage: React.FC = () => {
  const [eventos, setEventos] = useState<CalendarioEvento[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CalendarioEvento | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const columns: Column<CalendarioEvento>[] = [
    { key: 'tipo', label: 'Tipo', sortable: true },
    { key: 'fecha', label: 'Fecha de Inicio', sortable: true },
    {
      key: 'fechaFin',
      label: 'Fecha de Fin',
      render: (value) => (value ? new Date(String(value)).toLocaleDateString('es-ES') : '-'),
    },
    { key: 'nota', label: 'Descripción' },
    { key: 'bimestre', label: 'Bimestre' },
    {
      key: 'enlace' as any,
      label: 'Enlace',
      render: (value: any) => value ? '🔗' : '-',
    },
  ];

  const formFields: FormField[] = [
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
      label: 'Tipo de Evento',
      type: 'select',
      required: true,
      options: [
        { value: 'inicio_bimestre', label: 'Inicio de bimestre' },
        { value: 'entrega', label: 'Entrega de actividad' },
        { value: 'examen', label: 'Examen final' },
        { value: 'recuperacion', label: 'Examen de recuperación' },
        { value: 'paso_notas', label: 'Paso de notas' },
        { value: 'inicio_ingles', label: 'Inicio Inglés' },
        { value: 'induccion', label: 'Inducción' },
        { value: 'feriado', label: 'Feriado' },
        { value: 'eucaristia', label: 'Eucaristía' },
        { value: 'eleccion', label: 'Elección de directiva' },
        { value: 'evento_cultural', label: 'Evento cultural' },
        { value: 'reunion', label: 'Reunión' },
        { value: 'taller', label: 'Taller / Capacitación' },
        { value: 'otro', label: 'Otro' },
      ],
      value: editingItem?.tipo || '',
    },
    {
      name: 'fecha',
      label: 'Fecha de Inicio',
      type: 'date',
      required: true,
      value: editingItem?.fecha || '',
    },
    {
      name: 'fechaFin',
      label: 'Fecha de Fin (Opcional)',
      type: 'date',
      value: editingItem?.fechaFin || '',
    },
    {
      name: 'bimestre',
      label: 'Bimestre (Opcional)',
      type: 'number',
      value: editingItem?.bimestre || '',
    },
    {
      name: 'nota',
      label: 'Descripción/Notas',
      type: 'textarea',
      placeholder: 'Información adicional sobre el evento',
      value: editingItem?.nota || '',
    },
    {
      name: 'enlace',
      label: 'Enlace (Zoom, Meet, sitio web)',
      type: 'text',
      placeholder: 'https://zoom.us/j/123456 o cualquier URL',
      value: (editingItem as any)?.enlace || '',
    },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [eventosRes, periodosRes] = await Promise.all([
        client.get<{ data: CalendarioEvento[] }>('/admin/calendario'),
        client.get<{ data: Periodo[] }>('/admin/periodos'),
      ]);
      setEventos(eventosRes.data.data);
      setPeriodos(periodosRes.data.data);
    } catch (err) {
      setError('Error al cargar datos');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item: CalendarioEvento) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (item: CalendarioEvento) => {
    if (window.confirm('¿Eliminar este evento?')) {
      try {
        await client.delete(`/admin/calendario/${item.id}`);
        setEventos(eventos.filter((e) => e.id !== item.id));
      } catch (err) {
        setError('Error al eliminar evento');
        console.error(err);
      }
    }
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      setIsSaving(true);
      if (editingItem) {
        await client.put(`/admin/calendario/${editingItem.id}`, data);
      } else {
        await client.post('/admin/calendario', data);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      await fetchData();
    } catch (err) {
      setError('Error al guardar evento');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout pageTitle="Gestionar Calendario Académico">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Calendario Académico</h1>
          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Nuevo Evento
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <DataTable<CalendarioEvento>
            data={eventos}
            columns={columns}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        </div>
      </div>

      <FormModal
        title={editingItem ? 'Editar Evento' : 'Nuevo Evento'}
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
