# Ticketera CHNG

MVP funcional de ticketera listo para desplegar en **Vercel** (backend serverless con FastAPI).

## Incluye

- RBAC: `admin`, `organizer`, `validator`, `buyer`
- Eventos + publicación
- Tipos de entrada con precio/stock/ventana de venta
- Carrito con reserva temporal (`/cart/reserve`)
- Checkout con método de pago y código promo
- Tickets con QR único y validación anti-reuso
- Reembolsos administrativos
- Reporte de ventas JSON/CSV

## Estructura

- `app/main.py`: API principal
- `api/index.py`: entrypoint para Vercel Python runtime
- `vercel.json`: routing/build en Vercel

## Deploy en Vercel

1. Subir repo a GitHub.
2. Crear proyecto en Vercel e importar el repo.
3. En **Settings > Environment Variables**, configurar:
   - `PYTHONUNBUFFERED=1`
4. Deploy.

> Nota: este MVP usa SQLite (`ticketera.db`). En Vercel serverless el filesystem es efímero.
> Para producción real, cambia a Postgres (Neon/Supabase/RDS) antes de pruebas de carga.

## Local

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Swagger: `http://127.0.0.1:8000/docs`

## Próximo paso recomendado (para que te funcione bien en Vercel)

- Migrar persistencia de SQLite a Postgres.
- Mover `SECRET` a variable de entorno.
- Integrar pasarela real (Stripe/MercadoPago).
- Agregar frontend (Next.js) consumiendo esta API.
