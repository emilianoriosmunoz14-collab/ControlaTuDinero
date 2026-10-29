
import { CONFIG } from './config.js';

export class ApiError extends Error {
  constructor(status, message, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch(path, { method = 'GET', body } = {}) {
  const headers = {
    'Content-Type': 'application/json',
  };

  let response;

  try {
    response = await fetch(CONFIG.API_BASE + path, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      'No se pudo conectar con el servidor. Comprueba que el backend esté iniciado.'
    );
  }

  let data = null;

  try {
    data = await response.json();
  } catch {
    // Algunas respuestas pueden venir sin contenido JSON.
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.mensaje ||
      data?.error ||
      'Ocurrió un error inesperado.';

    throw new ApiError(response.status, message, data);
  }

  return data;
}
