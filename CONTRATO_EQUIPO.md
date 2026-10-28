# Acuerdos de integración — Sprint 2

Este archivo se comparte entre César, Emiliano, Ketzary y Jorge.

## Puertos y carpetas
- Frontend previsto: http://localhost:5173 (si el equipo eligió otro, ajustar `FRONTEND_ORIGIN` en el `.env` local).
- Backend: http://localhost:3000
- Base de datos local: `controlatudinero` (cada integrante levanta su propia MySQL).

## API existente
| Método | Ruta | Sesión | Responsable |
|---|---|---|---|
| GET | `/api/health` | No | César |
| POST | `/api/auth/register` | No | César |
| GET | `/api/categories` | Sí | César |
| GET | `/api/transactions` | Sí | César |

`POST /api/auth/register` body:
```json
{"name":"Ana Lopez","email":"ana@example.com","password":"UnaClaveSegura123!"}
```
Respuesta 201:
```json
{"message":"Cuenta creada","user":{"id":1,"name":"Ana Lopez","email":"ana@example.com"}}
```

`GET /api/transactions` respuesta 200:
```json
{"transactions":[{"id":1,"type":"expense","amount":"120.50","date":"2026-10-27","description":"Comida","categoryId":3,"categoryName":"Comida"}]}
```
El monto es string decimal para no perder precisión monetaria.

## Pendiente: Emiliano (mismo contrato de sesión)
`POST /api/auth/login` body `{ "email": "...", "password": "..." }`.
- Buscar usuario con `findUserByEmail()`; `bcrypt.compare(password, user.passwordHash)`.
- Generar `randomBytes(32).toString('hex')` como token **aleatorio**.
- Guardar `createHash('sha256').update(token).digest('hex')` en `sessions.token_hash`; `expires_at` a 8 horas.
- Responder `{ message: "Sesión iniciada", user: { id, name, email } }` con cookie:
```ts
res.cookie('ctd_session', token, {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 8 * 60 * 60 * 1000,
  path: '/'
});
```
`POST /api/auth/logout` protegido con `requireAuth`, revoca el `token_hash` en `sessions` y borra la cookie con atributos compatibles. Se debe agregar límite de intentos a login.

`POST /api/transactions` body `{ "type":"expense", "amount":"120.50", "date":"2026-10-27", "description":"Comida", "categoryId":3 }`.
- Endpoint protegido.
- Validar tipo `expense` para US-02, cantidad decimal positiva, fecha real y categoría que pertenezca al usuario y sea del mismo tipo.
- Usar `req.authUserId`, nunca `userId` del body.
- Sentencias parametrizadas. Respuesta 201 con registro guardado.
- Si datos no válidos: 400; sin sesión: 401; categoría inexistente/ajena: 400 o 404 consistente; error inesperado: 500 sin detalles sensibles.

## Frontend: Ketzary y Jorge
- En peticiones `fetch`, agregar `credentials: 'include'` cuando se usen sesiones.
- Login y registro: campos `email`, `password` y para registro `name`.
- Categorías: `[{id, name, type}]`; solo seleccionar `type='expense'` en gastos.
- Historial: `transactions` ordenadas por fecha descendente.
- Evitar leer una cookie `httpOnly` desde JavaScript: el navegador la envía automáticamente.
- Error 401 -> volver a login; 400 -> indicar formulario inválido.

## Seguridad que el equipo debe revisar
- Cookies seguras y un sitio HTTPS en despliegue.
- CORS con origen conocido y autenticación real. `sameSite=lax` y validación de Origin ayudan contra CSRF, pero antes de publicar se requiere revisar amenazas y considerar tokens CSRF si el despliegue usa orígenes distintos.
- Probar otro usuario para verificar aislamiento de datos.
- Jamás compartir `.env` ni credenciales por GitHub.
