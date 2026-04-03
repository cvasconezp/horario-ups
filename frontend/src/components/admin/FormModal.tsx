import React from 'react';
import { X } from 'lucide-react';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'date' | 'checkbox';
  placeholder?: string;
  required?: boolean;
  options?: { value: string | number; label: string }[];
  value?: string | number | boolean;
}

interface FormModalProps {
  title: string;
  fields: FormField[];
  isOpen: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void | Promise<void>;
  submitButtonLabel?: string;
  cancelButtonLabel?: string;
}

export const FormModal: React.FC<FormModalProps> = ({
  title,
  fields,
  isOpen,
  isLoading = false,
  onClose,
  onSubmit,
  submitButtonLabel = 'Guardar',
  cancelButtonLabel = 'Cancelar',
}) => {
  const [formData, setFormData] = React.useState<Record<string, unknown>>({});

  React.useEffect(() => {
    const initialData: Record<string, unknown> = {};
    fields.forEach((field) => {
      initialData[field.name] = field.value || '';
    });
    setFormData(initialData);
  }, [fields, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, type, value } = e.target;
    const target = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? target.checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Coerce numeric values: select fields with numeric options and number fields
    const coerced: Record<string, unknown> = { ...formData };
    fields.forEach((field) => {
      const val = coerced[field.name];
      if (field.type === 'number' && val !== '' && val !== undefined && val !== null) {
        coerced[field.name] = Number(val);
      }
      if (field.type === 'select' && val !== '' && val !== undefined && val !== null) {
        // If the options have numeric values, coerce to number
        const hasNumericOptions = field.options?.some((opt) => typeof opt.value === 'number');
        if (hasNumericOptions) {
          coerced[field.name] = Number(val);
        }
      }
    });
    await onSubmit(coerced);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 hover:bg-gray-100 rounded transition disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {fields.map((field) => (
            <div key={field.name}>
              <label
                htmlFor={field.name}
                className="block text-sm font-medium text-gray-900 mb-1"
              >
                {field.label}
                {field.required && <span className="text-red-600">*</span>}
              </label>

              {field.type === 'textarea' ? (
                <textarea
                  id={field.name}
                  name={field.name}
                  placeholder={field.placeholder}
                  value={(formData[field.name] as string) || ''}
                  onChange={handleChange}
                  required={field.required}
                  disabled={isLoading}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
              ) : field.type === 'select' ? (
                <select
                  id={field.name}
                  name={field.name}
                  value={(formData[field.name] as string) || ''}
                  onChange={handleChange}
                  required={field.required}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">-- Seleccionar --</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === 'checkbox' ? (
                <input
                  id={field.name}
                  type="checkbox"
                  name={field.name}
                  checked={Boolean(formData[field.name])}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-4 h-4 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              ) : (
                <input
                  id={field.name}
                  type={field.type}
                  name={field.name}
                  placeholder={field.placeholder}
                  value={(formData[field.name] as string) || ''}
                  onChange={handleChange}
                  required={field.required}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
              )}
            </div>
          ))}

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="btn-secondary"
            >
              {cancelButtonLabel}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
            >
              {isLoading ? 'Guardando...' : submitButtonLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
