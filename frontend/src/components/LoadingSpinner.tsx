import React from 'react';

interface LoadingSpinnerProps {
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ fullScreen = false }) => {
  const spinnerClass = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-white/80 z-50'
    : 'flex items-center justify-center py-12';

  return (
    <div className={spinnerClass}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-gray-600 text-sm">Cargando...</p>
      </div>
    </div>
  );
};
