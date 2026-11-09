import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { type RowDataPacket } from 'mysql2';
import { app } from '../src/app.js';
import { pool } from '../src/db/pool.js';

const createdUsers: number[] = [];
const password = 'PruebaSegura123!';
let a: {id: number; cookie: string};
let b: {id: number; cookie: string};
let expenseCategoryId = 0;

async function createUser() {
  const email = `s3-${randomUUID()}@example.com`;
  const reg = await request(app).post('/api/auth/register').send({
    name:'Persona Prueba',email,password
  });
  assert.equal(reg.status,201,JSON.stringify(reg.body));
  createdUsers.push(reg.body.user.id);
  const login = await request(app).post('/api/auth/login').send({email,password});
  assert.equal(login.status,200,JSON.stringify(login.body));
  return {id:reg.body.user.id,cookie:(login.headers['set-cookie'] as unknown as string[])[0].split(';')[0]};
}

before(async () => {
  const [rows] = await pool.query<(RowDataPacket & { db: string })[]>('SELECT DATABASE() AS db');
  if (rows[0]?.db !== 'controlatudinero_test') throw new Error('Solo base de pruebas');
  a=await createUser(); b=await createUser();
  const [cat] = await pool.execute<(RowDataPacket & {id:number})[]>(
    "SELECT id FROM categories WHERE type='expense' LIMIT 1"
  );
  expenseCategoryId=cat[0].id;
});
after(async () => {
  for (const id of createdUsers) {
    await pool.execute('DELETE FROM transactions WHERE user_id=?',[id]);
    await pool.execute('DELETE FROM sessions WHERE user_id=?',[id]);
    await pool.execute('DELETE FROM subcategories WHERE user_id=?',[id]);
    await pool.execute('DELETE FROM savings_goals WHERE user_id=?',[id]);
    await pool.execute('DELETE FROM accounts WHERE user_id=?',[id]);
    await pool.execute('DELETE FROM users WHERE id=?',[id]);
  }
  await pool.end();
});

test('rutas nuevas protegidas', async () => {
  assert.equal((await request(app).get('/api/accounts')).status,401);
  assert.equal((await request(app).get('/api/subcategories')).status,401);
});
test('cuenta propia con saldo inicial, sin movimientos', async () => {
  const created=await request(app).post('/api/accounts').set('Cookie',a.cookie).send({
    name:'Tanda',accountType:'informal',openingBalance:'500.00'
  });
  assert.equal(created.status,201,JSON.stringify(created.body));
  assert.equal(created.body.account.balance,'500.00');
  assert.equal(created.body.account.openingBalance,'500.00');
  const id=created.body.account.id;
  const denied=await request(app).get(`/api/accounts/${id}`).set('Cookie',b.cookie);
  assert.equal(denied.status,404);
  const mine=await request(app).get('/api/accounts').set('Cookie',a.cookie);
  assert.ok(mine.body.accounts.some((x:{id:number})=>x.id===id));
  const invalid=await request(app).post('/api/accounts').set('Cookie',a.cookie)
    .send({name:'Nu',accountType:'credit',openingBalance:'100.00'});
  assert.equal(invalid.status,400);
});
test('subcategorias pertenecen al usuario y a una categoria general', async () => {
  const created=await request(app).post('/api/subcategories').set('Cookie',a.cookie).send({
    categoryId:expenseCategoryId,name:'Oxxo'
  });
  assert.equal(created.status,201,JSON.stringify(created.body));
  const id=created.body.subcategory.id;
  const others=await request(app).get('/api/subcategories').set('Cookie',b.cookie);
  assert.ok(others.body.subcategories.every((x:{id:number})=>x.id!==id));
  const invalidEdit=await request(app).patch(`/api/subcategories/${id}`).set('Cookie',b.cookie)
    .send({name:'Otro'});
  assert.equal(invalidEdit.status,404);
  const duplicated=await request(app).post('/api/subcategories').set('Cookie',a.cookie)
    .send({categoryId:expenseCategoryId,name:'Oxxo'});
  assert.equal(duplicated.status,409);
  const filtered=await request(app).get(`/api/subcategories?categoryId=${expenseCategoryId}`).set('Cookie',a.cookie);
  assert.ok(filtered.body.subcategories.some((x:{id:number})=>x.id===id));
});
