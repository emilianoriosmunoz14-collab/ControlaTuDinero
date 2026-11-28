import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import request from 'supertest';
import { type RowDataPacket } from 'mysql2';
import { app } from '../src/app.js';
import { pool } from '../src/db/pool.js';
import { createTransaction } from '../src/repositories/transaction.repository.js';

const randomPassword = () => `Aa1!${randomBytes(12).toString('hex')}`;
const PASSWORD = randomPassword();
const createdUsers: number[] = [];
let userA: { id: number; email: string };
let userB: { id: number; email: string };
let accountId: number;
let expenseId: number;
let incomeId: number;
let expenseSubcategoryId: number;
let incomeSubcategoryId: number;
let otherAccountId: number;
let otherSubcategoryId: number;

before(async () => {
  const [rows] = await pool.query<(RowDataPacket & { db: string })[]>('SELECT DATABASE() AS db');
  if (rows[0]?.db !== 'controlatudinero_test') {
    throw new Error('Pruebas bloqueadas: usa exclusivamente controlatudinero_test');
  }
  userA = await createUser();
  userB = await createUser();

  const cookieA = await loginCookie(userA.email);
  const cookieB = await loginCookie(userB.email);
  expenseId = await categoryId('expense');
  incomeId = await categoryId('income');
  accountId = await createAccount(cookieA, 'Tanda');
  otherAccountId = await createAccount(cookieB, 'Cuenta privada');
  expenseSubcategoryId = await createSubcategory(cookieA, expenseId, 'Oxxo');
  incomeSubcategoryId = await createSubcategory(cookieA, incomeId, 'Nómina');
  otherSubcategoryId = await createSubcategory(cookieB, expenseId, 'Subcategoría privada');
});
after(async () => {
  for (const userId of createdUsers) {
    await pool.execute('DELETE FROM transactions WHERE user_id = ?', [userId]);
    await pool.execute('DELETE FROM sessions WHERE user_id = ?', [userId]);
    await pool.execute('DELETE FROM subcategories WHERE user_id = ?', [userId]);
    await pool.execute('DELETE FROM savings_goals WHERE user_id = ?', [userId]);
    await pool.execute('DELETE FROM accounts WHERE user_id = ?', [userId]);
    await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
  }
  await pool.end();
});
async function createUser() {
  const email = `test-${randomUUID()}@example.com`;
  const result = await request(app).post('/api/auth/register').send({
    name: 'Prueba Auth', email, password: PASSWORD
  });
  assert.equal(result.status, 201, JSON.stringify(result.body));
  const id: number = result.body.user.id;
  createdUsers.push(id);
  return { id, email };
}
async function loginCookie(email: string): Promise<string> {
  const result = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return (result.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
}
async function categoryId(type: 'income' | 'expense') {
  const [rows] = await pool.execute<(RowDataPacket & { id: number })[]>(
    'SELECT id FROM categories WHERE type = ? LIMIT 1', [type]
  );
  return rows[0].id;
}
async function createAccount(cookie: string, name: string, openingBalance = '500.00'): Promise<number> {
  const result = await request(app).post('/api/accounts').set('Cookie', cookie)
    .send({ name, accountType: 'informal', openingBalance });
  assert.equal(result.status, 201, JSON.stringify(result.body));
  return result.body.account.id;
}

async function createSubcategory(cookie: string, categoryId: number, name: string): Promise<number> {
  const result = await request(app).post('/api/subcategories').set('Cookie', cookie)
    .send({ categoryId, name });
  assert.equal(result.status, 201, JSON.stringify(result.body));
  return result.body.subcategory.id;
}

async function readBalance(cookie: string, id: number) {
  const result = await request(app).get(`/api/accounts/${id}`).set('Cookie', cookie);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return result.body.account.balance;
}

async function countTransactions(id: number) {
  const [rows] = await pool.execute<(RowDataPacket & { count: number })[]>(
    'SELECT COUNT(*) AS count FROM transactions WHERE account_id = ?', [id],
  );
  return rows[0].count;
}

const validExpense = (catId = expenseId) => ({
  type: 'expense', amount: '120.50', date: '2026-10-27', description: 'Comida',
  categoryId: catId, subcategoryId: expenseSubcategoryId, accountId,
});

test('login correcto: 200, cookie httpOnly y hash del token', async () => {
  const result = await request(app).post('/api/auth/login').send({ email: userA.email, password: PASSWORD });
  assert.equal(result.status, 200);
  assert.equal(result.body.user.id, userA.id);
  assert.equal(result.body.user.passwordHash, undefined);
  const cookie = (result.headers['set-cookie'] as unknown as string[])[0];
  assert.match(cookie, /^ctd_session=[\w-]+\.[\w-]+\.[\w-]+;/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
  const token = cookie.split(';')[0].split('=')[1];
  const [byHash] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM sessions WHERE token_hash = ?', [createHash('sha256').update(token).digest('hex')]
  );
  const [byRaw] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM sessions WHERE token_hash = ?', [token]
  );
  assert.equal(byHash.length, 1);
  assert.equal(byRaw.length, 0);
});
test('login invalido: contraseña o correo incorrectos dan 401 igual', async () => {
  const badPassword = await request(app).post('/api/auth/login')
    .send({ email: userA.email, password: randomPassword() });
  const unknownEmail = await request(app).post('/api/auth/login')
    .send({ email: `nadie-${randomUUID()}@example.com`, password: PASSWORD });
  assert.equal(badPassword.status, 401);
  assert.deepEqual(badPassword.body, unknownEmail.body);
});
test('login incompleto da 400', async () => {
  assert.equal((await request(app).post('/api/auth/login').send({ email: userA.email })).status, 400);
  assert.equal((await request(app).post('/api/auth/login').send({})).status, 400);
});
test('JSON mal formado responde 400', async () => {
  const result = await request(app).post('/api/auth/login')
    .set('Content-Type', 'application/json').send('{"email": ');
  assert.equal(result.status, 400);
});
test('logout revoca la sesion', async () => {
  const cookie = await loginCookie(userA.email);
  assert.equal((await request(app).get('/api/transactions').set('Cookie', cookie)).status, 200);
  const out = await request(app).post('/api/auth/logout').set('Cookie', cookie);
  assert.equal(out.status, 200);
  assert.equal((await request(app).get('/api/transactions').set('Cookie', cookie)).status, 401);
});
test('logout sin sesion da 401', async () => {
  assert.equal((await request(app).post('/api/auth/logout')).status, 401);
});
test('gasto sin sesion da 401', async () => {
  assert.equal((await request(app).post('/api/transactions').send(validExpense(1))).status, 401);
});
test('montos invalidos dan 400', async () => {
  const cookie = await loginCookie(userA.email);
  const cat = await categoryId('expense');
  for (const amount of ['-50', '0', '0.00', '', 'abc', '10.999', '1e3', -5, 0]) {
    const result = await request(app).post('/api/transactions').set('Cookie', cookie)
      .send({ ...validExpense(cat), amount });
    assert.equal(result.status, 400, `amount=${JSON.stringify(amount)}`);
  }
});
test('datos obligatorios y tipo invalidos dan 400', async () => {
  const cookie = await loginCookie(userA.email);
  const cat = await categoryId('expense');
  const base = validExpense(cat);
  const bodies = [
    { ...base, description: '' }, { ...base, description: undefined },
    { ...base, date: '2026-02-30' }, { ...base, date: '27/10/2026' },
    { ...base, categoryId: undefined }, { ...base, categoryId: 'abc' },
    { ...base, type: 'otro' }, { ...base, accountId: undefined },
    { ...base, accountId: true }, { ...base, subcategoryId: undefined }
  ];
  for (const body of bodies) {
    const result = await request(app).post('/api/transactions').set('Cookie', cookie).send(body);
    assert.equal(result.status, 400, JSON.stringify(body));
  }
});
test('rechaza categoria inexistente o del tipo incorrecto', async () => {
  const cookie = await loginCookie(userA.email);
  const income = await categoryId('income');
  for (const catId of [income, 999999999]) {
    const result = await request(app).post('/api/transactions').set('Cookie', cookie)
      .send(validExpense(catId));
    assert.equal(result.status, 400);
  }
});
test('gasto valido 201 y se guarda en MySQL e historial', async () => {
  const cookie = await loginCookie(userA.email);
  const cat = await categoryId('expense');
  const created = await request(app).post('/api/transactions').set('Cookie', cookie)
    .send(validExpense(cat));
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.transaction.amount, '120.50');
  assert.equal(created.body.transaction.categoryId, cat);
  assert.equal(created.body.transaction.accountId, accountId);
  assert.equal(created.body.transaction.subcategoryId, expenseSubcategoryId);
  assert.equal(created.body.balance, '379.50');
  assert.equal(await readBalance(cookie, accountId), '379.50');
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT user_id FROM transactions WHERE id = ?', [created.body.transaction.id]
  );
  assert.equal(rows[0].user_id, userA.id);
  const history = await request(app).get('/api/transactions').set('Cookie', cookie);
  assert.ok(history.body.transactions.some((t: { id:number }) => t.id === created.body.transaction.id));
});
test('no permite suplantar otro usuario enviando userId', async () => {
  const cookie = await loginCookie(userA.email);
  const cat = await categoryId('expense');
  const created = await request(app).post('/api/transactions').set('Cookie', cookie)
    .send({ ...validExpense(cat), userId: userB.id, description: 'Intento de suplantar' });
  assert.equal(created.status, 201);
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT user_id FROM transactions WHERE id = ?', [created.body.transaction.id]
  );
  assert.equal(rows[0].user_id, userA.id);
  const cookieB = await loginCookie(userB.email);
  const historyB = await request(app).get('/api/transactions').set('Cookie', cookieB);
  assert.ok(historyB.body.transactions.every((t: { description: string }) =>
    t.description !== 'Intento de suplantar'));
});
test('un ingreso aumenta el saldo exacto de la cuenta seleccionada', async () => {
  const cookie = await loginCookie(userA.email);
  const id = await createAccount(cookie, 'Cuenta ingresos', '250.10');
  const result = await request(app).post('/api/transactions').set('Cookie', cookie)
    .send({ ...validExpense(incomeId), type: 'income', amount: '100.20', accountId: id, subcategoryId: incomeSubcategoryId });
  assert.equal(result.status, 201, JSON.stringify(result.body));
  assert.equal(result.body.transaction.type, 'income');
  assert.equal(result.body.balance, '350.30');
  assert.equal(await readBalance(cookie, id), '350.30');
});

