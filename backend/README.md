# ControlaTuDinero — Backend

Stack: Node.js, Express, TypeScript, MySQL2. Proyecto académico.

## Preparación
1. Entrar a `backend` y ejecutar `npm ci`.
2. Copiar `.env.example` a `.env`, colocar credenciales **locales** y generar `JWT_SECRET` con `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`.
3. Para una base vacía, ejecutar `db/01_schema.sql` en MySQL Workbench como administrador. Para una base que ya migró a Sprint 3, conservar el esquema existente.
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
- `GET /api/transactions` -> 200 con el historial del usuario. Incluye cuenta y subcategoría, que pueden ser nulas en registros anteriores.
- `POST /api/transactions` -> 201 con el movimiento y el saldo actualizado de la cuenta. Ver [contrato de Sprint 3](../CONTRATO_SPRINT3_CUENTAS_SUBCATEGORIAS.md).
- `POST /api/auth/login` -> 200. Emite el JWT en la cookie HttpOnly `ctd_session` y guarda su SHA-256 en `sessions`.
- `GET /api/auth/me` -> 200 con el usuario de la sesión activa, o 401 si no hay sesión válida.
- `POST /api/auth/logout` -> 200. Revoca la sesión y borra la cookie.

## Reglas
- No subir `.env`, tokens o contraseñas.
- Backend obtiene ID del usuario a partir de la sesión: **nunca** del body/query.
- Usar `.execute(..., [param])` para evitar concatenar entradas en SQL.
- Para petición fetch del frontend: `credentials: 'include'`.
- Estructura separada de controllers, repositories, routes y middlewares.
