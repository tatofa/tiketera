# Ticketera CHNG

 codex/create-ticketing-system-requirements-g31m6b
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
=======
Plataforma de ticketing para eventos con foco en ventas online, control de aforo, validación de entradas y operación administrativa en tiempo real.

## 1) Gestión de eventos

- Crear, editar y eliminar eventos con:
  - Nombre
  - Fecha/hora
  - Lugar
  - Descripción
  - Imagen de portada
- Configurar capacidad máxima:
  - Por evento
  - Por sector/zona (ej: VIP, General, Platea)
- Soportar eventos con múltiples funciones/fechas.
- Publicar y despublicar eventos.

### Criterios de aceptación

- Un evento en estado **borrador** no aparece en la tienda pública.
- Solo eventos **publicados** y dentro de ventana de venta pueden comprarse.
- Al editar capacidad, no se permite bajar por debajo de entradas ya vendidas/reservadas.

## 2) Tipos y precios de entradas

- Definir múltiples tipos de entrada por evento (VIP, General, Platea, etc.).
- Configurar precios diferenciados por tipo.
- Soportar:
  - Descuentos
  - Códigos promocionales
  - Precio anticipado (early bird)
- Establecer fechas de inicio/cierre de venta por tipo.

### Criterios de aceptación

- Un tipo de entrada fuera de su ventana de venta no puede agregarse al carrito.
- Un código promocional inválido, expirado o sin cupo debe rechazarse con mensaje claro.
- El precio final debe registrar trazabilidad (base, descuento aplicado, impuesto, total).

## 3) Compra de entradas

- Búsqueda y exploración de eventos disponibles.
- Selección de cantidad y tipo de entradas.
- Carrito con tiempo límite de reserva (hold).
- Checkout con datos del comprador.
- Múltiples métodos de pago:
  - Tarjeta
  - Transferencia
  - Otros integrables (wallet/pasarela)

### Criterios de aceptación

- Al agregar al carrito se reserva inventario temporalmente.
- Si el hold expira, el inventario vuelve a disponibilidad automáticamente.
- Solo se confirma compra cuando el pago queda aprobado.

## 4) Entrega y validación de entradas

- Generación de entrada digital (PDF o wallet pass) con QR único.
- Envío por email al comprador.
- App/panel para escaneo y validación en ingreso.
- Detección de entradas:
  - Duplicadas
  - Ya utilizadas

### Criterios de aceptación

- Cada ticket tiene identificador único global.
- El primer escaneo válido marca la entrada como utilizada.
- Escaneos posteriores del mismo ticket son rechazados y auditados.

## 5) Gestión de usuarios

- Registro e inicio de sesión de compradores.
- Panel del usuario con:
  - Historial de compras
  - Descarga de entradas
- Panel de administrador para gestionar eventos y operadores.
- Roles y permisos:
  - Admin
  - Organizador
  - Validador

### Criterios de aceptación

- Todas las rutas administrativas requieren autenticación.
- Permisos por rol aplican en backend (no solo frontend).
- Acciones sensibles quedan registradas en bitácora.

## 6) Panel administrativo

- Dashboard en tiempo real con métricas:
  - Ventas
  - Capacidad ocupada
  - Ingresos
- Reportes por:
  - Evento
  - Tipo de entrada
  - Fecha
- Exportación de datos a CSV/Excel.
- Gestión de reembolsos y cancelaciones.

### Criterios de aceptación

- Los reportes permiten filtrar por rango de fechas.
- Reembolsos impactan inventario y estado de orden según reglas de negocio.
- Exportaciones mantienen consistencia con los datos visualizados.

## 7) Notificaciones

- Confirmación de compra por email.
- Recordatorio de evento próximo.
- Notificaciones de cambios/cancelaciones.

### Criterios de aceptación

- Notificación de compra incluye resumen de orden y acceso a tickets.
- Cambios críticos (fecha/lugar/cancelación) generan comunicación masiva.
- Reintento automático ante fallas temporales del proveedor de email.

## 8) Requerimientos no funcionales

- Alta disponibilidad y tolerancia a picos de tráfico (preventas).
- Seguridad de datos de pago (alineado a PCI-DSS).
- Diseño responsive mobile-first.
- Soporte multi-moneda y multi-idioma (opcional etapa 1).

## Alcance sugerido por fases

### Fase 1 (MVP)

- Gestión básica de eventos y tipos de entrada.
- Checkout con 1 pasarela de pago.
- Emisión de ticket PDF con QR.
- Validación básica en panel web.
- Reporte de ventas simple + exportación CSV.

### Fase 2

- Múltiples pasarelas y métodos alternativos.
- Promociones avanzadas y pricing dinámico.
- App móvil de validación offline/online.
- Multi-moneda y multi-idioma.

### Fase 3

- Escalado para alta concurrencia global.
- Analítica avanzada, cohortes y predicción de demanda.
- Integraciones externas (CRM, ERP, marketing automation).

## KPIs recomendados

- Tasa de conversión (visita -> compra)
- Tiempo promedio de checkout
- Carritos abandonados
- Tasa de aprobación de pagos
- Tiempo promedio de validación en acceso
- Tasa de fraude/duplicidad detectada

## Riesgos y mitigaciones

- **Sobrecarga en preventas:** cola virtual, autoscaling y caché.
- **Fraude de tickets:** QR firmado, validación server-side y auditoría.
- **Caída de proveedor de pago/email:** estrategia de retry y fallback.
- **Errores operativos:** RBAC estricto + trazabilidad completa.
