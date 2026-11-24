
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api.js';
import { CONFIG } from '../config.js';

const money = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

const tiposCuenta = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'debit', label: 'Débito' },
  { value: 'savings', label: 'Ahorro' },
  { value: 'informal', label: 'Otra cuenta' },
];

export default function Cuentas() {
  const [cuentas, setCuentas] = useState([]);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('debit');
  const [saldo, setSaldo] = useState('0');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  async function cargarCuentas() {
    setError('');
    try {
      const data = await apiFetch(CONFIG.ENDPOINTS.accounts);
      setCuentas(data.accounts || []);
    } catch (err) {
      setError(err.message || 'No fue posible cargar las cuentas.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarCuentas();
  }, []);

  async function agregarCuenta(event) {
    event.preventDefault();
    setError('');
    setMensaje('');

    if (!nombre.trim()) {
      setError('Escribe el nombre de la cuenta.');
      return;
    }

    if (!Number.isFinite(Number(saldo)) || Number(saldo) < 0) {
      setError('El saldo inicial no puede ser negativo.');
      return;
    }

    setGuardando(true);

    try {
      const data = await apiFetch(CONFIG.ENDPOINTS.accounts, {
        method: 'POST',
        body: {
          name: nombre.trim(),
          accountType: tipo,
          openingBalance: Number(saldo),
        },
      });

      if (data.account) {
        setCuentas((actuales) => [...actuales, data.account]);
      } else {
        await cargarCuentas();
      }

      setNombre('');
      setTipo('debit');
      setSaldo('0');
      setMensaje('¡Cuenta agregada correctamente!');
    } catch (err) {
      setError(err.message || 'No fue posible guardar la cuenta.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="management-page">
      <header className="management-header">
        <div>
          <p className="management-eyebrow">ControlaTuDinero</p>
          <h1>Mis cuentas</h1>
          <p>Organiza tus cuentas y consulta sus saldos.</p>
        </div>
        <Link to="/gasto" className="management-back">Volver al inicio</Link>
      </header>

      <section className="management-grid">
        <form className="management-card" onSubmit={agregarCuenta}>
          <h2>Agregar cuenta</h2>
          <p className="management-description">
            Registra una cuenta para utilizarla en tus movimientos.
          </p>

          <label htmlFor="nombreCuenta">Nombre de la cuenta</label>
          <input
            id="nombreCuenta"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Mi tarjeta principal"
            maxLength={80}
          />

          <label htmlFor="tipoCuenta">Tipo de cuenta</label>
          <select
            id="tipoCuenta"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            {tiposCuenta.map((opcion) => (
              <option key={opcion.value} value={opcion.value}>
                {opcion.label}
              </option>
            ))}
          </select>

          <label htmlFor="saldoCuenta">Saldo inicial</label>
          <input
            id="saldoCuenta"
            type="number"
            min="0"
            step="0.01"
            value={saldo}
            onChange={(e) => setSaldo(e.target.value)}
          />

          {error && <p className="management-error">{error}</p>}
          {mensaje && <p className="management-success">{mensaje}</p>}

          <button type="submit" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Agregar cuenta'}
          </button>
        </form>

        <section className="management-card">
          <h2>Cuentas registradas</h2>
          <p className="management-description">
            Estas son las cuentas disponibles en tu registro.
          </p>

          {cargando ? (
            <p>Cargando cuentas...</p>
          ) : cuentas.length === 0 ? (
            <p className="management-empty">
              Todavía no tienes cuentas registradas.
            </p>
          ) : (
            <div className="account-list">
              {cuentas.map((cuenta) => (
                <article className="account-item" key={cuenta.id}>
                  <div>
                    <h3>{cuenta.name}</h3>
                    <p>
                      {tiposCuenta.find((t) => t.value === cuenta.accountType)?.label
                        || cuenta.accountType}
                    </p>
                  </div>
                  <strong>
                    {money.format(Number(cuenta.balance ?? cuenta.openingBalance ?? 0))}
                  </strong>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}