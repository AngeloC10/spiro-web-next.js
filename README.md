# 🌀 SPIRO

**Sistema web de gestión de tareas con gamificación**

SPIRO combina un tablero Kanban (drag-and-drop) con un sistema de mascota virtual y logros para convertir la productividad en una experiencia entretenida.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) |
| BaaS / DB | [Supabase](https://supabase.com) |
| Auth | Supabase Auth (JWT + OAuth Google) |
| Estilizado | Tailwind CSS v4 |
| Estado global | Zustand v5 |
| Drag & Drop | @dnd-kit |
| Formularios | React Hook Form + Zod |
| Pagos | Stripe (sandbox) |
| Despliegue | Vercel |

> **Sin servidor propio.** El backend es completamente Supabase; no se usa Express, bcrypt, jsonwebtoken ni pg directamente.

---

## Puesta en marcha

### 1 – Clonar e instalar dependencias

```bash
git clone <url-del-repo>
cd spiro
npm install
```

### 2 – Configurar variables de entorno

Copia el archivo de ejemplo y rellena los valores reales:

```bash
cp .env.example .env.local
```

Luego edita `.env.local`:

```env
# Supabase – Public (expuesto al navegador)
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

# Supabase – Solo servidor (¡NUNCA exponerlo al cliente!)
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# URL del sitio para redirecciones de Auth (Ej. recuperación de contraseña)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Puedes obtener estas claves en:  
**Supabase Dashboard → Project Settings → API**

> [!WARNING]
> **Límites de Correo en Supabase:** En la capa gratuita, Supabase restringe la cantidad de correos electrónicos de recuperación o registro enviados por hora. Dado que este es un entorno Sandbox/Académico, es normal. Puedes editar las plantillas de correo en **Authentication > Email Templates**.

### 3 – Inicializar la base de datos

Aplica la migración inicial en el SQL Editor de Supabase (o con la CLI):

```bash
# Con Supabase CLI (opcional)
supabase db push
```

O copia los scripts de la carpeta `supabase/migrations/` en orden cronológico y ejecútalos en el **SQL Editor** de tu proyecto Supabase. (Es indispensable correr todos los archivos hasta el `00011`).

### 4 – Poblar la base de datos (Seed)

Para tener tareas, mascotas y los productos de la tienda listos, puedes ejecutar el script de seed incluido. Asegúrate de tener configurado tu `.env.local` con `SUPABASE_SERVICE_ROLE_KEY`.

```bash
npx ts-node scripts/seed.ts
```

Este script es idempotente (`ON CONFLICT DO NOTHING`), puedes ejecutarlo múltiples veces con seguridad.

### 5 – Configurar Stripe CLI (Pruebas Locales)

Para probar los pagos de la tienda, utiliza Stripe en modo de prueba (Sandbox).
1. Instala Stripe CLI desde [https://stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)
2. Inicia sesión en la CLI con `stripe login`
3. Redirige los webhooks a tu entorno local:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### 6 – Arrancar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## Tablas en Supabase (con RLS activo)

| Tabla | Descripción |
|-------|-------------|
| `users` | Perfiles de usuario (extensión de `auth.users`) |
| `tasks` | Tareas con prioridad, puntos, posición y favoritos |
| `pets` | Mascotas virtuales adquiridas por el usuario |
| `streaks` y `achievements` | Sistema de rachas y catálogo de logros |
| `store_items` | Catálogo de tienda para la monetización MVP |

Todas las tablas tienen **Row Level Security (RLS)** habilitado con políticas `auth.uid() = user_id`.

---

## Scripts disponibles

```bash
npm run dev      # Servidor de desarrollo en localhost:3000
npm run build    # Build de producción
npm run start    # Servidor de producción
npm run lint     # ESLint
npx ts-node scripts/seed.ts # Población de la Base de Datos
```

---

## Despliegue en Vercel

Conecta el repositorio en [vercel.com](https://vercel.com) y añade las variables de entorno desde **Project → Settings → Environment Variables**.

Asegúrate de que `SUPABASE_SERVICE_ROLE_KEY` esté marcada como **Server-only** (sin el prefijo `NEXT_PUBLIC_`).
