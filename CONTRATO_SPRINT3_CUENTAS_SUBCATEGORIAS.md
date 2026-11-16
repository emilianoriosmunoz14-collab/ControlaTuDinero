# ControlaTuDinero — Contrato Sprint 3

Los campos se escriben en **camelCase** en JSON y **snake_case** en MySQL.

## Categorias (compartidas)
`GET /api/categories` (requiere sesion). Respuesta:
```json
{"categories":[{"id":1,"name":"Comida","type":"expense"}]}
```
Categorias generales compartidas, **no** se crean por usuario en esta etapa.

## Cuentas (US-17)
Todas requieren sesión activa. El login entrega el JWT en la cookie HttpOnly `ctd_session`.

| Metodo | Ruta | Uso |
|---|---|---|
| GET | `/api/accounts` | Listar cuentas propias |
| GET | `/api/accounts/:id` | Consultar cuenta propia |
| POST | `/api/accounts` | Crear cuenta |
| PATCH | `/api/accounts/:id` | Renombrar / cambiar tipo |
| DELETE | `/api/accounts/:id` | Borrar solo si no hay referencias |

Ejemplo POST:
```json
{"name":"Tanda","accountType":"informal","openingBalance":"500.00"}
```
Respuesta 201: `{"message":"Cuenta creada","account":{"id":2,"name":"Tanda","accountType":"informal","openingBalance":"500.00","balance":"500.00"}}`.
GET retorna `{"accounts":[...]}`. Solo se acepta `cash`, `debit`, `savings`, `informal`. Credit se pospone hasta definir deuda/credito disponible.

**Los saldos se devuelven como cadenas decimales.** Al registrar un movimiento, MySQL guarda el movimiento y actualiza el saldo de la cuenta en una sola transacción.

## Subcategorias personales (US-03)
| Metodo | Ruta | Uso |
|---|---|---|
| GET | `/api/subcategories` | Listar subcategorias propias |
| GET | `/api/subcategories?categoryId=ID` | Filtrar por categoria general |
| POST | `/api/subcategories` | Crear |
| PATCH | `/api/subcategories/:id` | Renombrar |
| DELETE | `/api/subcategories/:id` | Borrar si no se utiliza |

Ejemplo POST:
```json
{"categoryId":3,"name":"Oxxo"}
```
Respuesta 201: `{"message":"Subcategoria creada","subcategory":{"id":7,"categoryId":3,"categoryName":"Comida","name":"Oxxo"}}`.

**Nunca** aceptar `userId` desde el body; se obtiene desde `requireAuth`. Los intentos de acceder a objetos ajenos responden 404. Duplicados, 409.

## Registrar ingresos y gastos

`POST /api/transactions` requiere sesión y recibe los campos del ejemplo:
```json
{"type":"expense","amount":"250.00","date":"2026-11-09","description":"Oxxo","categoryId":3,"subcategoryId":7,"accountId":2}
```
Cambia `type` a `income` para un ingreso y usa una categoría de ese tipo. La subcategoría debe ser personal y corresponder a la categoría elegida. Cada cuenta pertenece al usuario autenticado.

| Estado | Resultado |
|---|---|
| 201 | Se guardó el movimiento. La respuesta incluye `message`, `transaction` y `balance` como cadena decimal. |
| 400 | Datos inválidos, categoría incompatible o subcategoría inválida. |
| 401 | Sesión ausente, inválida o revocada. |
| 404 | Cuenta inexistente o ajena. |
| 409 | Saldo insuficiente o ingreso que supera el rango de la cuenta. |

`GET /api/transactions` incluye `accountId`, `accountName`, `subcategoryId` y `subcategoryName`. Los movimientos históricos conservan valores `null` en los campos que faltan.

`GET /api/accounts/:id` permite consultar el saldo actual. La API de movimientos mantiene las operaciones de registro y consulta. La integración de metas con cuentas corresponde al PR 5.
