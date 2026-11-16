import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { type RowDataPacket } from 'mysql2';
import { app } from '../src/app.js';
import { env } from '../src/config/env.js';
import { pool } from '../src/db/pool.js';
import { signSessionToken } from '../src/services/token.service.js';

// Contraseñas generadas en cada ejecución: no hay credenciales escritas en el código.
const randomPassword = () => `Aa1!${randomBytes(12).toString('hex')}`;
const createdUsers: number[] = [];

interface TestUser { id: number; name: string; email: string; password: string }
let userA: TestUser;
let userB: TestUser;

async function createUser(): Promise<TestUser> {
  const email = `test-${randomUUID()}@example.com`;
  const password = randomPassword();
  const name = 'Prueba JWT';
  const result = await request(app).post('/api/auth/register').send({ name, email, password });
  assert.equal(result.status, 201, JSON.stringify(result.body));
  createdUsers.push(result.body.user.id);
  return { id: result.body.user.id, name, email, password };
}

// La cookie la emite el servidor al iniciar sesión; la prueba no fabrica tokens válidos.
async function login(user: TestUser): Promise<{ cookie: string; token: string }> {
  const result = await request(app).post('/api/auth/login')
    .send({ email: user.email, password: user.password });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  const cookie = (result.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
  return { cookie, token: cookie.slice('ctd_session='.length) };
}

const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const nowSeconds = () => Math.floor(Date.now() / 1000);
const meWith = (token: string) => request(app).get('/api/auth/me').set('Cookie', `ctd_session=${token}`);

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
    await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
  }
});

// Emisión del JWT
test('el login emite un JWT firmado (HS256) con solo el id del usuario y 8 h de vida', async () => {
  const { token } = await login(userA);
  assert.equal(token.split('.').length, 3);

  const decoded = jwt.decode(token, { complete: true });
  assert.ok(decoded && typeof decoded.payload !== 'string');
  assert.equal(decoded.header.alg, 'HS256');
  assert.equal(decoded.payload.sub, String(userA.id));
  assert.equal(decoded.payload.iss, 'controlatudinero');
  assert.equal((decoded.payload.exp as number) - (decoded.payload.iat as number), 8 * 60 * 60);
  assert.deepEqual(Object.keys(decoded.payload).sort(), ['exp', 'iat', 'iss', 'jti', 'sub']);
});

test('cada login genera un token distinto y ambos funcionan', async () => {
  const first = await login(userA);
  const second = await login(userA);
  assert.notEqual(first.token, second.token);
  assert.equal((await meWith(first.token)).status, 200);
  assert.equal((await meWith(second.token)).status, 200);
});

// GET /api/auth/me
test('/api/auth/me devuelve al usuario de la sesión, sin datos sensibles', async () => {
  const { cookie } = await login(userA);
  const result = await request(app).get('/api/auth/me').set('Cookie', cookie);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { user: { id: userA.id, name: userA.name, email: userA.email } });
  assert.match(String(result.headers['cache-control']), /no-store/);
});

test('/api/auth/me sin cookie o con basura responde 401', async () => {
  assert.equal((await request(app).get('/api/auth/me')).status, 401);
  assert.equal((await meWith('esto-no-es-un-jwt')).status, 401);
  assert.equal((await meWith('a.b.c')).status, 401);
});

// requireAuth rechaza tokens manipulados
test('un JWT con el payload cambiado a otro usuario (firma vieja) es rechazado', async () => {
  const { token } = await login(userA);
  const [header, , signature] = token.split('.');
  const forgedPayload = b64({
    sub: String(userB.id), iss: 'controlatudinero', iat: nowSeconds(), exp: nowSeconds() + 3600,
  });
  assert.equal((await meWith(`${header}.${forgedPayload}.${signature}`)).status, 401);
});

test('un JWT firmado con otro secreto es rechazado', async () => {
  const forged = jwt.sign({}, randomBytes(32).toString('hex'), {
    algorithm: 'HS256', issuer: 'controlatudinero', subject: String(userA.id), expiresIn: '1h',
  });
  assert.equal((await meWith(forged)).status, 401);
});

test('un JWT con algoritmo "none" (sin firma) es rechazado', async () => {
  const unsigned = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
    sub: String(userA.id), iss: 'controlatudinero', exp: nowSeconds() + 3600,
  })}.`;
  assert.equal((await meWith(unsigned)).status, 401);
});

test('un JWT expirado es rechazado aunque la firma sea correcta', async () => {
  const expired = jwt.sign(
    { sub: String(userA.id), iss: 'controlatudinero', exp: nowSeconds() - 10 },
    env.jwtSecret, { algorithm: 'HS256' }
  );
  assert.equal((await meWith(expired)).status, 401);
});

test('un JWT válido pero sin sesión registrada en MySQL es rechazado', async () => {
  const neverLoggedIn = signSessionToken(userA.id); // firmado bien, pero nunca pasó por el login
  assert.equal((await meWith(neverLoggedIn)).status, 401);
});

// Logout
test('después del logout el mismo JWT deja de funcionar', async () => {
  const { cookie, token } = await login(userA);
  assert.equal((await meWith(token)).status, 200);
  assert.equal((await request(app).post('/api/auth/logout').set('Cookie', cookie)).status, 200);
  assert.equal((await meWith(token)).status, 401);
});

test('rutas protegidas aceptan el JWT del login y rechazan peticiones sin él', async () => {
  const { cookie } = await login(userB);
  assert.equal((await request(app).get('/api/transactions').set('Cookie', cookie)).status, 200);
  assert.equal((await request(app).get('/api/categories').set('Cookie', cookie)).status, 200);
  assert.equal((await request(app).get('/api/transactions')).status, 401);
  assert.equal((await request(app).get('/api/categories')).status, 401);
});