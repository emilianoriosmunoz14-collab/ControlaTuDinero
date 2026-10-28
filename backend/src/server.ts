import { app } from './app.js';
import { pool } from './db/pool.js';
import { env } from './config/env.js';

async function start() {
  try {
    await pool.query('SELECT 1');
    app.listen(env.port, () => {
      console.log(`API lista en http://localhost:${env.port}/api/health`);
    });
  } catch (error) {
    console.error('No se pudo conectar a MySQL. Revisa .env y que MySQL esté activo.', error);
    process.exitCode = 1;
    await pool.end();
  }
}
void start();
