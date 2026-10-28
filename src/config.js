// Shared configuration. API_BASE empty = same origin (Vite's proxy forwards /api).
export const CONFIG = {
  API_BASE: '',
  // It must match the key that the Ketzary login keeps.
  TOKEN_KEY: 'token',
  ENDPOINTS: {
    register: '/api/auth/register',
    transactions: '/api/transactions',
  },
  ROUTES: { login: '/login', historial: '/historial', gasto: '/gasto' },
};