test('cuenta ajena y subcategorías inválidas se rechazan sin registrar ni cambiar saldos', async () => {
  const cookie = await loginCookie(userA.email);
  const cookieB = await loginCookie(userB.email);
  const id = await createAccount(cookie, 'Cuenta rechazos');
  const cases = [
    { data: { ...validExpense(), accountId: otherAccountId }, status: 404 },
    { data: { ...validExpense(), accountId: id, subcategoryId: otherSubcategoryId }, status: 400 },
    { data: { ...validExpense(), accountId: id, subcategoryId: incomeSubcategoryId }, status: 400 },
    { data: { ...validExpense(), accountId: id, subcategoryId: 4_294_967_295 }, status: 400 },
  ];
  for (const { data, status } of cases) {
    const result = await request(app).post('/api/transactions').set('Cookie', cookie).send(data);
    assert.equal(result.status, status, JSON.stringify(result.body));
  }
  assert.equal(await countTransactions(id), 0);
  assert.equal(await readBalance(cookie, id), '500.00');
  assert.equal(await countTransactions(otherAccountId), 0);
  assert.equal(await readBalance(cookieB, otherAccountId), '500.00');
});

test('saldo insuficiente conserva el saldo y deja el historial intacto', async () => {
  const cookie = await loginCookie(userA.email);
  const id = await createAccount(cookie, 'Cuenta saldo bajo', '10.00');
  const result = await request(app).post('/api/transactions').set('Cookie', cookie)
    .send({ ...validExpense(), accountId: id });
  assert.equal(result.status, 409, JSON.stringify(result.body));
  assert.match(result.body.message, /Saldo insuficiente/);
  assert.equal(await readBalance(cookie, id), '10.00');
  assert.equal(await countTransactions(id), 0);
});

