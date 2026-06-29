import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load env vars from .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorios en .env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function seed() {
  console.log("🌱 Iniciando seed...")

  // 1. Crear usuario demo
  console.log("Creando usuario demo: demo@spiro.app...")
  let userId: string | undefined

  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    console.error("Error al listar usuarios:", listError.message)
    return
  }

  const existingUser = existingUsers.users.find(u => u.email === 'demo@spiro.app')

  if (existingUser) {
    console.log("✅ El usuario demo ya existe.")
    userId = existingUser.id
  } else {
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: 'demo@spiro.app',
      password: 'password123',
      email_confirm: true,
      user_metadata: { name: 'Demo User' }
    })
    if (createError) {
      console.error("❌ Error creando usuario:", createError.message)
      return
    }
    console.log("✅ Usuario demo creado.")
    userId = newUser.user.id
  }

  if (!userId) return

  // 2. Crear mascota demo
  console.log("Configurando mascota demo...")
  const { error: petError } = await supabase
    .from('pets')
    .insert({
      user_id: userId,
      name: 'Firulais',
      type: 'wolf',
      active: true,
      level: 5,
      xp: 250,
      hunger: 80,
      happiness: 90
    })
    // In our DB, we have a unique index on user_id where active=true, or just unique user_id if we didn't run 00011 yet.
    // ON CONFLICT DO NOTHING doesn't work perfectly on partial indexes with Prisma, but with supabase we can just ignore error if it violates unique.
  
  if (petError) {
    if (petError.code === '23505') { // unique violation
      console.log("✅ La mascota ya estaba configurada.")
    } else {
      console.error("❌ Error creando mascota:", petError.message)
    }
  } else {
    console.log("✅ Mascota configurada.")
  }

  // 3. Crear tablero de ejemplo (o usar el existente)
  console.log("Verificando tablero por defecto...")
  let boardId: string

  const { data: existingBoard } = await supabase
    .from('boards')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (existingBoard) {
    boardId = existingBoard.id
    console.log("✅ Tablero existente encontrado.")
  } else {
    const { data: newBoard, error: boardError } = await supabase
      .from('boards')
      .insert({ user_id: userId, title: 'General', description: 'Tablero principal' })
      .select('id')
      .single()

    if (boardError || !newBoard) {
      console.error("❌ Error creando tablero:", boardError?.message)
      return
    }
    boardId = newBoard.id
    console.log("✅ Tablero por defecto creado.")
  }

  // 4. Crear tareas de ejemplo
  console.log("Insertando tareas de ejemplo...")
  const tasks = [
    { user_id: userId, board_id: boardId, title: 'Diseñar interfaz MVP', description: 'Crear wireframes en Figma', status: 'done', priority: 'high', category: 'Diseño', is_favorite: true },
    { user_id: userId, board_id: boardId, title: 'Implementar Auth', description: 'Conectar con Supabase SSR', status: 'done', priority: 'urgent', category: 'Desarrollo', is_favorite: false },
    { user_id: userId, board_id: boardId, title: 'Configurar pasarela de pagos', description: 'Stripe webhook setup', status: 'in_progress', priority: 'high', category: 'Backend', is_favorite: false },
    { user_id: userId, board_id: boardId, title: 'Grabar video de demo', description: '', status: 'todo', priority: 'medium', category: 'Marketing', is_favorite: false },
    { user_id: userId, board_id: boardId, title: 'Revisar PRs del equipo', description: '', status: 'in_progress', priority: 'low', category: 'Desarrollo', is_favorite: false },
  ]

  for (const task of tasks) {
    // Basic idempotency by title and board
    const { data: existingTask } = await supabase.from('tasks').select('id').eq('user_id', userId).eq('board_id', boardId).eq('title', task.title).single()
    if (!existingTask) {
      await supabase.from('tasks').insert(task)
    }
  }
  console.log("✅ Tareas de ejemplo listas.")

  // 4. Verificar Store Items
  console.log("Verificando ítems de la tienda...")
  const { data: items, error: itemsError } = await supabase.from('store_items').select('*')
  if (itemsError) {
    console.error("❌ Error verificando tienda. Asegúrate de haber ejecutado la migración 00011.")
  } else if (items && items.length >= 6) {
    console.log("✅ Tienda configurada con 6 o más ítems.")
  } else {
    console.warn("⚠️ Faltan ítems en la tienda. Ejecuta la migración 00011 en Supabase.")
  }

  console.log("🎉 Seed completado exitosamente.")
}

seed().catch(console.error)
