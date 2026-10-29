import 'dotenv/config';

const dbPassword = process.env.DB_PASSWORD;
if (dbPassword === undefined) {
  throw new Error('Falta DB_PASSWORD. Crea backend/.env a partir de .env.example');
}

export const env = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  dbHost: process.env.DB_HOST || '127.0.0.1',
  dbPort: Number(process.env.DB_PORT || 3306),
  dbUser: process.env.DB_USER || 'ctd_app',
  dbPassword,
  dbName: process.env.DB_NAME || 'controlatudinero',
};
