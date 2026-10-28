import { Routes, Route, Navigate } from 'react-router-dom';
import Registro from './pages/Registro.jsx';
import Historial from './pages/Historial.jsx';

// Las rutas /login y /gasto Ketzary (pantallas de login y registro de gastos).
export default function App() {
  return (
    <Routes>
      <Route path="/registro" element={<Registro />} />
      <Route path="/historial" element={<Historial />} />
      {/* <Route path="/login" element={<Login />} /> */}
      {/* <Route path="/gasto" element={<RegistrarGasto />} /> */}
      <Route path="*" element={<Navigate to="/registro" replace />} />
    </Routes>
  );
}
