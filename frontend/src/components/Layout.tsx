import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isAuthenticated, usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-header text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <span className="font-bold text-primary-900 text-lg">H</span>
              </div>
              <h1 className="text-xl font-bold hidden sm:block">Horario EIB</h1>
            </Link>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className="hover:opacity-80 transition">
                Inicio
              </Link>
              {isAuthenticated && usuario?.rol === 'admin' && (
                <Link to="/admin" className="hover:opacity-80 transition">
                  Admin
                </Link>
              )}
              {isAuthenticated && usuario?.rol === 'docente' && (
                <Link to="/mi-horario" className="hover:opacity-80 transition">
                  Mi Horario
                </Link>
              )}
              {isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <span className="text-sm">{usuario?.nombre}</span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
                  >
                    <LogOut size={18} />
                    Salir
                  </button>
                </div>
              ) : (
                <Link to="/login" className="btn-primary">
                  Login
                </Link>
              )}
            </nav>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <nav className="md:hidden mt-4 flex flex-col gap-3 pb-2">
              <Link to="/" className="hover:opacity-80 transition py-2">
                Inicio
              </Link>
              {isAuthenticated && usuario?.rol === 'admin' && (
                <Link to="/admin" className="hover:opacity-80 transition py-2">
                  Admin
                </Link>
              )}
              {isAuthenticated && usuario?.rol === 'docente' && (
                <Link to="/mi-horario" className="hover:opacity-80 transition py-2">
                  Mi Horario
                </Link>
              )}
              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition justify-center"
                >
                  <LogOut size={18} />
                  Salir
                </button>
              ) : (
                <Link to="/login" className="btn-primary text-center">
                  Login
                </Link>
              )}
            </nav>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-200 text-center py-4 mt-auto">
        <p className="text-sm">
          Sistema de Horarios - Universidad Politécnica Salesiana © 2026
        </p>
      </footer>
    </div>
  );
};
