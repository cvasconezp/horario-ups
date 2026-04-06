import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { Home } from './pages/Home';
import { ScheduleView } from './pages/ScheduleView';
import { Login } from './pages/Login';

// Admin pages
import { AdminDashboard } from './pages/admin/Dashboard';
import { CarrerasPage } from './pages/admin/CarrerasPage';
import { PeriodosPage } from './pages/admin/PeriodosPage';
import { NivelesPage } from './pages/admin/NivelesPage';
import { CentrosPage } from './pages/admin/CentrosPage';
import { DocentesPage } from './pages/admin/DocentesPage';
import { MateriasPage } from './pages/admin/MateriasPage';
import { AsignacionesPage } from './pages/admin/AsignacionesPage';
import { SesionesOnlinePage } from './pages/admin/SesionesOnlinePage';
import { PresencialesPage } from './pages/admin/PresencialesPage';
import { CalendarioPage } from './pages/admin/CalendarioPage';
import { ImportPage } from './pages/admin/ImportPage';
import { IcalStatsPage } from './pages/admin/IcalStatsPage';
import { ExportPage } from './pages/admin/ExportPage';

// Docente pages
import { MiHorario } from './pages/docente/MiHorario';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route
            path="/"
            element={
              <Layout>
                <Home />
              </Layout>
            }
          />
          <Route
            path="/horario/:periodoId/:nivelId/:centroId"
            element={
              <Layout>
                <ScheduleView />
              </Layout>
            }
          />
          <Route path="/login" element={<Login />} />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/carreras"
            element={
              <ProtectedRoute requiredRole="admin">
                <CarrerasPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/periodos"
            element={
              <ProtectedRoute requiredRole="admin">
                <PeriodosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/niveles"
            element={
              <ProtectedRoute requiredRole="admin">
                <NivelesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/centros"
            element={
              <ProtectedRoute requiredRole="admin">
                <CentrosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/docentes"
            element={
              <ProtectedRoute requiredRole="admin">
                <DocentesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/materias"
            element={
              <ProtectedRoute requiredRole="admin">
                <MateriasPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/asignaciones"
            element={
              <ProtectedRoute requiredRole="admin">
                <AsignacionesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/sesiones-online"
            element={
              <ProtectedRoute requiredRole="admin">
                <SesionesOnlinePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/presenciales"
            element={
              <ProtectedRoute requiredRole="admin">
                <PresencialesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/calendario"
            element={
              <ProtectedRoute requiredRole="admin">
                <CalendarioPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/import"
            element={
              <ProtectedRoute requiredRole="admin">
                <ImportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/ical-stats"
            element={
              <ProtectedRoute requiredRole="admin">
                <IcalStatsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/export"
            element={
              <ProtectedRoute requiredRole="admin">
                <ExportPage />
              </ProtectedRoute>
            }
          />

          {/* Docente routes */}
          <Route
            path="/mi-horario"
            element={
              <ProtectedRoute requiredRole="docente">
                <MiHorario />
              </ProtectedRoute>
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
