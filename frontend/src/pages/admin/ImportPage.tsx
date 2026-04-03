import React, { useState } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { ExcelImport } from '../../components/admin/ExcelImport';
import client from '../../api/client';
import { AlertCircle, CheckCircle } from 'lucide-react';

export const ImportPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
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

      await client.post('/admin/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setStatus({
        type: 'success',
        message: 'Archivo importado correctamente. Los datos se han procesado e integrado al sistema.',
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Error al importar archivo. Por favor intenta nuevamente.';
      setStatus({
        type: 'error',
        message,
      });
    } finally {
      setIsLoading(false);
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
          <h3 className="font-bold text-blue-900 mb-3">Formato de Archivo</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• Formato aceptado: Excel (.xlsx, .xls) o CSV</li>
            <li>
              • La primera fila debe contener los encabezados de las columnas
            </li>
            <li>
              • Asegúrate de que los datos cumplan con los tipos requeridos
            </li>
            <li>
              • Se puede cargar una sola hoja de cálculo a la vez
            </li>
          </ul>
        </div>

        {/* Upload Component */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <ExcelImport onFileSelected={handleFileSelected} isLoading={isLoading} />
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
          <h3 className="font-bold text-yellow-900 mb-2">Formato de Ejemplo</h3>
          <p className="text-sm text-yellow-800 mb-3">
            Tu archivo Excel debe tener columnas similares a estas:
          </p>
          <div className="bg-white rounded p-3 text-xs overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="border px-2 py-1 text-left font-semibold">
                    Nombre
                  </th>
                  <th className="border px-2 py-1 text-left font-semibold">
                    Email
                  </th>
                  <th className="border px-2 py-1 text-left font-semibold">
                    Carrera
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">Juan García</td>
                  <td className="border px-2 py-1">juan@ups.edu.ec</td>
                  <td className="border px-2 py-1">Ingeniería en Sistemas</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">María López</td>
                  <td className="border px-2 py-1">maria@ups.edu.ec</td>
                  <td className="border px-2 py-1">Ingeniería en Electrónica</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
