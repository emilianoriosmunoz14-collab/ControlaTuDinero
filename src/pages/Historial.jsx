// US-04 · View transaction history (CU-04)
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api.js';
import { CONFIG } from '../config.js';
import HistorialVacio from '../components/HistorialVacio.jsx';

const fmtMonto = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

// MySQL usually returns "2026-10-20T00:00:00.000Z": it is formatted in UTC so that
// the day does not shift due to the time zone.
function fmtFecha(valor) {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor ?? '');
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

// Accepts [ ... ] or { transactions: [ ... ] }, and a category as either text or an object.
function normalizar(respuesta) {
  const lista = Array.isArray(respuesta) ? respuesta : respuesta?.transacciones || respuesta?.movimientos || [];
  return lista.map((m, i) => ({
    key: m.idMovimiento ?? m.id ?? i,
    fecha: m.fecha,
    tipo: m.tipo || 'gasto',
    cantidad: Number(m.cantidad ?? m.monto ?? 0),
    descripcion: m.descripcion || '',
    categoria:
      typeof m.categoria === 'object' && m.categoria ? m.categoria.nombre : m.categoria ?? m.categoriaNombre ?? '',
  }));
}

export default function Historial() {
  const navigate = useNavigate();
  const [movs, setMovs] = useState(null); // null = cargando
  const [error, setError] = useState('');

  useEffect(() => {
   // If there is no token, the API is not called; instead, the user is directed to log in.
    if (!localStorage.getItem(CONFIG.TOKEN_KEY)) {
      navigate(CONFIG.ROUTES.login, { replace: true });
      return;
    }
    let activo = true;
    apiFetch(CONFIG.ENDPOINTS.transactions, { auth: true })
      .then((data) => activo && setMovs(normalizar(data)))
      .catch((err) => {
        if (!activo) return;
        if (err.status === 401) { // expired or invalid token
          localStorage.removeItem(CONFIG.TOKEN_KEY);
          navigate(CONFIG.ROUTES.login, { replace: true });
          return;
        }
        setError(err.message);
        setMovs([]);
      });
    return () => { activo = false; };
  }, [navigate]);

  let contenido;
  if (movs === null) contenido = <p>Cargando…</p>;
  else if (error) contenido = null;
  else if (movs.length === 0) contenido = <HistorialVacio />;
  else {
    
    contenido = (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col">Tipo</th>
              <th scope="col">Descripción</th>
              <th scope="col">Categoría</th>
              <th scope="col" className="num">Monto</th>
            </tr>
          </thead>
          <tbody>
            {movs.map((m) => {
              const esIngreso = m.tipo === 'ingreso';
              return (
                <tr key={m.key}>
                  <td>{fmtFecha(m.fecha)}</td>
                  <td><span className="badge">{esIngreso ? 'Ingreso' : 'Gasto'}</span></td>
                  <td>{m.descripcion || '—'}</td>
                  <td>{m.categoria || '—'}</td>
                  <td className={`num ${esIngreso ? 'ingreso' : 'gasto'}`}>
                    {esIngreso ? '+' : '−'}{fmtMonto.format(Math.abs(m.cantidad))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <header className="topbar">
        <span className="brand">ControlaTuDinero</span>
        <nav><Link to={CONFIG.ROUTES.gasto}>Registrar gasto</Link></nav>
      </header>
      <main>
        <section className="card">
          <h1>Historial de movimientos</h1>
          <p className="sub">Del más reciente al más antiguo.</p>
          {error && <div className="alert error-box" role="alert">{error}</div>}
          <div aria-live="polite">{contenido}</div>
        </section>
      </main>
    </>
  );
}