test('un ingreso que rebasa el máximo conserva saldo e historial', async () => {
  const cookie = await loginCookie(userA.email);
  const id = await createAccount(cookie, 'Cuenta al máximo', '9999999999.99');
  const result = await request(app).post('/api/transactions').set('Cookie', cookie)
    .send({ ...validExpense(incomeId), type: 'income', amount: '0.01', accountId: id, subcategoryId: incomeSubcategoryId });
  assert.equal(result.status, 409, JSON.stringify(result.body));
  assert.equal(await readBalance(cookie, id), '9999999999.99');
  assert.equal(await countTransactions(id), 0);
});

test('dos gastos simultáneos no pueden consumir el mismo saldo', async () => {
  const cookie = await loginCookie(userA.email);
  const id = await createAccount(cookie, 'Cuenta concurrencia', '100.00');
  const body = { ...validExpense(), accountId: id, amount: '80.00' };
  const results = await Promise.all([
    request(app).post('/api/transactions').set('Cookie', cookie).send(body),
    request(app).post('/api/transactions').set('Cookie', cookie).send(body),
  ]);
  assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
  assert.equal(await readBalance(cookie, id), '20.00');
  assert.equal(await countTransactions(id), 1);
});

test('una inserción rechazada revierte el ajuste de saldo', async () => {
  const cookie = await loginCookie(userA.email);
  const id = await createAccount(cookie, 'Cuenta rollback');
  await assert.rejects(createTransaction({
    ...validExpense(),
    type: 'expense',
    accountId: id,
    userId: userA.id,
    subcategoryId: 4_294_967_295,
}), { code: /^ER_NO_REFERENCED_ROW(?:_2)?$/ });  assert.equal(await readBalance(cookie, id), '500.00');
  assert.equal(await countTransactions(id), 0);
});

