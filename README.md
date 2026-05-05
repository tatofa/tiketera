# Ticketera CHNG

Backend MVP de ticketera listo para deploy en Vercel y preparado para pasar a Postgres.

## Qué cambió (versión actual)

- Configuración por variables de entorno (`DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, `HOLD_MINUTES`).
- CORS habilitable por entorno.
- Healthcheck con estado básico de DB.
- Flujos: eventos, ticket types, carrito con hold, checkout con promo, validación, reembolsos y reporte CSV.

## Variables de entorno

Copiar `.env.example` y ajustar:

```bash
cp .env.example .env
```

- `DATABASE_URL`:
  - Local: `sqlite:///ticketera.db`
  - Producción: `postgresql+psycopg://USER:PASS@HOST:5432/DB`
- `JWT_SECRET`: secreto de firma JWT
- `CORS_ORIGINS`: lista separada por comas
- `HOLD_MINUTES`: minutos de reserva de carrito

## Deploy en Vercel

1. Subir repo a GitHub.
2. Importar el repo en Vercel.
3. Configurar env vars del proyecto:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `CORS_ORIGINS`
   - `HOLD_MINUTES`
4. Deploy.

## Importante para producción

No usar SQLite en Vercel para datos críticos (filesystem efímero). Usar Postgres administrado.

## Local

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Swagger: `http://127.0.0.1:8000/docs`


## Testing

```bash
pytest -q
```
