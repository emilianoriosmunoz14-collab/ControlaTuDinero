
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api.js';
import { CONFIG } from '../config.js';

export default function Subcategorias() {
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [categoriaId, setCategoriaId] = useState('');
  const [nombre, setNombre] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  async function cargarInformacion() {
    setError('');

    try {
      const [categoriasData, subcategoriasData] = await Promise.all([
        apiFetch(CONFIG.ENDPOINTS.categories),
        apiFetch(CONFIG.ENDPOINTS.subcategories),
      ]);

      setCategorias(categoriasData.categories || []);
      setSubcategorias(subcategoriasData.subcategories || []);
    } catch (err) {
      setError(err.message || 'No fue posible cargar la información.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarInformacion();
  }, []);

  async function agregarSubcategoria(event) {
    event.preventDefault();
    setError('');
    setMensaje('');

    if (!categoriaId) {
      setError('Selecciona una categoría.');
      return;
    }

    if (!nombre.trim()) {
      setError('Escribe el nombre de la subcategoría.');
      return;
    }

    setGuardando(true);

    try {
      const data = await apiFetch(CONFIG.ENDPOINTS.subcategories, {
        method: 'POST',
        body: {
          categoryId: Number(categoriaId),
          name: nombre.trim(),
        },
      });

      if (data.subcategory) {
        setSubcategorias((actuales) => [...actuales, data.subcategory]);
      } else {
        const actualizadas = await apiFetch(CONFIG.ENDPOINTS.subcategories);
        setSubcategorias(actualizadas.subcategories || []);
      }

      setNombre('');
      setMensaje('¡Subcategoría agregada correctamente!');
    } catch (err) {
      setError(err.message || 'No fue posible guardar la subcategoría.');
    } finally {
      setGuardando(false);
    }
  }

  function nombreCategoria(id) {
    const categoria = categorias.find(
      (item) => String(item.id) === String(id)
    );
    return categoria?.name || 'Categoría no identificada';
  }

  return (
    <main className="management-page">
      <header className="management-header">
        <div>
          <p className="management-eyebrow">ControlaTuDinero</p>
          <h1>Mis subcategorías</h1>
          <p>Clasifica tus movimientos con mayor detalle.</p>
        </div>
        <Link to="/gasto" className="management-back">Volver al inicio</Link>
      </header>

      <section className="management-grid">
        <form className="management-card" onSubmit={agregarSubcategoria}>
          <h2>Agregar subcategoría</h2>
          <p className="management-description">
            Elige una categoría y crea una subcategoría para organizar mejor
            tus ingresos o gastos.
          </p>

          <label htmlFor="categoriaSubcategoria">Categoría</label>
          <select
            id="categoriaSubcategoria"
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
          >
            <option value="">Selecciona una categoría</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.name}
              </option>
            ))}
          </select>

          <label htmlFor="nombreSubcategoria">Nombre</label>
          <input
            id="nombreSubcategoria"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Supermercado"
            maxLength={80}
          />

          {error && <p className="management-error">{error}</p>}
          {mensaje && <p className="management-success">{mensaje}</p>}

          <button type="submit" disabled={guardando || cargando}>
            {guardando ? 'Guardando...' : 'Agregar subcategoría'}
          </button>
        </form>

        <section className="management-card">
          <h2>Subcategorías registradas</h2>
          <p className="management-description">
            Consulta las subcategorías relacionadas con tus categorías.
          </p>

          {cargando ? (
            <p>Cargando subcategorías...</p>
          ) : subcategorias.length === 0 ? (
            <p className="management-empty">
              Todavía no tienes subcategorías registradas.
            </p>
          ) : (
            <div className="account-list">
              {subcategorias.map((subcategoria) => (
                <article className="account-item" key={subcategoria.id}>
                  <div>
                    <h3>{subcategoria.name}</h3>
                    <p>{nombreCategoria(subcategoria.categoryId)}</p>
                  </div>
                  <span className="subcategory-tag">Subcategoría</span>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}