test('limite de intentos: termina en 429', async () => {
  let blocked = false;
  for (let i = 0; i < 15 && !blocked; i++) {
    const result = await request(app).post('/api/auth/login')
      .send({ email: userA.email, password: randomPassword() });
    blocked = result.status === 429;
  }
  assert.ok(blocked);
});


test('editar un gasto actualiza el movimiento y ajusta el saldo', async () => {
  const cookie = await loginCookie(userA.email);
  const id = await createAccount(cookie, 'Cuenta editar movimiento');

  const created = await request(app).post('/api/transactions')
    .set('Cookie', cookie)
    .send({ ...validExpense(), accountId: id });

  assert.equal(created.status, 201, JSON.stringify(created.body));

  const transactionId = created.body.transaction.id;


  assert.equal(await readBalance(cookie, id), '379.50');

  const updated = await request(app).put(`/api/transactions/${transactionId}`)
    .set('Cookie', cookie)
    .send({
      ...validExpense(),
      accountId: id,
      amount: '80.25',
      description: 'Comida actualizada',
    });

  assert.equal(updated.status, 200, JSON.stringify(updated.body));

  assert.equal(await readBalance(cookie, id), '419.75');
  assert.equal(await countTransactions(id), 1);

  const [rows] = await pool.execute<
    (RowDataPacket & { amount: string; description: string })[]
  >(
    'SELECT amount, description FROM transactions WHERE id = ?',
    [transactionId],
  );

  assert.equal(rows[0].amount, '80.25');
  assert.equal(rows[0].description, 'Comida actualizada');
});

test('eliminar un gasto lo quita y devuelve el saldo original', async () => {
  const cookie = await loginCookie(userA.email);
  const id = await createAccount(cookie, 'Cuenta eliminar movimiento');

  const created = await request(app).post('/api/transactions')
    .set('Cookie', cookie)
    .send({ ...validExpense(), accountId: id });

  assert.equal(created.status, 201, JSON.stringify(created.body));

  const transactionId = created.body.transaction.id;

  assert.equal(await readBalance(cookie, id), '379.50');
  assert.equal(await countTransactions(id), 1);

  const deleted = await request(app)
    .delete(`/api/transactions/${transactionId}`)
    .set('Cookie', cookie);

  assert.equal(deleted.status, 200, JSON.stringify(deleted.body));
  assert.equal(await readBalance(cookie, id), '500.00');
  assert.equal(await countTransactions(id), 0);
});
