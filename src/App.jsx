import { Routes, Route, Navigate } from 'react-router-dom';
import Registro from './pages/Registro.jsx';
import Historial from './pages/Historial.jsx';
import Dashboard from './pages/Dashboard.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Dashboard />} />
      <Route path="/gasto" element={<Dashboard />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/historial" element={<Historial />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
