import React, { useEffect, useState } from 'react';
import client from '../../api/client';
import { AdminLayout } from '../../components/AdminLayout';
import { BarChart3, Users, BookOpen, MapPin } from 'lucide-react';

interface DashboardStats {
  totalCarreras: number;
  totalDocentes: number;
  totalMaterias: number;
  totalCentros: number;
  totalSesionesOnline: number;
  totalSesionesPresenciales: number;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
