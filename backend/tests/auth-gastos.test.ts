import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import request from 'supertest';
import { type RowDataPacket } from 'mysql2';
import { app } from '../src/app.js';
import { pool } from '../src/db/pool.js';

const PASSWORD = 'f1fbb5bb154e06ff0da90677453abfaf3df35384e8702376';
const createdUsers: number[] = [];
let userA: { id: number; email: string };
let userB: { id: number; email: string };

before(async () => {
  const [rows] = await pool.query<(RowDataPacket & { db: string })[]>('SELECT DATABASE() AS db');
  if (rows[0]?.db !== 'controlatudinero_test') {
    throw new Error('Pruebas bloqueadas: usa exclusivamente controlatudinero_test');
  }
  userA = await createUser();
  userB = await createUser();
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
const validExpense = (catId: number) => ({
  type: 'expense', amount: '120.50', date: '2026-10-27', description: 'Comida', categoryId: catId,
});

test('login correcto: 200, cookie httpOnly y hash del token', async () => {
  const result = await request(app).post('/api/auth/login').send({ email: userA.email, password: PASSWORD });
  assert.equal(result.status, 200);
  assert.equal(result.body.user.id, userA.id);
  assert.equal(result.body.user.passwordHash, undefined);
  const cookie = (result.headers['set-cookie'] as unknown as string[])[0];
  assert.match(cookie, /^ctd_session=[a-f0-9]{64};/);
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
    .send({ email: userA.email, password: 'OtraClave000!' });
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
    { ...base, type: 'income' }
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
test('limite de intentos: termina en 429', async () => {
  let blocked = false;
  for (let i = 0; i < 15 && !blocked; i++) {
    const result = await request(app).post('/api/auth/login')
      .send({ email: userA.email, password: `incorrecta-${i}` });
    blocked = result.status === 429;
  }
  assert.ok(blocked);
});
