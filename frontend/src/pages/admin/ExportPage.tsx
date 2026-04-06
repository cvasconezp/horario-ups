import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import client from '../../api/client';
import {
  Download,
  FileSpreadsheet,
  CheckSquare,
  Square,
  AlertCircle,
  Loader2,
  Info,
} from 'lucide-react';
import type { Periodo } from '../../types';

interface ColumnOption {
  key: string;
  label: string;
  description: string;
  group: string;
}

const COLUMN_OPTIONS: ColumnOption[] = [
  // Docente
  { key: 'docenteNombre', label: 'Nombre del Docente', description: 'Nombre completo del docente asignado', group: 'Docente' },
  { key: 'docenteEmail', label: 'Correo del Docente', description: 'Dirección de correo electrónico', group: 'Docente' },
  // Asignatura
  { key: 'asignatura', label: 'Asignatura', description: 'Nombre completo de la asignatura', group: 'Asignatura' },
  { key: 'asignaturaCorto', label: 'Asignatura (Corto)', description: 'Nombre abreviado de la asignatura', group: 'Asignatura' },
  { key: 'tipo', label: 'Tipo de Materia', description: 'Tipo de la materia (ej: regular, optativa)', group: 'Asignatura' },
  { key: 'tutoria', label: 'Tutoría', description: 'Información de tutoría', group: 'Asignatura' },
  { key: 'nota', label: 'Nota', description: 'Notas adicionales de la materia', group: 'Asignatura' },
  // Nivel / Carrera
  { key: 'nivel', label: 'Nivel', description: 'Nombre del nivel académico', group: 'Nivel / Carrera' },
  { key: 'nivelNumero', label: 'Nivel #', description: 'Número del nivel', group: 'Nivel / Carrera' },
  { key: 'carrera', label: 'Carrera', description: 'Nombre de la carrera', group: 'Nivel / Carrera' },
  // Centro / Grupo
  { key: 'centro', label: 'Centro (Grupo)', description: 'Centro universitario / grupo asignado', group: 'Centro / Grupo' },
  { key: 'zona', label: 'Zona', description: 'Zona del centro (OC, RL, AN, WK)', group: 'Centro / Grupo' },
  // Horario
  { key: 'dia', label: 'Día', description: 'Día de la sesión online', group: 'Horario' },
  { key: 'hora', label: 'Hora', description: 'Hora de la sesión online', group: 'Horario' },
  { key: 'duracion', label: 'Duración (min)', description: 'Duración en minutos', group: 'Horario' },
  // Bimestres
  { key: 'bimestreOC', label: 'Bimestre OC', description: 'Bimestre para zona OC', group: 'Bimestres' },
  { key: 'bimestreRL', label: 'Bimestre RL', description: 'Bimestre para zona RL', group: 'Bimestres' },
  // Otros
  { key: 'periodo', label: 'Período', description: 'Período académico', group: 'Otros' },
  { key: 'enlaceVirtual', label: 'Enlace Virtual', description: 'Link de la sesión virtual', group: 'Otros' },
];

const GROUPS = [...new Set(COLUMN_OPTIONS.map((c) => c.group))];

// Default selection for a quick export
const DEFAULT_SELECTED = [
  'docenteNombre',
  'docenteEmail',
  'asignatura',
  'nivel',
  'centro',
];

