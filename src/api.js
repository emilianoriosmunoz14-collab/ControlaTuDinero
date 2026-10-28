import { CONFIG } from './config.js';

export class ApiError extends Error {
  constructor(status, message, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = localStorage.getItem(CONFIG.TOKEN_KEY);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(CONFIG.API_BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Intenta de nuevo.');
  }

  let data = null;
  try { data = await res.json(); } catch { /* respuesta sin cuerpo */ }

  if (!res.ok) {
    const msg = (data && (data.mensaje || data.message || data.error)) || 'Ocurrió un error inesperado.';
    throw new ApiError(res.status, msg, data);
  }
  return data;
}
