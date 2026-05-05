# Ticketera MVP

Sistema de ticketera para eventos desarrollado con Next.js. Está preparado para correr en local con `localhost` y desplegarse en Vercel.

## Incluye

- Sitio público de eventos
- Detalle de evento
- Selección de función, tipo de entrada y cantidad
- Carrito demo
- Checkout demo
- Generación de orden pagada
- Generación de tickets con QR único
- Descarga de PDF de entrada
- Panel de compras del usuario
- Panel administrativo
- Crear, editar, publicar y despublicar eventos
- Dashboard con métricas
- Reporte CSV de ventas
- Scanner web de QR
- Esquema SQL para Supabase/PostgreSQL

## Modo actual

El proyecto funciona en **modo demo** usando `localStorage`. Eso permite probarlo sin configurar base de datos ni pagos.

Para producción, usar la migración en:

```bash
database/migrations/001_initial_schema.sql
```

y conectar Supabase, autenticación, storage, pagos y emails reales.

## Instalación local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abrir:

```txt
http://localhost:3000
```

## Deploy en Vercel

1. Subir este proyecto a GitHub.
2. Crear un nuevo proyecto en Vercel.
3. Conectar el repositorio.
4. Configurar variables de entorno usando `.env.example` como base.
5. Ejecutar deploy.

## Variables de entorno

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PAYMENT_PROVIDER=demo
EMAIL_FROM=no-reply@ticketera.local
RESEND_API_KEY=
```

## Próximos pasos para producción

### 1. Supabase

- Crear proyecto Supabase.
- Ejecutar `database/migrations/001_initial_schema.sql`.
- Crear políticas RLS.
- Conectar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Reemplazar `lib/store.ts` por repositorios Supabase.

### 2. Pagos

Integrar Mercado Pago, Stripe u otro proveedor. No guardar datos de tarjeta en la app.

### 3. Emails

Integrar Resend, SendGrid o similar para:

- Confirmación de compra
- Envío de tickets
- Recordatorios
- Cambios/cancelaciones

### 4. Validación robusta

Usar la función SQL `mark_ticket_used` para validar tickets de forma atómica y evitar doble uso.

## Rutas principales

```txt
/
/eventos
/eventos/[slug]
/checkout
/mi-cuenta/compras
/mi-cuenta/entradas/[ticketId]
/admin
/admin/eventos
/admin/eventos/nuevo
/admin/ventas
/admin/reportes
/admin/usuarios
/scanner
```

## Nota importante

Este MVP es funcional para demo, validación de flujo y presentación. Para vender entradas reales faltan integraciones productivas: pagos, email, auth real, RLS, almacenamiento de imágenes, logs y monitoreo.
