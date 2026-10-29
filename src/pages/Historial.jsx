
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api.js';
import { CONFIG } from '../config.js';
import HistorialVacio from '../components/HistorialVacio.jsx';

const fmtMonto = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

function fmtFecha(valor) {
  if (!valor) return '—';

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return String(valor);
  }

  return fecha.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function normalizar(respuesta) {
  const lista = Array.isArray(respuesta)
    ? respuesta
    : respuesta?.transactions ?? [];

  return lista.map((movimiento, indice) => ({
    key: movimiento.id ?? indice,
    fecha: movimiento.date,
    tipo: movimiento.type,
    cantidad: Number(movimiento.amount ?? 0),
    descripcion: movimiento.description ?? '',
    categoria: movimiento.categoryName ?? '',
  }));
}

export default function Historial() {
  const navigate = useNavigate();
  const [movimientos, setMovimientos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;

    apiFetch(CONFIG.ENDPOINTS.transactions)
      .then((respuesta) => {
        if (activo) {
          setMovimientos(normalizar(respuesta));
        }
      })
      .catch((err) => {
        if (!activo) return;

        if (err.status === 401) {
          navigate(CONFIG.ROUTES.login, { replace: true });
          return;
        }

        setError(err.message);
        setMovimientos([]);
      });

    return () => {
      activo = false;
    };
  }, [navigate]);

  let contenido;

  if (movimientos === null) {
    contenido = <p>Cargando movimientos...</p>;
  } else if (movimientos.length === 0) {
    contenido = <HistorialVacio />;
  } else {
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
            {movimientos.map((movimiento) => {
              const esIngreso = movimiento.tipo === 'income';

              return (
                <tr key={movimiento.key}>
                  <td>{fmtFecha(movimiento.fecha)}</td>

                  <td>
                    <span className="badge">
                      {esIngreso ? 'Ingreso' : 'Gasto'}
                    </span>
                  </td>

                  <td>{movimiento.descripcion || '—'}</td>
                  <td>{movimiento.categoria || '—'}</td>

                  <td className={`num ${esIngreso ? 'ingreso' : 'gasto'}`}>
                    {esIngreso ? '+' : '−'}
                    {fmtMonto.format(Math.abs(movimiento.cantidad))}
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
        <nav>
          <Link to={CONFIG.ROUTES.gasto}>Registrar gasto</Link>
        </nav>
      </header>

      <main>
        <section className="card">
          <h1>Historial de movimientos</h1>
          <p className="sub">Del más reciente al más antiguo.</p>

          {error && (
            <div className="alert error-box" role="alert">
              {error}
            </div>
          )}

          <div aria-live="polite">{contenido}</div>
        </section>
      </main>
    </>
  );
}
