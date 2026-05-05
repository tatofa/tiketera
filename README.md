# Ticketera CHNG

Implementación inicial (MVP técnico) de una API para venta y validación de entradas.

## Funcionalidades implementadas

- Autenticación con roles (`admin`, `organizer`, `validator`, `buyer`).
- Gestión de eventos y publicación/despublicación.
- Gestión de tipos de entrada por evento con precio, stock y ventana de venta.
- Checkout básico con descuento de stock y emisión de tickets con QR único.
- Validación de tickets con detección de tickets ya usados.
- Consulta de órdenes del usuario autenticado.

## Stack

- FastAPI
- SQLModel + SQLite
- JWT (PyJWT)

## Ejecución local

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Documentación interactiva:
- Swagger UI: `http://127.0.0.1:8000/docs`

## Flujo rápido

1. Registrar usuario administrador en `POST /auth/register`.
2. Iniciar sesión en `POST /auth/login` y copiar `access_token`.
3. Crear evento con `POST /events` (Bearer token).
4. Publicar evento con `PATCH /events/{event_id}/publish?published=true`.
5. Crear tipo de entrada en `POST /events/{event_id}/ticket-types`.
6. Registrar usuario comprador, login y ejecutar `POST /checkout`.
7. Validar ticket con un usuario `validator` en `POST /validate/{qr_code}`.

## Notas de alcance

Este MVP prioriza el flujo principal de negocio y deja para próximas iteraciones:
- Pasarelas de pago reales.
- Carrito con expiración temporal (hold).
- Envío de email y generación PDF/wallet.
- Dashboard administrativo con métricas y reportes.
- Multi-moneda y multi-idioma.