export const ExportPage: React.FC = () => {
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(DEFAULT_SELECTED)
  );
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPeriodos = async () => {
      try {
        const res = await client.get('/admin/periodos', {
          params: { limit: 100 },
        });
        const data = res.data.data || res.data;
        setPeriodos(Array.isArray(data) ? data : []);
      } catch {
        // Silently fail - periodos filter is optional
      }
    };
    fetchPeriodos();
  }, []);

  const toggleColumn = (key: string) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleGroup = (group: string) => {
    const groupKeys = COLUMN_OPTIONS.filter((c) => c.group === group).map(
      (c) => c.key
    );
    const allSelected = groupKeys.every((k) => selectedColumns.has(k));
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        groupKeys.forEach((k) => next.delete(k));
      } else {
        groupKeys.forEach((k) => next.add(k));
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedColumns(new Set(COLUMN_OPTIONS.map((c) => c.key)));
  };

  const clearAll = () => {
    setSelectedColumns(new Set());
  };

  const handleExport = async () => {
    if (selectedColumns.size === 0) {
      setError('Selecciona al menos una columna para exportar.');
      return;
    }

    try {
      setIsExporting(true);
      setError(null);

      const payload: any = {
        columns: Array.from(selectedColumns),
      };
      if (selectedPeriodo) {
        payload.periodoId = parseInt(selectedPeriodo);
      }

      const response = await client.post('/admin/export-excel', payload, {
        responseType: 'blob',
      });

      // Trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'exportacion_horarios.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al exportar. Por favor intenta nuevamente.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const isGroupSelected = (group: string) => {
    const groupKeys = COLUMN_OPTIONS.filter((c) => c.group === group).map(
      (c) => c.key
    );
    return groupKeys.every((k) => selectedColumns.has(k));
  };

  const isGroupPartial = (group: string) => {
    const groupKeys = COLUMN_OPTIONS.filter((c) => c.group === group).map(
      (c) => c.key
    );
    const count = groupKeys.filter((k) => selectedColumns.has(k)).length;
    return count > 0 && count < groupKeys.length;
  };

  return (
    <AdminLayout pageTitle="Exportar Datos">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Exportar Datos a Excel
          </h1>
          <p className="text-gray-600">
            Selecciona las columnas que deseas incluir en el archivo Excel.
            El reporte incluirá el cruce de información entre docentes, asignaturas y grupos.
          </p>
        </div>

        {/* Info about cross-reference */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Cruce de Información</p>
            <p>
              El archivo exportado incluye dos hojas: <strong>Asignaciones</strong> (datos
              detallados por fila) y <strong>Cruce Docente-Asignaturas</strong> (resumen
              mostrando a qué asignaturas y grupos/centros está asignado cada docente).
              Por ejemplo, si el docente "X" da clases de la asignatura "A" a los
              grupos "1 y 3", aparecerán los centros agrupados en una sola fila.
            </p>
          </div>
        </div>

        {/* Period Filter */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filtrar por Período (opcional)
          </label>
          <select
            value={selectedPeriodo}
            onChange={(e) => setSelectedPeriodo(e.target.value)}
            className="w-full md:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Todos los períodos</option>
            {periodos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Column Selection */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Columnas a Exportar
            </h2>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs px-3 py-1.5 bg-primary-50 text-primary-700 rounded-md hover:bg-primary-100 transition font-medium"
              >
                Seleccionar todo
              </button>
              <button
                onClick={clearAll}
                className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition font-medium"
              >
                Limpiar
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {GROUPS.map((group) => {
              const groupCols = COLUMN_OPTIONS.filter(
                (c) => c.group === group
              );
              const allSelected = isGroupSelected(group);
              const partial = isGroupPartial(group);

              return (
                <div key={group} className="border border-gray-200 rounded-lg">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition rounded-t-lg"
                  >
                    {allSelected ? (
                      <CheckSquare
                        size={18}
                        className="text-primary-600 flex-shrink-0"
                      />
                    ) : partial ? (
                      <div className="w-[18px] h-[18px] border-2 border-primary-400 rounded bg-primary-100 flex-shrink-0 flex items-center justify-center">
                        <div className="w-2 h-0.5 bg-primary-500 rounded" />
                      </div>
                    ) : (
                      <Square
                        size={18}
                        className="text-gray-400 flex-shrink-0"
                      />
                    )}
                    <span className="text-sm font-semibold text-gray-800">
                      {group}
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {groupCols.filter((c) => selectedColumns.has(c.key)).length} / {groupCols.length}
                    </span>
                  </button>

                  {/* Group Items */}
                  <div className="px-4 py-2 space-y-1">
                    {groupCols.map((col) => {
                      const isSelected = selectedColumns.has(col.key);
                      return (
                        <label
                          key={col.key}
                          className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-gray-50 cursor-pointer transition"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleColumn(col.key)}
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-gray-800 font-medium">
                              {col.label}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              — {col.description}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">{selectedColumns.size}</span>{' '}
            columna{selectedColumns.size !== 1 ? 's' : ''} seleccionada
            {selectedColumns.size !== 1 ? 's' : ''}
            {selectedPeriodo
              ? ` — Período: ${periodos.find((p) => p.id === parseInt(selectedPeriodo))?.label || selectedPeriodo}`
              : ' — Todos los períodos'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle
              className="text-red-600 flex-shrink-0 mt-0.5"
              size={20}
            />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Export Button */}
        <div className="flex justify-end">
          <button
            onClick={handleExport}
            disabled={isExporting || selectedColumns.size === 0}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md"
          >
            {isExporting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <FileSpreadsheet size={20} />
                Exportar a Excel
              </>
            )}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};
