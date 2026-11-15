import 'dotenv/config';

const dbPassword = process.env.DB_PASSWORD;
if (dbPassword === undefined) {
  throw new Error('Falta DB_PASSWORD. Crea backend/.env a partir de .env.example');
}

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.startsWith('REEMPLAZA')) {
  throw new Error(
    'Falta JWT_SECRET (mínimo 32 caracteres, aleatorio). Genera uno con: ' +
    "node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\" y ponlo en backend/.env"
  );
}

export const env = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  dbHost: process.env.DB_HOST || '127.0.0.1',
  dbPort: Number(process.env.DB_PORT || 3306),
  dbUser: process.env.DB_USER || 'ctd_app',
  dbPassword,
  jwtSecret,
  dbName: process.env.DB_NAME || 'controlatudinero',
};
