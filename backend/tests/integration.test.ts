import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import request from 'supertest';
import { type RowDataPacket } from 'mysql2';
import { app } from '../src/app.js';
import { pool } from '../src/db/pool.js';

const createdUsers: number[] = [];

before(async () => {
  const [rows] = await pool.query<(RowDataPacket & { db: string })[]>('SELECT DATABASE() AS db');
  if (rows[0]?.db !== 'controlatudinero_test') {
    throw new Error('Pruebas bloqueadas: usa exclusivamente controlatudinero_test');
  }
});
after(async () => {
  for (const userId of createdUsers) {
    await pool.execute('DELETE FROM transactions WHERE user_id = ?', [userId]);
    await pool.execute('DELETE FROM sessions WHERE user_id = ?', [userId]);
    await pool.execute('DELETE FROM categories WHERE user_id = ?', [userId]);
    await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
  }
  await pool.end();
});

async function createUser() {
  const email = `test-${randomUUID()}@example.com`;
  const result = await request(app).post('/api/auth/register').send({
    name: 'Prueba Sprint', email, password: 'UnaClaveSegura123!'
  });
  assert.equal(result.status, 201, JSON.stringify(result.body));
  const id: number = result.body.user.id;
  createdUsers.push(id);
  return { id, email };
}

async function sessionCookie(userId: number) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  await pool.execute(`INSERT INTO sessions (user_id, token_hash, expires_at)
    VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 8 HOUR))`, [userId, tokenHash]);
  return `ctd_session=${token}`;
}

test('registro inválido responde 400', async () => {
  const result = await request(app).post('/api/auth/register').send({
    name: 'A', email: 'correo-invalido', password: '123'
  });
  assert.equal(result.status, 400);
});

test('registrar usuario y categorías iniciales / correo duplicado', async () => {
  const user = await createUser();
  const [categories] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM categories WHERE user_id = ?', [user.id]
  );
  assert.ok(categories.length >= 2);
  const duplicated = await request(app).post('/api/auth/register').send({
    name: 'Duplicado', email: user.email, password: 'UnaClaveSegura123!'
  });
  assert.equal(duplicated.status, 409);
});

test('historial y categorías requieren sesión', async () => {
  assert.equal((await request(app).get('/api/transactions')).status, 401);
  assert.equal((await request(app).get('/api/categories')).status, 401);
});

test('historial solo devuelve movimientos del usuario autenticado', async () => {
  const a = await createUser();
  const b = await createUser();
  const [catA] = await pool.execute<RowDataPacket[]>(
    "SELECT id FROM categories WHERE user_id = ? AND type = 'expense' LIMIT 1", [a.id]
  );
  const [catB] = await pool.execute<RowDataPacket[]>(
    "SELECT id FROM categories WHERE user_id = ? AND type = 'expense' LIMIT 1", [b.id]
  );
  await pool.execute(`INSERT INTO transactions
      (user_id, category_id, type, amount, date, description) VALUES (?, ?, 'expense', ?, '2026-10-27', ?)`,
    [a.id, catA[0].id, '20.50', 'Gasto de usuario A']);
  await pool.execute(`INSERT INTO transactions
      (user_id, category_id, type, amount, date, description) VALUES (?, ?, 'expense', ?, '2026-10-27', ?)`,
    [b.id, catB[0].id, '99.50', 'Gasto privado B']);

  const cookie = await sessionCookie(a.id);
  const result = await request(app).get('/api/transactions').set('Cookie', cookie);
  assert.equal(result.status, 200);
  assert.equal(result.body.transactions.length, 1);
  assert.equal(result.body.transactions[0].description, 'Gasto de usuario A');
  assert.equal(result.body.transactions[0].amount, '20.50');

  const cats = await request(app).get('/api/categories').set('Cookie', cookie);
  assert.equal(cats.status, 200);
  assert.ok(cats.body.categories.every((c: { id: number }) => c.id !== catB[0].id));
});
