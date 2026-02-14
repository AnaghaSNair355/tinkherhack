-- ============================================
-- College Lost & Found - Supabase Schema
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- 1. PROFILES (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  roll TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger: create profile row when user signs up (app upserts name/phone/roll after)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, roll)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'roll', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. LOST ITEMS
CREATE TABLE IF NOT EXISTS public.lost_items (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date_lost DATE NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.lost_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read lost items"
  ON public.lost_items FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert lost items"
  ON public.lost_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lost items"
  ON public.lost_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lost items"
  ON public.lost_items FOR DELETE
  USING (auth.uid() = user_id);

-- 3. FOUND ITEMS
CREATE TABLE IF NOT EXISTS public.found_items (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date_found DATE NOT NULL,
  location TEXT NOT NULL,
  image_paths TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.found_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read found items"
  ON public.found_items FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert found items"
  ON public.found_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own found items"
  ON public.found_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own found items"
  ON public.found_items FOR DELETE
  USING (auth.uid() = user_id);

-- 4. REQUESTS (for claiming found items)
CREATE TABLE IF NOT EXISTS public.requests (
  id BIGSERIAL PRIMARY KEY,
  found_item_id BIGINT NOT NULL REFERENCES public.found_items(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(found_item_id, requester_id)
);

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requester can read own requests"
  ON public.requests FOR SELECT
  USING (auth.uid() = requester_id);

CREATE POLICY "Found item owner can read requests for their items"
  ON public.requests FOR SELECT
  USING (
    found_item_id IN (SELECT id FROM public.found_items WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can insert requests"
  ON public.requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Found item owner can update request status"
  ON public.requests FOR UPDATE
  USING (
    found_item_id IN (SELECT id FROM public.found_items WHERE user_id = auth.uid())
  );

-- 5. STORAGE BUCKET for found item images
INSERT INTO storage.buckets (id, name, public)
VALUES ('found-images', 'found-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view found item images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'found-images');

CREATE POLICY "Authenticated users can upload to found-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'found-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own uploads"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'found-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own uploads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'found-images' AND auth.uid()::text = (storage.foldername(name))[1]);
