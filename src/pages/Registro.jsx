// US-06 · Register account (CU-06)
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api.js';
import { CONFIG } from '../config.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The validation function for the registration form.
function validar({ nombre, correo, password }) {
  const errores = {};
  if (!nombre) errores.nombre = 'Escribe tu nombre.';
  if (!EMAIL_RE.test(correo)) errores.correo = 'Escribe un correo válido.';
  if (password.length < 8) errores.password = 'La contraseña debe tener al menos 8 caracteres.';
  return errores;
}

export default function Registro() {
  const navigate = useNavigate();
  const [valores, setValores] = useState({ nombre: '', correo: '', password: '' });
  const [errores, setErrores] = useState({});
  const [alerta, setAlerta] = useState(null); // { tipo: 'ok' | 'error', texto }
  const [enviando, setEnviando] = useState(false);

  const onChange = (e) => setValores((v) => ({ ...v, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setAlerta(null);

    // Field names of the contract with the backend (César). Ajustar aquí si cambian.
    const payload = {
      nombre: valores.nombre.trim(),
      correo: valores.correo.trim().toLowerCase(),
      password: valores.password,
    };
    const errs = validar(payload);
    setErrores(errs);
    if (Object.keys(errs).length) return;

    setEnviando(true);
    try {
      await apiFetch(CONFIG.ENDPOINTS.register, { method: 'POST', body: payload });
      setAlerta({ tipo: 'ok', texto: '¡Cuenta creada! Te llevamos al inicio de sesión…' });
      setTimeout(() => navigate(CONFIG.ROUTES.login), 1500);
    } catch (err) {
      if (err.status === 409) {
        setErrores({ correo: 'Ese correo ya está registrado.' });
        setAlerta({ tipo: 'error', texto: 'Ya existe una cuenta con ese correo.' });
      } else {
        setAlerta({ tipo: 'error', texto: err.message });
      }
      setEnviando(false);
    }
  }

  const campo = (id, label, type, autoComplete) => (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        value={valores[id]}
        onChange={onChange}
        aria-invalid={errores[id] ? 'true' : 'false'}
      />
      <p className="error">{errores[id]}</p>
    </div>
  );

  return (
    <>
      <header className="topbar">
        <span className="brand">ControlaTuDinero</span>
        <Link to={CONFIG.ROUTES.login}>Iniciar sesión</Link>
      </header>
      <main>
        <section className="card narrow">
          <h1>Crear cuenta</h1>
          <p className="sub">Solo necesitas tres datos.</p>
          {alerta && (
            <div className={`alert ${alerta.tipo === 'ok' ? 'ok-box' : 'error-box'}`} role="alert">
              {alerta.texto}
            </div>
          )}
          <form onSubmit={onSubmit} noValidate>
            {campo('nombre', 'Nombre', 'text', 'name')}
            {campo('correo', 'Correo', 'email', 'email')}
            {campo('password', 'Contraseña', 'password', 'new-password')}
            <button className="btn" type="submit" disabled={enviando}>
              {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>
          <p className="foot">
            ¿Ya tienes cuenta? <Link to={CONFIG.ROUTES.login}>Inicia sesión</Link>
          </p>
        </section>
      </main>
    </>
  );
}