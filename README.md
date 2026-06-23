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
```

Puedes obtener estas claves en:  
**Supabase Dashboard → Project Settings → API**

### 3 – Inicializar la base de datos

Aplica la migración inicial en el SQL Editor de Supabase (o con la CLI):

```bash
# Con Supabase CLI (opcional)
supabase db push
```

O copia el contenido de `supabase/migrations/00001_initial_schema.sql` y ejecútalo en el **SQL Editor** de tu proyecto.

### 4 – Arrancar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## Estructura de carpetas

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/          # Página de inicio de sesión
│   │   └── register/       # Página de registro
│   └── (dashboard)/
│       ├── dashboard/      # Tablero Kanban principal
│       └── store/          # Tienda de mascotas
├── components/
│   ├── kanban/             # Componentes del tablero
│   ├── pet/                # Componentes de la mascota
│   └── ui/                 # Design system (botones, inputs, etc.)
├── lib/
│   └── supabase/
│       ├── client.ts       # createBrowserClient() – Client Components
│       └── server.ts       # createServerClient() – Server Components / Route Handlers
├── schemas/                # Schemas de validación con Zod
├── store/                  # Stores de Zustand (taskStore, petStore)
└── types/                  # Tipos TypeScript globales
supabase/
└── migrations/             # SQL de migraciones de la base de datos
```

---

## Reglas de uso de los clientes Supabase

| Contexto | Función a usar |
|----------|---------------|
| Server Components | `createServerClient()` de `lib/supabase/server.ts` |
| Route Handlers | `createServerClient()` de `lib/supabase/server.ts` |
| Client Components | `createBrowserClient()` de `lib/supabase/client.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Solo servidor** — jamás importar en componentes del cliente |

---

## Tablas en Supabase (con RLS activo)

| Tabla | Descripción |
|-------|-------------|
| `users` | Perfiles de usuario (extensión de `auth.users`) |
| `columns` | Columnas del tablero Kanban |
| `tasks` | Tareas con prioridad, puntos y posición |
| `pet_stats` | Stats de la mascota virtual por usuario |
| `activity_history` | Historial de acciones y puntos obtenidos |

Todas las tablas tienen **Row Level Security (RLS)** habilitado con políticas `auth.uid() = user_id`.

---

## Scripts disponibles

```bash
npm run dev      # Servidor de desarrollo en localhost:3000
npm run build    # Build de producción
npm run start    # Servidor de producción
npm run lint     # ESLint
```

---

## Despliegue en Vercel

Conecta el repositorio en [vercel.com](https://vercel.com) y añade las variables de entorno desde **Project → Settings → Environment Variables**.

Asegúrate de que `SUPABASE_SERVICE_ROLE_KEY` esté marcada como **Server-only** (sin el prefijo `NEXT_PUBLIC_`).
