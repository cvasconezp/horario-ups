import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import type { Periodo, Nivel, Centro, Carrera } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AlertCircle } from 'lucide-react';

interface ActiveResponse {
  periodo: Periodo;
  carrera: Carrera;
  niveles: Nivel[];
  centros: Centro[];
  centroNiveles: Record<number, number[]>;
}

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<ActiveResponse | null>(null);
  const [selectedCentro, setSelectedCentro] = useState<number | null>(null);
  const [selectedNivel, setSelectedNivel] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActive = async () => {
      try {
        setIsLoading(true);
        const response = await client.get<ActiveResponse>('/activo');
        setData(response.data);
      } catch {
        setError('No se pudo cargar la información del período activo');
      } finally {
        setIsLoading(false);
      }
    };
    fetchActive();
  }, []);

  const handleSelectCentro = (centroId: number) => {
    setSelectedCentro(centroId);
    setSelectedNivel(null); // Reset nivel when centro changes
  };

  const handleViewSchedule = () => {
    if (data && selectedCentro && selectedNivel) {
      navigate(`/horario/${data.periodo.id}/${selectedNivel}/${selectedCentro}`);
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg max-w-md">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-red-800">{error || 'No hay período activo'}</p>
        </div>
      </div>
    );
  }

  // Filter out "Todos los centros" from the main list
  const centros = data.centros.filter(
    (c) => c.nombre.toLowerCase() !== 'todos los centros'
  );

  // Get niveles available for the selected centro
  const nivelesDisponibles = selectedCentro
    ? data.niveles.filter((n) =>
        data.centroNiveles[selectedCentro]?.includes(n.id)
      )
    : [];

  // Auto-select nivel if only one is available
  const autoSelectedNivel =
    nivelesDisponibles.length === 1 ? nivelesDisponibles[0].id : selectedNivel;

  const canView = selectedCentro && (autoSelectedNivel || selectedNivel);
  const finalNivel = autoSelectedNivel || selectedNivel;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-header text-white py-10 mb-6">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Horario EIB en Línea
          </h1>
          <p className="text-blue-100 text-sm">
            {data.periodo.label}
          </p>
        </div>
      </div>

      {/* Selection Card */}
      <div className="max-w-3xl mx-auto px-4 -mt-2">
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          {/* Centro Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              1. Selecciona tu centro de apoyo
            </label>
            <div className="flex flex-wrap gap-2">
              {centros.map((centro) => (
                <button
                  key={centro.id}
                  onClick={() => handleSelectCentro(centro.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    selectedCentro === centro.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {centro.nombre}
                </button>
              ))}
            </div>
          </div>

          {/* Nivel Selection */}
          {selectedCentro && nivelesDisponibles.length > 1 && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                2. Selecciona tu nivel
              </label>
              <div className="flex flex-wrap gap-2">
                {nivelesDisponibles.map((nivel) => (
                  <button
                    key={nivel.id}
                    onClick={() => setSelectedNivel(nivel.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      selectedNivel === nivel.id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {nivel.numero === 9 ? 'Plan Contingencia' : `${nivel.numero}° Nivel`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Auto-selected nivel info */}
          {selectedCentro && nivelesDisponibles.length === 1 && (
            <div className="text-sm text-gray-600">
              Nivel disponible: <span className="font-semibold text-gray-900">{nivelesDisponibles[0].numero === 9 ? 'Plan Contingencia' : `${nivelesDisponibles[0].numero}° Nivel`}</span>
            </div>
          )}

          {/* No niveles for this centro */}
          {selectedCentro && nivelesDisponibles.length === 0 && (
            <p className="text-sm text-gray-500">
              No hay niveles con horario para este centro.
            </p>
          )}

          {/* View Button */}
          {canView && (
            <button
              onClick={() => {
                if (data && selectedCentro && finalNivel) {
                  navigate(`/horario/${data.periodo.id}/${finalNivel}/${selectedCentro}`);
                }
              }}
              className="btn-primary w-full py-3 text-lg font-bold rounded-xl"
            >
              Ver Horario
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
