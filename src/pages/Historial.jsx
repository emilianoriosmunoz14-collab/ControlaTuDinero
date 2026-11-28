
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

  return [...lista]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((movimiento, indice) => ({
  key: movimiento.id ?? indice,
  id: movimiento.id,
  fecha: movimiento.date,
  tipo: movimiento.type,
  cantidad: Number(movimiento.amount ?? 0),
  descripcion: movimiento.description ?? '',
  categoria: movimiento.categoryName ?? '',
  categoriaId: movimiento.categoryId,
  subcategoria: movimiento.subcategoryName,
  subcategoriaId: movimiento.subcategoryId,
  cuenta: movimiento.accountName,
  cuentaId: movimiento.accountId,
}));
}

export default function Historial() {
  const navigate = useNavigate();

  const [movimientos, setMovimientos] = useState(null);
  const [error, setError] = useState('');
  const [movimientoEditar, setMovimientoEditar] = useState(null);
  const [listaCuentas, setListaCuentas] = useState([]);
  const [listaCategorias, setListaCategorias] = useState([]);
  const [listaSubcategorias, setListaSubcategorias] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroCuenta, setFiltroCuenta] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

 useEffect(() => {
  let activo = true;

  Promise.all([
    apiFetch(CONFIG.ENDPOINTS.transactions),
    apiFetch(CONFIG.ENDPOINTS.categories),
    apiFetch(CONFIG.ENDPOINTS.accounts),
    apiFetch(CONFIG.ENDPOINTS.subcategories),
  ])
    .then(([respuestaMovimientos, respuestaCategorias, respuestaCuentas, respuestaSubcategorias]) => {
      if (!activo) return;

      setMovimientos(normalizar(respuestaMovimientos));
      setListaCategorias(respuestaCategorias.categories ?? []);
      setListaCuentas(respuestaCuentas.accounts ?? []);
      setListaSubcategorias(respuestaSubcategorias.subcategories ?? []);
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

  const cuentas = [...new Set(
    (movimientos ?? []).map((m) => m.cuenta).filter(Boolean)
  )];

  const categorias = [...new Set(
    (movimientos ?? []).map((m) => m.categoria).filter(Boolean)
  )];

  const movimientosFiltrados = (movimientos ?? []).filter((m) => {
    const tipoCorrecto = !filtroTipo || m.tipo === filtroTipo;
    const cuentaCorrecta = !filtroCuenta || m.cuenta === filtroCuenta;
    const categoriaCorrecta =
      !filtroCategoria || m.categoria === filtroCategoria;

    const fecha = String(m.fecha ?? '').slice(0, 10);

    const fechaCorrecta =
      (!fechaInicio || fecha >= fechaInicio) &&
      (!fechaFin || fecha <= fechaFin);

    return (
      tipoCorrecto &&
      cuentaCorrecta &&
      categoriaCorrecta &&
      fechaCorrecta
    );
  });

  function limpiarFiltros() {
    setFiltroTipo('');
    setFiltroCuenta('');
    setFiltroCategoria('');
    setFechaInicio('');
    setFechaFin('');
  }

  function iniciarEdicion(movimiento) {
  setMovimientoEditar({
    ...movimiento,
    tipo: movimiento.tipo,
    cuentaId: String(movimiento.cuentaId ?? ''),
    categoriaId: String(movimiento.categoriaId ?? ''),
    subcategoriaId: String(movimiento.subcategoriaId ?? ''),
    cantidad: String(movimiento.cantidad ?? ''),
    descripcion: movimiento.descripcion ?? '',
    fecha: String(movimiento.fecha ?? '').slice(0, 10),
  });
}

const categoriasEditar = listaCategorias.filter(
  (item) => item.type === movimientoEditar?.tipo
);

const subcategoriasEditar = listaSubcategorias.filter(
  (item) => String(item.categoryId) === String(movimientoEditar?.categoriaId)
);

function cancelarEdicion() {
  setMovimientoEditar(null);
}

async function guardarEdicion() {
  if (
    !movimientoEditar.cuentaId ||
    !movimientoEditar.categoriaId ||
    !movimientoEditar.subcategoriaId ||
    !movimientoEditar.fecha ||
    !movimientoEditar.descripcion.trim()
  ) {
    setError('Completa todos los campos del movimiento.');
    return;
  }

  const cantidad = String(movimientoEditar.cantidad).trim();

  if (!/^\d{1,10}(\.\d{1,2})?$/.test(cantidad) || Number(cantidad) <= 0) {
    setError('La cantidad debe ser mayor que cero y tener máximo 2 decimales.');
    return;
  }

  try {
    setError('');

    await apiFetch(`${CONFIG.ENDPOINTS.transactions}/${movimientoEditar.id}`, {
      method: 'PUT',
      body: {
        type: movimientoEditar.tipo,
        amount: cantidad,
        date: movimientoEditar.fecha,
        description: movimientoEditar.descripcion.trim(),
        categoryId: Number(movimientoEditar.categoriaId),
        subcategoryId: Number(movimientoEditar.subcategoriaId),
        accountId: Number(movimientoEditar.cuentaId),
      },
    });

    const respuesta = await apiFetch(CONFIG.ENDPOINTS.transactions);
    setMovimientos(normalizar(respuesta));
    setMovimientoEditar(null);
    setError('');
  } catch (err) {
    if (err.status === 401) {
      navigate(CONFIG.ROUTES.login, { replace: true });
      return;
    }

    setError(err.message || 'No fue posible actualizar el movimiento.');
  }
}

async function eliminarMovimiento(id) {
  const confirmar = window.confirm(
    '¿Seguro que deseas eliminar este movimiento?'
  );

  if (!confirmar) return;

  try {
    setError('');

    await apiFetch(`${CONFIG.ENDPOINTS.transactions}/${id}`, {
      method: 'DELETE',
    });

    const respuesta = await apiFetch(CONFIG.ENDPOINTS.transactions);
    setMovimientos(normalizar(respuesta));

    if (movimientoEditar?.id === id) {
      setMovimientoEditar(null);
    }
  } catch (err) {
    if (err.status === 401) {
      navigate(CONFIG.ROUTES.login, { replace: true });
      return;
    }

    setError(err.message || 'No fue posible eliminar el movimiento.');
  }
}


  let contenido;

  if (movimientos === null) {
    contenido = <p>Cargando movimientos...</p>;
  } else if (movimientos.length === 0) {
    contenido = error
      ? <p>No fue posible cargar tus movimientos.</p>
      : <HistorialVacio />;
  } else if (movimientosFiltrados.length === 0) {
    contenido = <p>No hay movimientos que coincidan con los filtros.</p>;
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
              <th scope="col">Subcategoría</th>
              <th scope="col">Cuenta</th>
              <th scope="col" className="num">Monto</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {movimientosFiltrados.map((movimiento) => {
              const esIngreso =
                String(movimiento.tipo).toLowerCase() === 'income';

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
                  <td>{movimiento.subcategoria ?? '—'}</td>
                  <td>{movimiento.cuenta ?? '—'}</td>

                  <td className={`num ${esIngreso ? 'ingreso' : 'gasto'}`}>
                    {esIngreso ? '+' : '−'}
                    {fmtMonto.format(Math.abs(movimiento.cantidad))}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => iniciarEdicion(movimiento)}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => eliminarMovimiento(movimiento.id)}
                    >
                      Eliminar
                    </button>
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
          <Link to={CONFIG.ROUTES.gasto}>Registrar movimiento</Link>
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

          {movimientos !== null && movimientos.length > 0 && (
            <div className="filtros-historial">
              <h2>Filtrar movimientos</h2>

              <div className="grid-filtros">
                <label>
                  Tipo de movimiento
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="income">Ingresos</option>
                    <option value="expense">Gastos</option>
                  </select>
                </label>

                <label>
                  Cuenta
                  <select
                    value={filtroCuenta}
                    onChange={(e) => setFiltroCuenta(e.target.value)}
                  >
                    <option value="">Todas las cuentas</option>
                    {cuentas.map((cuenta) => (
                      <option key={cuenta} value={cuenta}>
                        {cuenta}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Categoría
                  <select
                    value={filtroCategoria}
                    onChange={(e) => setFiltroCategoria(e.target.value)}
                  >
                    <option value="">Todas las categorías</option>
                    {categorias.map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Fecha inicial
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                  />
                </label>

                <label>
                  Fecha final
                  <input
                    type="date"
                    min={fechaInicio || undefined}
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                  />
                </label>
              </div>

              <div className="acciones-filtros">
                <span>
                  Mostrando {movimientosFiltrados.length} de {movimientos.length} movimientos
                </span>

                <button type="button" onClick={limpiarFiltros}>
                  Limpiar filtros
                </button>
              </div>
            </div>
          )}
  {movimientoEditar && (
    <div className="form-edicion">
      <h2>Editar movimiento</h2>

    <label>
      Tipo de movimiento
      <select
        value={movimientoEditar.tipo}
        onChange={(e) =>
          setMovimientoEditar({
            ...movimientoEditar,
            tipo: e.target.value,
            categoriaId: '',
            subcategoriaId: '',
          })
        }
      >
        <option value="income">Ingreso</option>
        <option value="expense">Gasto</option>
      </select>
    </label>

    <label>
      Cuenta
      <select
        value={movimientoEditar.cuentaId}
        onChange={(e) =>
          setMovimientoEditar({
            ...movimientoEditar,
            cuentaId: e.target.value,
          })
        }
      >
        <option value="">Selecciona una cuenta</option>
        {listaCuentas.map((cuenta) => (
          <option key={cuenta.id} value={cuenta.id}>
            {cuenta.name}
          </option>
        ))}
      </select>
    </label>

    <label>
      Descripción
      <input
        type="text"
        value={movimientoEditar.descripcion}
        onChange={(e) =>
          setMovimientoEditar({
            ...movimientoEditar,
            descripcion: e.target.value,
          })
        }
      />
    </label>

    <label>
      Categoría
      <select
        value={movimientoEditar.categoriaId}
        onChange={(e) =>
          setMovimientoEditar({
            ...movimientoEditar,
            categoriaId: e.target.value,
            subcategoriaId: '',
          })
        }
      >
        <option value="">Selecciona una categoría</option>
        {categoriasEditar.map((categoria) => (
          <option key={categoria.id} value={categoria.id}>
            {categoria.name}
          </option>
        ))}
      </select>
    </label>

    <label>
      Cantidad
      <input
        type="number"
        min="0.01"
        step="0.01"
        value={movimientoEditar.cantidad}
        onChange={(e) =>
          setMovimientoEditar({
            ...movimientoEditar,
            cantidad: e.target.value,
          })
        }
      />
    </label>

    <label>
      Subcategoría
      <select
        value={movimientoEditar.subcategoriaId}
        onChange={(e) =>
          setMovimientoEditar({
            ...movimientoEditar,
            subcategoriaId: e.target.value,
          })
        }
        disabled={!movimientoEditar.categoriaId}
      >
        <option value="">Selecciona una subcategoría</option>
        {subcategoriasEditar.map((subcategoria) => (
          <option key={subcategoria.id} value={subcategoria.id}>
            {subcategoria.name}
          </option>
        ))}
      </select>
    </label>

    <label>
      Fecha
      <input
        type="date"
        value={movimientoEditar.fecha}
        onChange={(e) =>
          setMovimientoEditar({
            ...movimientoEditar,
            fecha: e.target.value,
          })
        }
      />
    </label>

    <div className="acciones-edicion">
      <button type="button" onClick={guardarEdicion}>
        Guardar cambios
      </button>

      <button type="button" onClick={cancelarEdicion}>
        Cancelar
      </button>
    </div>
  </div>
)}

          <div aria-live="polite">{contenido}</div>
        </section>
      </main>
    </>
  );
}