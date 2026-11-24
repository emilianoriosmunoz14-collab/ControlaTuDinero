import { Routes, Route, Navigate } from 'react-router-dom';
import Registro from './pages/Registro.jsx';
import Historial from './pages/Historial.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Cuentas from './pages/Cuentas.jsx';
import Subcategorias from './pages/Subcategorias.jsx';

export default function App() {
  return (
    <Routes>
      {/* Página inicial */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Acceso público */}
      <Route path="/login" element={<Dashboard />} />
      <Route path="/registro" element={<Registro />} />

      {/* Páginas que requieren iniciar sesión */}
      <Route
        path="/gasto"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/historial"
        element={
          <ProtectedRoute>
            <Historial />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cuentas"
        element={
          <ProtectedRoute>
            <Cuentas />
          </ProtectedRoute>
        }
      />
      <Route
        path="/subcategorias"
        element={
          <ProtectedRoute>
            <Subcategorias />
          </ProtectedRoute>
        }
      />
      {/* Cualquier ruta inexistente */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}