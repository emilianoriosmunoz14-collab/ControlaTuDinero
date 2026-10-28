import { Link } from 'react-router-dom';
import { CONFIG } from '../config.js';

// Provisional: sustituir x componente de César (mismo uso: <HistorialVacio />).
export default function HistorialVacio() {
  return (
    <div className="empty">
      <strong>Aún no tienes movimientos</strong>
      <span>
        Registra tu primer gasto para verlo aquí. <Link to={CONFIG.ROUTES.gasto}>Registrar gasto</Link>
      </span>
    </div>
  );
}
