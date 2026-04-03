import React, { useState } from 'react';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';

interface ExcelImportProps {
  onFileSelected: (file: File) => Promise<void>;
  isLoading?: boolean;
  accepted?: string[];
}

export const ExcelImport: React.FC<ExcelImportProps> = ({
  onFileSelected,
  isLoading = false,
  accepted = ['.xlsx', '.xls', '.csv'],
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!accepted.includes(fileExt)) {
      setStatus({
        type: 'error',
        message: `Formato no válido. Formatos permitidos: ${accepted.join(', ')}`,
      });
      return;
    }
    setSelectedFile(file);
    setStatus({ type: null, message: '' });
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    try {
      await onFileSelected(selectedFile);
      setStatus({
        type: 'success',
        message: 'Archivo importado exitosamente',
      });
      setSelectedFile(null);
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al importar archivo',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'}`}
      >
        <Upload
          size={48}
          className="mx-auto mb-4 text-gray-400"
        />
        <p className="text-lg font-medium text-gray-900 mb-2">
          Arrastra archivos aquí o haz clic para seleccionar
        </p>
        <p className="text-sm text-gray-600 mb-4">
          Formatos permitidos: {accepted.join(', ')}
        </p>
        <input
          type="file"
          onChange={handleFileInput}
          accept={accepted.join(',')}
          disabled={isLoading}
          className="hidden"
          id="file-input"
        />
        <label
          htmlFor="file-input"
          className="btn-primary inline-block cursor-pointer disabled:opacity-50"
        >
          Seleccionar archivo
        </label>
      </div>

      {/* Selected file info */}
      {selectedFile && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            Archivo seleccionado: <strong>{selectedFile.name}</strong>
          </p>
          <p className="text-xs text-blue-700">
            Tamaño: {(selectedFile.size / 1024).toFixed(2)} KB
          </p>
        </div>
      )}

      {/* Status message */}
      {status.type && (
        <div
          className={`flex items-start gap-3 p-4 rounded-lg ${
            status.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
          ) : (
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          )}
          <p
            className={
              status.type === 'success' ? 'text-green-800' : 'text-red-800'
            }
          >
            {status.message}
          </p>
        </div>
      )}

      {/* Submit button */}
      {selectedFile && (
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="btn-primary w-full"
        >
          {isLoading ? 'Importando...' : 'Importar archivo'}
        </button>
      )}
    </div>
  );
};
