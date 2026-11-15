# ControlaTuDinero — Contrato Sprint 3 (PR 2, Cesar)

Los campos se escriben en **camelCase** en JSON y **snake_case** en MySQL.

## Categorias (compartidas)
`GET /api/categories` (requiere sesion). Respuesta:
```json
{"categories":[{"id":1,"name":"Comida","type":"expense"}]}
```
Categorias generales compartidas, **no** se crean por usuario en esta etapa.

## Cuentas (US-17)
Todas requieren sesion activa (cookie `ctd_session` HttpOnly actual; Emiliano la cambiara a JWT).

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

**Los saldos se guardan como cadenas decimales.** PR2 aun NO actualiza saldos por movimientos. El PR4 implementara una transaccion SQL atomica al insertar/editar/eliminar movimientos.

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

## Relaciones con movimientos y metas: siguientes PRs
Futuro body de `POST /api/transactions`:
```json
{"type":"expense","amount":"250.00","date":"2026-11-09","description":"Oxxo","categoryId":3,"subcategoryId":7,"accountId":2}
```
**No disponible aun en PR2**: el controlador actual continua aceptando el cuerpo antiguo sin `accountId` o `subcategoryId` para preservar compatibilidad. El PR4 lo sustituira y actualizara saldo atomico. El PR5 asociara metas con cuenta.
