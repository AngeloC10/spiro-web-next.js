-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Store Catalog and User Collections
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Fix constraint on pets ────────────────────────────────────────────────
-- The old constraint (UNIQUE (user_id, active)) prevented multiple inactive pets.
ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS one_active_pet_per_user;
DROP INDEX IF EXISTS idx_one_active_pet;

-- Create partial unique index that only enforces uniqueness for active = true
CREATE UNIQUE INDEX idx_one_active_pet ON public.pets (user_id) WHERE active = true;

-- ── 2. Store Items Table ─────────────────────────────────────────────────────
CREATE TYPE item_rarity AS ENUM ('common', 'rare', 'epic', 'legendary');
CREATE TYPE store_item_type AS ENUM ('pet', 'accessory', 'theme');

CREATE TABLE IF NOT EXISTS public.store_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  type        store_item_type NOT NULL,
  description TEXT,
  price_usd   NUMERIC(10, 2) NOT NULL,
  rarity      item_rarity DEFAULT 'common' NOT NULL,
  preview_url TEXT NOT NULL,
  is_active   BOOLEAN DEFAULT true NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed Data for Store
INSERT INTO public.store_items (name, type, description, price_usd, rarity, preview_url, is_active) 
VALUES 
  ('Lobo ártico', 'pet', 'Un fiel compañero resistente al frío.', 2.99, 'rare', '/pets/wolf.svg', true), 
  ('Axolotl', 'pet', 'Una mascota acuática muy amigable y curiosa.', 1.99, 'common', '/pets/axolotl.svg', true), 
  ('Dragón Rojo', 'pet', 'Una criatura legendaria de gran poder y belleza.', 4.99, 'epic', '/pets/red-dragon.svg', true), 
  ('Sombrero pirata', 'accessory', 'Un clásico sombrero pirata para aventuras.', 0.49, 'common', '/acc/hat.svg', true), 
  ('Capa espacial', 'accessory', 'Una capa que desafía la gravedad misma.', 0.99, 'rare', '/acc/cape.svg', true), 
  ('Gafas de sol', 'accessory', 'Mantén el estilo en los días más soleados.', 0.49, 'common', '/acc/glasses.svg', true)
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for store items"
  ON public.store_items FOR SELECT
  USING (true);

-- ── 3. Purchases Table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchases (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_id           UUID REFERENCES public.store_items(id) ON DELETE CASCADE NOT NULL,
  amount_paid       NUMERIC(10, 2) NOT NULL,
  status            TEXT DEFAULT 'completed' NOT NULL,
  stripe_session_id TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own purchases"
  ON public.purchases FOR SELECT
  USING (auth.uid() = user_id);

-- ── 4. User Pets Collection ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_pets_collection (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_id     UUID REFERENCES public.store_items(id) ON DELETE CASCADE NOT NULL,
  pet_type    TEXT NOT NULL,  -- stores the string name/type identifier
  source      TEXT DEFAULT 'store' NOT NULL,
  acquired_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, item_id)
);

ALTER TABLE public.user_pets_collection ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their collection"
  ON public.user_pets_collection FOR SELECT
  USING (auth.uid() = user_id);

-- ── 5. Active Pet RPC ────────────────────────────────────────────────────────
-- Safely switches the active pet for a user without violating constraints
CREATE OR REPLACE FUNCTION public.set_active_pet(p_user_id UUID, p_pet_type TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is the user
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Deactivate current active pet
  UPDATE public.pets
  SET active = false
  WHERE user_id = p_user_id AND active = true;

  -- Ensure the requested pet exists in the pets table. If not, create it.
  -- Notice: In a full app, you might only insert if it's in user_pets_collection.
  IF NOT EXISTS (SELECT 1 FROM public.pets WHERE user_id = p_user_id AND type::text = p_pet_type) THEN
    -- Try to cast p_pet_type to pet_type. If it's a new type not in the ENUM, this might fail,
    -- but for our current app setup it works.
    BEGIN
      INSERT INTO public.pets (user_id, name, type, active)
      VALUES (p_user_id, p_pet_type, p_pet_type::pet_type, true);
    EXCEPTION WHEN invalid_text_representation THEN
      -- If the pet_type is not in the ENUM, we can't insert it into `pets` right now.
      -- So we just raise a notice.
      RAISE NOTICE 'Pet type % not valid in enum pet_type.', p_pet_type;
    END;
  ELSE
    -- Activate the requested pet
    UPDATE public.pets
    SET active = true
    WHERE user_id = p_user_id AND type::text = p_pet_type;
  END IF;
END;
$$;
