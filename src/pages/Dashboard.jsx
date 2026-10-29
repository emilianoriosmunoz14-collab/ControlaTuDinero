import { useEffect, useState } from 'react';
import { apiFetch } from '../api.js';
import { CONFIG } from '../config.js';
import '../App.css';

function App() {

  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expenseName, setExpenseName] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(
    new Date().toLocaleDateString('en-CA')
  );
  const [formMessage, setFormMessage] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);


  const totalExpenses = expenses.reduce(
    (total, expense) => total + expense.amount,
    0
  );


  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError('');

    if (!email.trim() || !password) {
      setLoginError('Escribe tu correo y contraseña para continuar.');
      return;
    }

    setLoginLoading(true);

    try {
      await apiFetch(CONFIG.ENDPOINTS.login, {
        method: 'POST',
        body: {
          email: email.trim().toLowerCase(),
          password,
        },
      });

      setLoggedIn(true);
      setPassword('');
    } catch (err) {
      setLoginError(
        err.status === 401
          ? 'Correo o contraseña incorrectos.'
          : err.message
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAddExpense = async (event) => {
    event.preventDefault();
    setFormMessage('');

    const numericAmount = Number(amount);
    const selectedCategory = categories.find(
      (item) => String(item.id) === String(category)
    );

    if (!expenseName.trim() || !date || !category) {
      setFormMessage('Completa todos los campos para registrar el gasto.');
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormMessage('El monto debe ser mayor que $0.00.');
      return;
    }

    if (!selectedCategory) {
      setFormMessage('Selecciona una categoría válida.');
      return;
    }

    setSavingExpense(true);

    try {
      await apiFetch(CONFIG.ENDPOINTS.transactions, {
        method: 'POST',
        body: {
          type: 'expense',
          amount: numericAmount,
          date,
          description: expenseName.trim(),
          categoryId: Number(category),
        },
      });

      const respuesta = await apiFetch(CONFIG.ENDPOINTS.transactions);
      const lista = respuesta.transactions ?? [];

      setExpenses(
        lista.map((item) => ({
          id: item.id,
          name: item.description,
          category: item.categoryName,
          date: String(item.date).slice(0, 10),
          amount: Number(item.amount),
        }))
      );

      setExpenseName('');
      setCategory('');
      setAmount('');
      setDate(new Date().toLocaleDateString('en-CA'));
      setFormMessage('¡Gasto registrado correctamente!');
    } catch (err) {
      if (err.status === 401) {
        setLoggedIn(false);
        setLoginError('Tu sesión venció. Inicia sesión nuevamente.');
      } else {
        setFormMessage(err.message);
      }
    } finally {
      setSavingExpense(false);
    }
  };

  useEffect(() => {
    if (!loggedIn) return;

    let activo = true;

    async function cargarDatos() {
      try {
        const [respuestaCategorias, respuestaGastos] = await Promise.all([
          apiFetch(CONFIG.ENDPOINTS.categories),
          apiFetch(CONFIG.ENDPOINTS.transactions),
        ]);

        if (!activo) return;

        const categoriasGasto = (
          respuestaCategorias.categories ?? []
        ).filter((item) => item.type === 'expense');

        setCategories(categoriasGasto);

        setExpenses(
          (respuestaGastos.transactions ?? []).map((item) => ({
            id: item.id,
            name: item.description,
            category: item.categoryName,
            date: String(item.date).slice(0, 10),
            amount: Number(item.amount),
          }))
        );

        setCategory((actual) => {
          const existe = categoriasGasto.some(
            (item) => String(item.id) === String(actual)
          );

          return existe
            ? actual
            : String(categoriasGasto[0]?.id ?? '');
        });
      } catch (err) {
        if (!activo) return;

        if (err.status === 401) {
          setLoggedIn(false);
          setLoginError('Tu sesión venció. Inicia sesión nuevamente.');
        } else {
          setFormMessage(err.message);
        }
      }
    }

    cargarDatos();

    return () => {
      activo = false;
    };
  }, [loggedIn]);

  if (!loggedIn) {
    return (
      <main className="login-page">
        <section className="login-decoration">
          <div className="brand brand-light">
            <span className="brand-icon">₊</span>
            <span>Controla<span className="brand-highlight">TuDinero</span></span>
          </div>

          <div className="login-message">
            <span className="eyebrow">TU DINERO, MÁS CLARO</span>
            <h1>Pequeños hábitos.<br />Grandes metas.</h1>
            <p>
              Organiza tus gastos, conoce tus hábitos y toma el control
              de tus finanzas, un paso a la vez.
            </p>

            <div className="login-stat">
              <div className="stat-icon">↗</div>
              <div>
                <strong>Tu tranquilidad también cuenta.</strong>
                <span>Empieza a llevar tus cuentas con claridad.</span>
              </div>
            </div>
          </div>

          <span className="login-footer">Tus finanzas, a tu manera.</span>
        </section>

        <section className="login-panel">
          <div className="login-card">
            <div className="mobile-brand brand">
              <span className="brand-icon">₊</span>
              <span>Controla<span className="brand-highlight">TuDinero</span></span>
            </div>

            <span className="eyebrow">QUÉ BUENO TENERTE AQUÍ</span>
            <h2>¡Hola de nuevo!</h2>
            <p className="muted">
              Ingresa a tu cuenta para continuar administrando tu dinero.
            </p>

            <form className="login-form" onSubmit={handleLogin}>
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />

              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />

              {loginError && <p className="error-message">{loginError}</p>}

              <button
                className="primary-button login-button"
                type="submit"
                disabled={loginLoading}
              >
                {loginLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                {!loginLoading && <span> →</span>}
              </button>
            </form>

            <p className="login-note">
              <span>✦</span> Tu organización financiera comienza aquí.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">₊</span>
          <span>Controla<span className="brand-highlight">TuDinero</span></span>
        </div>

        <span className="nav-label">MENÚ PRINCIPAL</span>
        <button className="nav-item active" type="button">
          <span>▦</span> Resumen
        </button>
        <button
          className="nav-item"
          type="button"
          onClick={() => document.getElementById('expense-form')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <span>＋</span> Registrar gasto
        </button>
        <button
          className="nav-item"
          type="button"
          onClick={() => document.getElementById('expense-history')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <span>↗</span> Historial de gastos
        </button>

        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-sparkle">✳</span>
            <strong>Un paso a la vez</strong>
            <p>Conocer tus gastos es el primer paso para cumplir tus metas.</p>
          </div>
          <button
            className="nav-item logout-button"
            type="button"
            onClick={async () => {
              try {
                await apiFetch(CONFIG.ENDPOINTS.logout, {
                  method: 'POST',
                });
              } catch (err) {
                console.error('No se pudo cerrar la sesión en el servidor:', err);
              } finally {
                setLoggedIn(false);
                setExpenses([]);
                setCategories([]);
              }
            }}
          >
            <span>↩</span> Cerrar sesión
          </button>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="topbar">
          <div>
            <span className="eyebrow">TU ESPACIO FINANCIERO</span>
            <h1>Tu dinero, en orden.</h1>
          </div>
          <div className="profile">
            <div className="profile-avatar">CT</div>
            <div className="profile-copy">
              <strong>Mi cuenta</strong>
              <span>¡Bienvenida!</span>
            </div>
          </div>
        </header>

        <section className="welcome-banner">
          <div>
            <span className="banner-label">UN MEJOR CONTROL EMPIEZA HOY</span>
            <h2>Hola, ¡vamos paso a paso! 🌿</h2>
            <p>Registra tus gastos y descubre en qué estás usando tu dinero.</p>
          </div>
          <div className="banner-art" aria-hidden="true">
            <span className="art-circle circle-one"></span>
            <span className="art-circle circle-two"></span>
            <span className="art-leaf">✳</span>
          </div>
        </section>

        <section className="summary-grid">
          <article className="summary-card">
            <div className="summary-top">
              <span>Total de gastos registrados</span>
              <span className="summary-icon expense-icon">↘</span>
            </div>
            <strong>${totalExpenses.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
            <span className="summary-caption">Suma de tus gastos en esta vista</span>
          </article>

          <article className="summary-card">
            <div className="summary-top">
              <span>Número de movimientos</span>
              <span className="summary-icon movements-icon">▤</span>
            </div>
            <strong>{expenses.length}</strong>
            <span className="summary-caption">Gastos en tu historial</span>
          </article>

          <article className="summary-card savings-card">
            <div className="summary-top">
              <span>Tu siguiente paso</span>
              <span className="summary-icon savings-icon">✳</span>
            </div>
            <strong>Organizar</strong>
            <span className="summary-caption">Cada gasto cuenta para tus metas</span>
          </article>
        </section>

        <section className="content-grid">
          <article className="panel expense-panel" id="expense-form">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">NUEVO MOVIMIENTO</span>
                <h2>Registrar un gasto</h2>
              </div>
              <span className="heading-icon">＋</span>
            </div>
            <p className="panel-description">
              Anota en qué utilizaste tu dinero para mantener tus cuentas al día.
            </p>

            <form className="expense-form" onSubmit={handleAddExpense}>
              <div className="field">
                <label htmlFor="expense-name">Nombre del gasto</label>
                <input
                  id="expense-name"
                  type="text"
                  placeholder="Ej. Despensa, transporte..."
                  value={expenseName}
                  onChange={(event) => setExpenseName(event.target.value)}
                />
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="expense-category">Categoría</label>
                  <select
                    id="expense-category"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    required
                  >
                    <option value="">Selecciona una categoría</option>

                    {categories.map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="expense-amount">Monto (MXN)</label>
                  <div className="amount-input">
                    <span>$</span>
                    <input
                      id="expense-amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="field">
                <label htmlFor="expense-date">Fecha del gasto</label>
                <input
                  id="expense-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>

              {formMessage && (
                <p className={formMessage.startsWith('¡') ? 'success-message' : 'error-message'}>
                  {formMessage}
                </p>
              )}

              <button
                className="primary-button"
                type="submit"
                disabled={savingExpense}
              >
                <span>＋</span>
                {savingExpense ? 'Guardando...' : 'Guardar gasto'}
              </button>
            </form>
          </article>

          <article className="panel history-panel" id="expense-history">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">TUS MOVIMIENTOS</span>
                <h2>Gastos recientes</h2>
              </div>
              <span className="history-count">{expenses.length}</span>
            </div>
            <p className="panel-description">
              Aquí aparecen los gastos que has registrado.
            </p>

            {expenses.length === 0 ? (
              <div className="empty-state">
                <span>▤</span>
                <strong>Aún no hay gastos</strong>
                <p>Registra tu primer gasto para verlo aquí.</p>
              </div>
            ) : (
              <div className="expense-list">
                {expenses.map((expense) => (
                  <div className="expense-item" key={expense.id}>
                    <div className="expense-category-icon">
                      {expense.category === 'Alimentación' ? '♡' :
                        expense.category === 'Transporte' ? '↗' :
                        expense.category === 'Educación' ? '▤' : '✳'}
                    </div>
                    <div className="expense-details">
                      <strong>{expense.name}</strong>
                      <span>{expense.category} · {expense.date}</span>
                    </div>
                    <strong className="expense-price">
                      −${expense.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

        <footer className="dashboard-footer">
          <span>ControlaTuDinero</span>
          <span>Organiza hoy. Avanza mañana. <span className="footer-heart">♥</span></span>
        </footer>
      </section>
    </main>
  );
}

export default App;
