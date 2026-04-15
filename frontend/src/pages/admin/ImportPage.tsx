import React, { useState } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { ExcelImport } from '../../components/admin/ExcelImport';
import client from '../../api/client';
import { AlertCircle, CheckCircle, Trash2 } from 'lucide-react';

export const ImportPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleFileSelected = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsLoading(true);
      setStatus({ type: null, message: '' });

      const response = await client.post('/admin/import-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data;

      if (data.type === 'schedule') {
        const summary = data.results?.[0]?.data;
        const errorResults = data.results?.filter((r: any) => !r.success) || [];
        const errorMsg = errorResults.length > 0
          ? `\n\nErrores (${errorResults.length}): ${errorResults.slice(0, 5).map((r: any) => r.error).join('; ')}${errorResults.length > 5 ? '...' : ''}`
          : '';
        setStatus({
          type: 'success',
          message: `Horario importado (Periodo ${data.periodoDetected}). ${data.sheetsProcessed} hojas procesadas, ${data.sessionsFound} sesiones detectadas. Creadas/actualizadas: ${summary?.created || 0}, sin cambios: ${summary?.skipped || 0}, errores: ${summary?.errors || 0}.${errorMsg}`,
        });
      } else {
        setStatus({
          type: 'success',
          message: 'Archivo importado correctamente. Los datos se han procesado e integrado al sistema.',
        });
      }
    } catch (error: any) {
      const message = error?.response?.data?.error
        || (error instanceof Error ? error.message : 'Error al importar archivo. Por favor intenta nuevamente.');
      setStatus({
        type: 'error',
        message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearPresenciales = async () => {
    if (!window.confirm('¿Estás seguro de eliminar todas las sesiones presenciales? Podrás re-importarlas después.')) return;
    try {
      setIsClearing(true);
      const response = await client.delete('/admin/sesiones-presenciales');
      setStatus({
        type: 'success',
        message: `Se eliminaron ${response.data.deleted} sesiones presenciales. Puedes re-importar los archivos de horario.`,
      });
    } catch (error: any) {
      setStatus({
        type: 'error',
        message: error?.response?.data?.error || 'Error al eliminar sesiones presenciales.',
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <AdminLayout pageTitle="Importar Datos">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Importar Datos</h1>
          <p className="text-gray-600">
            Sube un archivo Excel para importar datos masivos al sistema
          </p>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-3">Formatos Soportados</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• <strong>Horarios por zona:</strong> Excel con hojas por centro/nivel (ej: "Riobamba - II Nivel Ajuste"). Importa sesiones presenciales autom\u00e1ticamente.</li>
            <li>• <strong>Datos estructurados:</strong> Excel con hojas Carreras, Periodos, Niveles, Centros, Docentes, Materias.</li>
            <li>• El sistema detecta el formato autom\u00e1ticamente.</li>
          </ul>
        </div>

        {/* Upload Component */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <ExcelImport onFileSelected={handleFileSelected} isLoading={isLoading} />
        </div>

        {/* Clear presenciales for re-import */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Re-importar horarios presenciales</p>
            <p className="text-xs text-gray-500">Elimina todas las sesiones presenciales para volver a importarlas</p>
          </div>
          <button
            onClick={handleClearPresenciales}
            disabled={isClearing}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
          >
            <Trash2 size={14} />
            {isClearing ? 'Eliminando...' : 'Limpiar presenciales'}
          </button>
        </div>

        {/* Status Message */}
        {status.type && (
          <div
            className={`flex items-start gap-3 p-4 rounded-lg ${
              status.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {status.type === 'success' ? (
              <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
            ) : (
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            )}
            <p className={status.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {status.message}
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <h3 className="font-bold text-gray-900">Instrucciones</h3>
          <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
            <li>Prepara tu archivo Excel con los datos a importar</li>
            <li>Verifica que el formato sea correcto</li>
            <li>Selecciona el archivo usando el área de carga</li>
            <li>Espera a que se procese la importación</li>
            <li>Revisa el mensaje de estado para confirmar el resultado</li>
          </ol>
        </div>

        {/* Sample Data */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-bold text-yellow-900 mb-2">Archivos de Horario (Zona Norte / Zona Sur)</h3>
          <p className="text-sm text-yellow-800 mb-3">
            Archivos Excel con hojas nombradas por centro y nivel. El sistema detecta autom&aacute;ticamente el formato y extrae las sesiones presenciales.
          </p>
          <div className="bg-white rounded p-3 text-xs overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="border px-2 py-1 text-left font-semibold">
                    Hoja
                  </th>
                  <th className="border px-2 py-1 text-left font-semibold">
                    Contenido
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1 font-medium">Riobamba - II Nivel Ajuste</td>
                  <td className="border px-2 py-1">Tutor&iacute;as presenciales y ex&aacute;menes con fechas, horas, materias y docentes</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1 font-medium">Cayambe - IV Nivel - Ajuste</td>
                  <td className="border px-2 py-1">Incluye s&aacute;bados y domingos en columnas paralelas</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
