import { useState } from 'react';
import '../App.css';

const initialExpenses = [
  { id: 1, name: 'Comida', category: 'Alimentación', date: '2026-10-27', amount: 185 },
  { id: 2, name: 'Transporte', category: 'Transporte', date: '2026-10-26', amount: 90 },
  { id: 3, name: 'Material escolar', category: 'Educación', date: '2026-10-24', amount: 320 },
];

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [expenses, setExpenses] = useState(initialExpenses);
  const [expenseName, setExpenseName] = useState('');
  const [category, setCategory] = useState('Alimentación');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('2026-10-28');
  const [formMessage, setFormMessage] = useState('');

  const totalExpenses = expenses.reduce(
    (total, expense) => total + expense.amount,
    0
  );

  const handleLogin = (event) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setLoginError('Escribe tu correo y contraseña para continuar.');
      return;
    }

    // Inicio de sesión de demostración. Después se conectará con el backend.
    setLoginError('');
    setLoggedIn(true);
  };

  const handleAddExpense = (event) => {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (!expenseName.trim() || !date || !category) {
      setFormMessage('Completa todos los campos para registrar el gasto.');
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormMessage('El monto debe ser mayor que $0.00.');
      return;
    }

    const newExpense = {
      id: Date.now(),
      name: expenseName.trim(),
      category,
      date,
      amount: numericAmount,
    };

    setExpenses((currentExpenses) => [newExpense, ...currentExpenses]);
    setExpenseName('');
    setCategory('Alimentación');
    setAmount('');
    setDate('2026-10-28');
    setFormMessage('¡Gasto registrado correctamente!');
  };

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

              <button className="primary-button login-button" type="submit">
                Iniciar sesión <span>→</span>
              </button>
            </form>

            <p className="login-note">
              <span>✦</span> Tu organización financiera comienza aquí.
            </p>
            <p className="demo-note">
              Vista de demostración: acepta cualquier correo y contraseña no vacíos.
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
            onClick={() => setLoggedIn(false)}
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
                  >
                    <option>Alimentación</option>
                    <option>Transporte</option>
                    <option>Educación</option>
                    <option>Salud</option>
                    <option>Entretenimiento</option>
                    <option>Servicios</option>
                    <option>Otros</option>
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

              <button className="primary-button" type="submit">
                <span>＋</span> Guardar gasto
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
