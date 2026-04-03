import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Menu, X, Home, BookOpen, Users, Calendar, Upload } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, pageTitle }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = [
    { label: 'Dashboard', href: '/admin', icon: Home },
    { label: 'Carreras', href: '/admin/carreras', icon: BookOpen },
    { label: 'Períodos', href: '/admin/periodos', icon: Calendar },
    { label: 'Niveles', href: '/admin/niveles', icon: BookOpen },
    { label: 'Centros', href: '/admin/centros', icon: Home },
    { label: 'Docentes', href: '/admin/docentes', icon: Users },
    { label: 'Materias', href: '/admin/materias', icon: BookOpen },
    { label: 'Asignaciones', href: '/admin/asignaciones', icon: Users },
    { label: 'Sesiones Online', href: '/admin/sesiones-online', icon: Calendar },
    { label: 'Sesiones Presenciales', href: '/admin/presenciales', icon: Calendar },
    { label: 'Calendario', href: '/admin/calendario', icon: Calendar },
    { label: 'Importar', href: '/admin/import', icon: Upload },
  ];

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed md:sticky md:translate-x-0 left-0 top-0 w-64 h-screen bg-gradient-header text-white flex flex-col flex-shrink-0 transition-transform duration-300 z-30`}
      >
        <div className="p-6 border-b border-primary-700">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          {menuItems.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              to={href}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-3 mb-2 rounded-lg hover:bg-primary-700 transition"
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-primary-700 space-y-2">
          <Link
            to="/"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg hover:bg-primary-700 transition"
          >
            <Home size={20} />
            <span>Ir al Inicio</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg bg-primary-700 hover:bg-primary-900 transition"
          >
            <LogOut size={20} />
            <span>Salir</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-4 flex justify-between items-center sticky top-0 z-20">
          <div>
            <button
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h2 className="text-2xl font-bold text-gray-900 hidden md:block">
              {pageTitle}
            </h2>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </main>
      </div>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};
