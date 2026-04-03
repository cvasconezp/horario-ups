import React, { useEffect, useState } from 'react';
import client from '../../api/client';
import { AdminLayout } from '../../components/AdminLayout';
import { BarChart3, Users, BookOpen, MapPin, AlertTriangle, Copy, Check, MessageCircle } from 'lucide-react';

interface DashboardStats {
  totalCarreras: number;
  totalDocentes: number;
  totalMaterias: number;
  totalCentros: number;
  totalSesionesOnline: number;
  totalSesionesPresenciales: number;
}

interface ConflictItem {
  id: number;
  materiaNombre: string;
  centroNombre: string;
  nivelNumero: number;
  dia?: string;
  hora?: string;
  fechaPresencial?: string;
  horaInicio?: string;
  horaFin?: string;
}

interface Conflict {
  type: string;
  docenteId: number;
  docenteNombre: string;
  conflicts: ConflictItem[];
}

interface ConflictsResponse {
  conflictCount: number;
  conflicts: Conflict[];
}

interface WhatsAppResponse {
  text: string;
  count: number;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [conflicts, setConflicts] = useState<ConflictsResponse | null>(null);
  const [conflictsLoading, setConflictsLoading] = useState(false);
  const [whatsappText, setWhatsappText] = useState<string | null>(null);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await client.get<DashboardStats>('/admin/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleDetectConflicts = async () => {
    setConflictsLoading(true);
    try {
      const response = await client.get<ConflictsResponse>('/admin/conflicts');
      setConflicts(response.data);
    } catch (error) {
      console.error('Error detecting conflicts:', error);
    } finally {
      setConflictsLoading(false);
    }
  };

  const handleWhatsAppExport = async () => {
    setWhatsappLoading(true);
    try {
      const response = await client.get<WhatsAppResponse>('/admin/whatsapp-export');
      setWhatsappText(response.data.text);
    } catch (error) {
      console.error('Error generating WhatsApp text:', error);
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleCopyWhatsApp = async () => {
    if (whatsappText) {
      await navigator.clipboard.writeText(whatsappText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const statCards = [
    {
      label: 'Carreras',
      value: stats?.totalCarreras || 0,
      icon: BookOpen,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Docentes',
      value: stats?.totalDocentes || 0,
      icon: Users,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      label: 'Materias',
      value: stats?.totalMaterias || 0,
      icon: BookOpen,
      color: 'bg-green-100 text-green-600',
    },
    {
      label: 'Centros',
      value: stats?.totalCentros || 0,
      icon: MapPin,
      color: 'bg-orange-100 text-orange-600',
    },
  ];

  return (
    <AdminLayout pageTitle="Dashboard">
      <div className="space-y-8">
        {/* Welcome section */}
        <div className="bg-gradient-header text-white rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-2">Bienvenido al Panel de Administración</h2>
          <p>Gestiona el sistema de horarios de la universidad</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-lg shadow-md p-6">
              <div className={`${color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                <Icon size={24} />
              </div>
              <p className="text-gray-600 text-sm font-medium">{label}</p>
              <p className="text-3xl font-bold text-gray-900">
                {isLoading ? '-' : value}
              </p>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            Estadísticas Generales
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-gray-600 text-sm mb-2">Sesiones Online</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.totalSesionesOnline || 0}
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-gray-600 text-sm mb-2">Sesiones Presenciales</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.totalSesionesPresenciales || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Conflict Detection */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle size={20} />
            Detección de Cruces de Horario
          </h3>
          <button
            onClick={handleDetectConflicts}
            disabled={conflictsLoading}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 mb-4"
          >
            {conflictsLoading ? 'Analizando...' : 'Detectar Cruces'}
          </button>

          {conflicts && (
            <div className="mt-4">
              {conflicts.conflictCount === 0 ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                  No se detectaron cruces de horario.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 font-medium">
                    Se detectaron {conflicts.conflictCount} cruces
                  </div>
                  {conflicts.conflicts.map((conflict, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4">
                      <p className="font-semibold text-gray-900 mb-2">
                        {conflict.docenteNombre}
                        <span className="ml-2 text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                          {conflict.type === 'asignacion' ? 'Asignación' : 'Presencial'}
                        </span>
                      </p>
                      <div className="space-y-2">
                        {conflict.conflicts.map((item, iIdx) => (
                          <div key={iIdx} className="text-sm bg-gray-50 p-3 rounded">
                            <span className="font-medium">{item.materiaNombre}</span>
                            <span className="text-gray-500 ml-2">— {item.centroNombre}</span>
                            {item.dia && <span className="text-gray-500 ml-2">{item.dia} {item.hora}</span>}
                            {item.fechaPresencial && (
                              <span className="text-gray-500 ml-2">
                                {item.fechaPresencial} {item.horaInicio}-{item.horaFin}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* WhatsApp Export */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MessageCircle size={20} />
            Exportar para WhatsApp
          </h3>
          <button
            onClick={handleWhatsAppExport}
            disabled={whatsappLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 mb-4"
          >
            {whatsappLoading ? 'Generando...' : 'Generar Texto WhatsApp'}
          </button>

          {whatsappText && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={handleCopyWhatsApp}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copiado!' : 'Copiar al portapapeles'}
                </button>
              </div>
              <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
                {whatsappText}
              </pre>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Acciones Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/admin/carreras"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <p className="font-medium text-gray-900">Gestionar Carreras</p>
              <p className="text-sm text-gray-600">Crear y editar carreras</p>
            </a>
            <a
              href="/admin/docentes"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <p className="font-medium text-gray-900">Gestionar Docentes</p>
              <p className="text-sm text-gray-600">Crear y editar docentes</p>
            </a>
            <a
              href="/admin/import"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <p className="font-medium text-gray-900">Importar Datos</p>
              <p className="text-sm text-gray-600">Subir archivo Excel</p>
            </a>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
