import { Routes, Route, Navigate } from 'react-router-dom';
import Registro from './pages/Registro.jsx';
import Historial from './pages/Historial.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<Dashboard />} />

      <Route
        path="/gasto"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/registro"
        element={
          <ProtectedRoute>
            <Registro />
          </ProtectedRoute>
        }
      />

     <Route path="/registro" element={<Registro />} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}