import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import type { Carrera, Periodo, Nivel, Centro } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AlertCircle } from 'lucide-react';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [centros, setCentros] = useState<Centro[]>([]);

  const [selectedCarrera, setSelectedCarrera] = useState<number | null>(null);
  const [selectedPeriodo, setSelectedPeriodo] = useState<number | null>(null);
  const [selectedNivel, setSelectedNivel] = useState<number | null>(null);
  const [selectedCentro, setSelectedCentro] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch carreras on mount
  useEffect(() => {
    const fetchCarreras = async () => {
      try {
        setIsLoading(true);
        const response = await client.get<Carrera[]>('/carreras');
        setCarreras(response.data);
      } catch (err) {
        setError('Error al cargar carreras');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCarreras();
  }, []);

  // Fetch periodos when carrera changes
  useEffect(() => {
    if (!selectedCarrera) {
      setPeriodos([]);
      setSelectedPeriodo(null);
      return;
    }

    const fetchPeriodos = async () => {
      try {
        const response = await client.get<Periodo[]>(
          `/periodos?carreraId=${selectedCarrera}`
        );
        setPeriodos(response.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchPeriodos();
  }, [selectedCarrera]);

  // Fetch niveles when carrera or periodo changes
  useEffect(() => {
    if (!selectedCarrera || !selectedPeriodo) {
      setNiveles([]);
      setSelectedNivel(null);
      return;
    }

    const fetchNiveles = async () => {
      try {
        const response = await client.get<Nivel[]>(
          `/niveles?carreraId=${selectedCarrera}`
        );
        setNiveles(response.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchNiveles();
  }, [selectedCarrera, selectedPeriodo]);

  // Fetch centros
  useEffect(() => {
    const fetchCentros = async () => {
      try {
        const response = await client.get<Centro[]>('/centros');
        setCentros(response.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCentros();
  }, []);

  const handleViewSchedule = () => {
    if (selectedCarrera && selectedPeriodo && selectedNivel && selectedCentro) {
      navigate(
        `/horario/${selectedPeriodo}/${selectedNivel}/${selectedCentro}`
      );
    }
  };

  const canViewSchedule =
    selectedCarrera && selectedPeriodo && selectedNivel && selectedCentro;

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-header text-white py-12 mb-8 rounded-b-lg shadow-lg">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            Horario EIB en Línea
          </h1>
          <p className="text-lg text-blue-100">
            Sistema de Horarios - Universidad Politécnica Salesiana
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="max-w-4xl mx-auto mb-6 px-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Selection Form */}
      <div className="max-w-4xl mx-auto px-4 mb-8">
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          {/* Carrera Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-3">
              1. Selecciona una Carrera
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {carreras.map((carrera) => (
                <button
                  key={carrera.id}
                  onClick={() => {
                    setSelectedCarrera(carrera.id);
                    setSelectedPeriodo(null);
                    setSelectedNivel(null);
                  }}
                  className={`p-3 rounded-lg font-medium transition border-2 ${
                    selectedCarrera === carrera.id
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white text-gray-900 hover:border-blue-300'
                  }`}
                >
                  {carrera.nombre}
                </button>
              ))}
            </div>
          </div>

          {/* Periodo Selection */}
          {selectedCarrera && (
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">
                2. Selecciona un Período
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {periodos.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No hay períodos disponibles
                  </p>
                ) : (
                  periodos.map((periodo) => (
                    <button
                      key={periodo.id}
                      onClick={() => setSelectedPeriodo(periodo.id)}
                      className={`p-3 rounded-lg font-medium transition border-2 ${
                        selectedPeriodo === periodo.id
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : 'border-gray-200 bg-white text-gray-900 hover:border-blue-300'
                      }`}
                    >
                      <div className="font-bold">{periodo.label}</div>
                      <div className="text-xs text-gray-600">
                        {periodo.numero}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Nivel Selection */}
          {selectedPeriodo && (
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">
                3. Selecciona un Nivel
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {niveles.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No hay niveles disponibles
                  </p>
                ) : (
                  niveles.map((nivel) => (
                    <button
                      key={nivel.id}
                      onClick={() => setSelectedNivel(nivel.id)}
                      className={`p-3 rounded-lg font-medium transition border-2 ${
                        selectedNivel === nivel.id
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : 'border-gray-200 bg-white text-gray-900 hover:border-blue-300'
                      }`}
                    >
                      <div className="font-bold">{nivel.nombre}</div>
                      <div className="text-xs text-gray-600">
                        Nivel {nivel.numero}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Centro Selection */}
          {selectedNivel && (
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">
                4. Selecciona un Centro
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {centros.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No hay centros disponibles
                  </p>
                ) : (
                  centros.map((centro) => (
                    <button
                      key={centro.id}
                      onClick={() => setSelectedCentro(centro.id)}
                      className={`p-3 rounded-lg font-medium transition border-2 ${
                        selectedCentro === centro.id
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : 'border-gray-200 bg-white text-gray-900 hover:border-blue-300'
                      }`}
                    >
                      <div className="font-bold">{centro.nombre}</div>
                      <div className="text-xs text-gray-600">{centro.zona}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* View Button */}
          {selectedCentro && (
            <button
              onClick={handleViewSchedule}
              disabled={!canViewSchedule}
              className="btn-primary w-full py-3 text-lg font-bold"
            >
              Ver Horario
            </button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="max-w-4xl mx-auto px-4 mb-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold text-gray-900 mb-2">Online</h3>
          <p className="text-gray-600 text-sm">
            Accede a las sesiones en línea desde cualquier lugar
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold text-gray-900 mb-2">Presencial</h3>
          <p className="text-gray-600 text-sm">
            Consulta los horarios de tus clases presenciales
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold text-gray-900 mb-2">Calendario</h3>
          <p className="text-gray-600 text-sm">
            Mantente actualizado con el calendario académico
          </p>
        </div>
      </div>
    </div>
  );
};
