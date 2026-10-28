# ControlaTuDinero — Backend (Sprint 2)

Stack: Node.js, Express, TypeScript, MySQL2. Proyecto académico.

## Preparación
1. Entrar a `backend` y ejecutar `npm install` (genera `package-lock.json`, que **sí** se sube a Git).
2. Copiar `.env.example` a `.env`, colocar credenciales **locales**.
3. Ejecutar `db/01_schema.sql` en MySQL Workbench como administrador.
4. Si usan el usuario `ctd_app`, crearlo en una pestaña temporal de Workbench (NO en un archivo del repositorio) y darle SELECT/INSERT/UPDATE/DELETE sobre `controlatudinero` y `controlatudinero_test`. No guardar claves reales en Git.
5. Ejecutar `npm run dev`.
6. Revisar `http://localhost:3000/api/health`.

## Pruebas automatizadas
1. Ejecutar `db/01_schema_test.sql` en MySQL Workbench.
2. `npm run test:integration`: **solo modifica controlatudinero_test**.
3. `npm run typecheck` y `npm run build`.

## Endpoints implementados
- `GET /api/health` -> 200 `{ ok: true, service: "ControlaTuDinero API" }`.
- `POST /api/auth/register` -> 201 `{ message, user: { id, name, email } }`; 400 por datos inválidos; 409 duplicado.
- `GET /api/categories` -> 200 `{ categories: [{ id, name, type }] }`; 401 sin sesión.
- `GET /api/transactions` -> 200 `{ transactions: [{ id, type, amount, date, description, categoryId, categoryName }] }`; 401 sin sesión. `amount` es string decimal (`"20.50"`).

## Pendiente de Emiliano
- `POST /api/auth/login`, `POST /api/auth/logout` y `POST /api/transactions`.
- Login crea un token aleatorio de sesión; únicamente se guarda el SHA-256 en `sessions` y la cookie `ctd_session` se emite con `httpOnly`, `sameSite: 'lax'`, `secure` en producción.
- Logout revoca la sesión en base de datos y borra la cookie. Ver `CONTRATO_EQUIPO.md`.

## Reglas
- No subir `.env`, tokens o contraseñas.
- Backend obtiene ID del usuario a partir de la sesión: **nunca** del body/query.
- Usar `.execute(..., [param])` para evitar concatenar entradas en SQL.
- Para petición fetch del frontend: `credentials: 'include'`.
- Estructura separada de controllers, repositories, routes y middlewares.
