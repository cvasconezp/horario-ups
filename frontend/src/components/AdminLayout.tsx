import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LogOut, Menu, X, Home, BookOpen, Users, Calendar, Upload, BarChart3,
  ChevronDown, ChevronRight, PanelLeftClose, PanelLeft, Settings, Database,
  Download,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
}

interface MenuGroup {
  label: string;
  icon: React.ElementType;
  items: { label: string; href: string; icon: React.ElementType }[];
}

const menuGroups: MenuGroup[] = [
  {
    label: 'General',
    icon: Home,
    items: [
      { label: 'Dashboard', href: '/admin', icon: Home },
    ],
  },
  {
    label: 'Catálogos',
    icon: Database,
    items: [
      { label: 'Carreras', href: '/admin/carreras', icon: BookOpen },
      { label: 'Períodos', href: '/admin/periodos', icon: Calendar },
      { label: 'Niveles', href: '/admin/niveles', icon: BookOpen },
      { label: 'Centros', href: '/admin/centros', icon: Home },
      { label: 'Docentes', href: '/admin/docentes', icon: Users },
      { label: 'Materias', href: '/admin/materias', icon: BookOpen },
    ],
  },
  {
    label: 'Horarios',
    icon: Calendar,
    items: [
      { label: 'Asignaciones', href: '/admin/asignaciones', icon: Users },
      { label: 'Sesiones Online', href: '/admin/sesiones-online', icon: Calendar },
      { label: 'Presenciales', href: '/admin/presenciales', icon: Calendar },
      { label: 'Calendario', href: '/admin/calendario', icon: Calendar },
    ],
  },
  {
    label: 'Herramientas',
    icon: Settings,
    items: [
      { label: 'Importar', href: '/admin/import', icon: Upload },
      { label: 'Exportar Excel', href: '/admin/export', icon: Download },
      { label: 'Analíticas de Uso', href: '/admin/analytics', icon: BarChart3 },
      { label: 'Suscripciones iCal', href: '/admin/ical-stats', icon: BarChart3 },
      { label: 'Portal Docente', href: '/mi-horario', icon: Users },
    ],
  },
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, pageTitle }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  // Open groups that contain the active route by default
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    const active = menuGroups.find((g) =>
      g.items.some((i) => location.pathname === i.href || (i.href !== '/admin' && location.pathname.startsWith(i.href)))
    );
    return active ? [active.label] : ['General'];
  });

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    if (href === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(href);
  };

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className={`p-4 border-b border-primary-700 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && <h1 className="text-lg font-bold truncate">Admin Panel</h1>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex p-1.5 rounded-lg hover:bg-primary-700 transition"
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
        {menuGroups.map((group) => {
          const isOpen = openGroups.includes(group.label);
          const GroupIcon = group.icon;
          const hasActive = group.items.some((i) => isActive(i.href));

          return (
            <div key={group.label} className="mb-1">
              {/* Group header */}
              <button
                onClick={() => collapsed ? setCollapsed(false) : toggleGroup(group.label)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition hover:bg-primary-700 rounded-md ${
                  hasActive ? 'text-white' : 'text-primary-300'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? group.label : undefined}
              >
                <GroupIcon size={16} />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{group.label}</span>
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </>
                )}
              </button>

              {/* Group items */}
              {(isOpen || collapsed) && !collapsed && (
                <div className="mt-0.5 space-y-0.5 px-1">
                  {group.items.map(({ label, href, icon: Icon }) => (
                    <Link
                      key={href}
                      to={href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition ${
                        isActive(href)
                          ? 'bg-primary-700 text-white font-medium'
                          : 'text-primary-200 hover:bg-primary-700/50 hover:text-white'
                      }`}
                    >
                      <Icon size={16} />
                      <span className="truncate">{label}</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Collapsed: just show icons for items in active group */}
              {collapsed && hasActive && (
                <div className="mt-0.5 space-y-0.5 px-1">
                  {group.items.map(({ label, href, icon: Icon }) => (
                    <Link
                      key={href}
                      to={href}
                      onClick={() => setMobileOpen(false)}
                      title={label}
                      className={`flex items-center justify-center py-2 rounded-md transition ${
                        isActive(href)
                          ? 'bg-primary-700 text-white'
                          : 'text-primary-300 hover:bg-primary-700/50 hover:text-white'
                      }`}
                    >
                      <Icon size={16} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`p-3 border-t border-primary-700 space-y-1 ${collapsed ? 'px-1' : ''}`}>
        <Link
          to="/"
          onClick={() => setMobileOpen(false)}
          title={collapsed ? 'Ir al Inicio' : undefined}
          className={`flex items-center gap-2.5 px-3 py-2 w-full rounded-md text-primary-200 hover:bg-primary-700 hover:text-white transition text-sm ${collapsed ? 'justify-center' : ''}`}
        >
          <Home size={16} />
          {!collapsed && <span>Ir al Inicio</span>}
        </Link>
        <button
          onClick={handleLogout}
          title={collapsed ? 'Salir' : undefined}
          className={`flex items-center gap-2.5 px-3 py-2 w-full rounded-md bg-primary-700 hover:bg-primary-900 transition text-sm ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={16} />
          {!collapsed && <span>Salir</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col flex-shrink-0 sticky top-0 h-screen bg-gradient-header text-white transition-all duration-300 z-30 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`md:hidden fixed left-0 top-0 w-64 h-screen bg-gradient-header text-white flex flex-col z-40 transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
          <button
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <h2 className="text-lg md:text-xl font-bold text-gray-900 truncate">
            {pageTitle}
          </h2>
        </header>

        {/* Page content */}
        <main className="flex-1 p-3 md:p-6 overflow-auto">
          {children}
        </main>
      </div>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
};
