import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { apiFetch } from '../api.js';
import { CONFIG } from '../config.js';
import '../App.css';

const formatMoney = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const today = () => new Date().toLocaleDateString('en-CA');

function App() {

  const {
  user,
  loading: authLoading,
  isAuthenticated,
  login,
  logout,
} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [movements, setMovements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [description, setDescription] = useState('');
  const [type, setType] = useState('expense');
  const [accounts, setAccounts] = useState([]);
  const [account, setAccount] = useState('');
  const [subcategories, setSubcategories] = useState([]);
  const [subcategory, setSubcategory] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [formMessage, setFormMessage] = useState('');
  const [savingMovement, setSavingMovement] = useState(false);
  const [savingSubcategory, setSavingSubcategory] = useState(false);
  const busy = savingMovement || savingSubcategory;
  const categoryOptions = categories.filter(item => item.type === type);
  const subcategoryOptions = subcategories.filter(item => String(item.categoryId) === category);
  const selectedAccount = accounts.find(item => String(item.id) === account);
  const totalExpenses = movements.reduce(
    (total, movement) => movement.type === 'expense' ? total + Number(movement.amount) : total,
    0,
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
    await login(email.trim().toLowerCase(), password);

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


  function resetSession() {
    setMovements([]);
    setCategories([]);
    setAccounts([]);
    setSubcategories([]);
    setType('expense');
    setAccount('');
    setCategory('');
    setSubcategory('');
    setNewSubcategoryName('');
    setDescription('');
    setAmount('');
    setDate(today());
    setFormMessage('');
  }

  function handleFormError(error) {
    if (error.status === 401) {
      resetSession();
      setLoginError('Tu sesión venció. Inicia sesión nuevamente.');
      return;
    }
    setFormMessage(error.message);
  }

  async function handleAddSubcategory() {
    if (!category || !newSubcategoryName.trim()) {
      setFormMessage('Selecciona una categoría y escribe el nombre de la subcategoría.');
      return;
    }

    setSavingSubcategory(true);
    setFormMessage('');
    try {
      const result = await apiFetch(CONFIG.ENDPOINTS.subcategories, {
        method: 'POST',
        body: { categoryId: Number(category), name: newSubcategoryName.trim() },
      });
      setSubcategories(current => [...current, result.subcategory]);
      setSubcategory(String(result.subcategory.id));
      setNewSubcategoryName('');
      setFormMessage('¡Subcategoría creada!');
    } catch (error) {
      handleFormError(error);
    } finally {
      setSavingSubcategory(false);
    }
  }

  async function handleAddMovement(event) {
    event.preventDefault();
    if (busy) return;
    setFormMessage('');

    if (!description.trim() || !date || !category || !subcategory || !selectedAccount) {
      setFormMessage('Completa todos los campos para registrar el movimiento.');
      return;
    }

    setSavingMovement(true);
    try {
      const { transaction, balance } = await apiFetch(CONFIG.ENDPOINTS.transactions, {
        method: 'POST',
        body: {
          type, amount, date, description: description.trim(),
          categoryId: Number(category), subcategoryId: Number(subcategory), accountId: selectedAccount.id,
        },
      });

      setMovements(current => [transaction, ...current].sort(
        (a, b) => b.date.localeCompare(a.date) || b.id - a.id,
      ));
      setAccounts(current => current.map(item =>
        item.id === transaction.accountId ? { ...item, balance } : item,
      ));
      setDescription('');
      setAmount('');
      setDate(today());
      setFormMessage(`¡${type === 'income' ? 'Ingreso' : 'Gasto'} registrado! Saldo de ${transaction.accountName}: ${formatMoney.format(balance)}.`);
    } catch (error) {
      handleFormError(error);
    } finally {
      setSavingMovement(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return;

    let active = true;
    Promise.all([
      apiFetch(CONFIG.ENDPOINTS.categories),
      apiFetch(CONFIG.ENDPOINTS.transactions),
      apiFetch(CONFIG.ENDPOINTS.accounts),
      apiFetch(CONFIG.ENDPOINTS.subcategories),
    ]).then(([categoryData, transactionData, accountData, subcategoryData]) => {
      if (!active) return;
      setCategories(categoryData.categories);
      setMovements(transactionData.transactions);
      setAccounts(accountData.accounts);
      setSubcategories(subcategoryData.subcategories);
    }).catch(error => {
      if (active) handleFormError(error);
    });

    return () => { active = false; };
  }, [isAuthenticated]);

  if (authLoading) {
    return <p>Verificando sesión...</p>;
  }

  if (!isAuthenticated) {
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
          <span>＋</span> Registrar movimiento
        </button>
        <button
          className="nav-item"
          type="button"
          onClick={() => document.getElementById('expense-history')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <span>↗</span> Historial de movimientos
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
            disabled={busy}
            onClick={async () => {
            await logout();
            resetSession();
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
              <strong>{user?.name || 'Mi cuenta'}</strong>
              <span>¡Bienvenido!</span>
            </div>
          </div>
        </header>

        <section className="welcome-banner">
          <div>
            <span className="banner-label">UN MEJOR CONTROL EMPIEZA HOY</span>
            <h2>Hola, ¡vamos paso a paso! 🌿</h2>
            <p>Registra tus ingresos y gastos para consultar tus movimientos.</p>
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
            <strong>{movements.length}</strong>
            <span className="summary-caption">Ingresos y gastos en tu historial</span>
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
                <h2>Registrar un movimiento</h2>
              </div>
              <span className="heading-icon">＋</span>
            </div>
            <p className="panel-description">
              Selecciona dónde entró o de dónde salió el dinero.
            </p>

            <form className="expense-form" onSubmit={handleAddMovement}>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="movement-type">Tipo</label>
                  <select id="movement-type" value={type} disabled={busy} onChange={event => {
                    setType(event.target.value);
                    setCategory('');
                    setSubcategory('');
                    setNewSubcategoryName('');
                  }}>
                    <option value="expense">Gasto</option>
                    <option value="income">Ingreso</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="movement-account">Cuenta</label>
                  <select id="movement-account" value={account} disabled={busy} required
                    onChange={event => setAccount(event.target.value)}>
                    <option value="">Selecciona una cuenta</option>
                    {accounts.map(item => (
                      <option key={item.id} value={item.id}>{item.name} · {formatMoney.format(item.balance)}</option>
                    ))}
                  </select>
                  {accounts.length === 0 && <small>Registra una cuenta para guardar movimientos.</small>}
                </div>
              </div>

              <div className="field">
                <label htmlFor="expense-name">Descripción</label>
                <input
                  id="expense-name"
                  type="text"
                  placeholder="Ej. Despensa, sueldo..."
                  value={description}
                  maxLength={255}
                  required
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="expense-category">Categoría</label>
                  <select
                    id="expense-category"
                    value={category}
                    disabled={busy}
                    onChange={event => {
                      setCategory(event.target.value);
                      setSubcategory('');
                      setNewSubcategoryName('');
                    }}
                    required
                  >
                    <option value="">Selecciona una categoría</option>

                    {categoryOptions.map((item) => (
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
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="field">
                <label htmlFor="movement-subcategory">Subcategoría</label>
                <select id="movement-subcategory" value={subcategory} required disabled={!category || busy}
                  onChange={event => setSubcategory(event.target.value)}>
                  <option value="">Selecciona una subcategoría</option>
                  {subcategoryOptions.map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>

              {category && (
                <div className="field">
                  <label htmlFor="new-subcategory">Nueva subcategoría</label>
                  <input id="new-subcategory" value={newSubcategoryName} maxLength={80} disabled={busy}
                    onChange={event => setNewSubcategoryName(event.target.value)} />
                  <button type="button" className="primary-button"
                    disabled={busy || !newSubcategoryName.trim()} onClick={handleAddSubcategory}>
                    {savingSubcategory ? 'Guardando...' : 'Agregar subcategoría'}
                  </button>
                </div>
              )}

              <div className="field">
                <label htmlFor="expense-date">Fecha del movimiento</label>
                <input
                  id="expense-date"
                  type="date"
                  required
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
                disabled={busy || accounts.length === 0}
              >
                <span>＋</span>
                {savingMovement ? 'Guardando...' : 'Guardar movimiento'}
              </button>
            </form>
          </article>

          <article className="panel history-panel" id="expense-history">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">TUS MOVIMIENTOS</span>
                <h2>Movimientos recientes</h2>
              </div>
              <span className="history-count">{movements.length}</span>
            </div>
            <p className="panel-description">
              Aquí aparecen los ingresos y gastos que has registrado.
            </p>

            {movements.length === 0 ? (
              <div className="empty-state">
                <span>▤</span>
                <strong>Aún no hay movimientos</strong>
                <p>Registra tu primer movimiento para verlo aquí.</p>
              </div>
            ) : (
              <div className="expense-list">
                {movements.map((movement) => (
                  <div className="expense-item" key={movement.id}>
                    <div className="expense-category-icon">
                      {movement.categoryName === 'Alimentación' ? '♡' :
                        movement.categoryName === 'Transporte' ? '↗' :
                        movement.categoryName === 'Educación' ? '▤' : '✳'}
                    </div>
                    <div className="expense-details">
                      <strong>{movement.description}</strong>
                      <span>{[movement.categoryName, movement.subcategoryName, movement.accountName, movement.date].filter(Boolean).join(' · ')}</span>
                    </div>
                    <strong className="expense-price">
                      {movement.type === 'income' ? '+' : '−'}{formatMoney.format(movement.amount)}
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
