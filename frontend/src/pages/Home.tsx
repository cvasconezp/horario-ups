import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import type { Periodo, Nivel, Centro, Carrera } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AlertCircle, BookOpen, Calendar, Users, ChevronRight, GraduationCap } from 'lucide-react';

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
    setSelectedNivel(null);
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
    <div className="-mt-8 -mx-4">
      {/* Hero Section */}
      <div className="bg-gradient-header text-white py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <GraduationCap size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
            Educación Intercultural Bilingüe
          </h1>
          <p className="text-blue-100 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Tu camino para enseñar, transformar y aprender desde la diversidad.
            Consulta tus horarios actualizados según tu nivel y centro de apoyo.
          </p>
          <p className="text-blue-200/70 text-sm mt-4 italic">
            {data.periodo.label}
          </p>
        </div>
      </div>

      {/* Schedule Selection Card */}
      <div className="max-w-3xl mx-auto px-4 -mt-6">
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar size={22} className="text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">Consulta tu horario</h2>
          </div>

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
              className="btn-primary w-full py-3 text-lg font-bold rounded-xl flex items-center justify-center gap-2"
            >
              Ver Horario
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="max-w-4xl mx-auto px-4 mt-10 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
              <Calendar size={20} className="text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1 text-sm">Suscríbete a tu calendario</h3>
            <p className="text-gray-500 text-xs leading-relaxed">
              Agrega tus clases a Google Calendar o iCal y recibe recordatorios automáticos.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
              <BookOpen size={20} className="text-green-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1 text-sm">Organiza tu semana</h3>
            <p className="text-gray-500 text-xs leading-relaxed">
              Visualiza clases online, tutorías presenciales y fechas importantes en un solo lugar.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
              <Users size={20} className="text-orange-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1 text-sm">Conecta con tus docentes</h3>
            <p className="text-gray-500 text-xs leading-relaxed">
              Encuentra los enlaces de Zoom, horarios de tutoría y datos de contacto de cada materia.
            </p>
          </div>
        </div>

        {/* Motivational quote */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm italic">
            "Yachayka kawsaymi" — El aprendizaje es vida.
          </p>
        </div>

        {/* Docente link */}
        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
          >
            ¿Eres docente? Accede a tu horario →
          </Link>
        </div>
      </div>
    </div>
  );
};
