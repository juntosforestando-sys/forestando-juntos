-- ====================================================================
-- ESQUEMA INICIAL DE BASE DE DATOS - PLATAFORMA FORESTANDO JUNTOS
-- ====================================================================

-- Habilitar extensión PostGIS si está disponible en Supabase
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. TABLA DE CATÁLOGO DE ESPECIES
CREATE TABLE IF NOT EXISTS public.species (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    common_name TEXT NOT NULL,
    scientific_name TEXT,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index para búsquedas de especies
CREATE INDEX IF NOT EXISTS idx_species_common_name ON public.species(common_name);

-- 2. TABLA PRINCIPAL DE REGISTRO DE ÁRBOLES
CREATE TABLE IF NOT EXISTS public.trees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL, -- ej. ARB-2026-000001
    planter_name TEXT NOT NULL, -- Privado: Nombre real de la persona
    public_name TEXT DEFAULT 'Anónimo', -- Público: Cómo desea aparecer
    email TEXT, -- Privado
    phone TEXT, -- Privado
    identity_card TEXT, -- Privado (Cédula)
    species_id UUID REFERENCES public.species(id) ON DELETE SET NULL,
    custom_species_name TEXT, -- Por si la especie no está en el catálogo
    planting_date DATE DEFAULT CURRENT_DATE NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy_meters DOUBLE PRECISION,
    province TEXT,
    district TEXT,
    location_description TEXT,
    privacy_level TEXT DEFAULT 'exact' CHECK (privacy_level IN ('exact', 'approximate', 'hidden')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'correction')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    approved_at TIMESTAMPTZ,
    approved_by UUID
);

-- Índices para optimizar el mapa y filtros
CREATE INDEX IF NOT EXISTS idx_trees_status ON public.trees(status);
CREATE INDEX IF NOT EXISTS idx_trees_planting_date ON public.trees(planting_date);
CREATE INDEX IF NOT EXISTS idx_trees_province ON public.trees(province);
CREATE INDEX IF NOT EXISTS idx_trees_species_id ON public.trees(species_id);

-- 3. TABLA DE FOTOGRAFÍAS DE ÁRBOLES
CREATE TABLE IF NOT EXISTS public.tree_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tree_id UUID REFERENCES public.trees(id) ON DELETE CASCADE NOT NULL,
    url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tree_photos_tree_id ON public.tree_photos(tree_id);

-- 4. SECUENCIA Y FUNCIÓN PARA GENERAR CÓDIGO ÚNICO (ARB-YYYY-000001)
CREATE SEQUENCE IF NOT EXISTS public.tree_code_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.generate_tree_code()
RETURNS TRIGGER AS $$
DECLARE
    year_str TEXT;
    seq_val INT;
BEGIN
    IF NEW.code IS NULL OR NEW.code = '' THEN
        year_str := TO_CHAR(CURRENT_DATE, 'YYYY');
        seq_val := NEXTVAL('public.tree_code_seq');
        NEW.code := 'ARB-' || year_str || '-' || LPAD(seq_val::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_generate_tree_code
BEFORE INSERT ON public.trees
FOR EACH ROW
EXECUTE FUNCTION public.generate_tree_code();

-- 5. VISTA PÚBLICA SEGURA (NUNCA EXPONE DATOS SENSIBLES)
CREATE OR REPLACE VIEW public.public_trees AS
SELECT 
    t.id,
    t.code,
    t.public_name,
    t.planting_date,
    s.common_name AS species_name,
    s.scientific_name AS species_scientific_name,
    COALESCE(s.common_name, t.custom_species_name, 'Especie no especificada') AS display_species,
    CASE 
        WHEN t.privacy_level = 'approximate' THEN ROUND(t.latitude::numeric, 3)::double precision
        ELSE t.latitude 
    END AS latitude,
    CASE 
        WHEN t.privacy_level = 'approximate' THEN ROUND(t.longitude::numeric, 3)::double precision
        ELSE t.longitude 
    END AS longitude,
    t.privacy_level,
    t.province,
    t.district,
    t.location_description,
    t.created_at,
    (
        SELECT url FROM public.tree_photos tp 
        WHERE tp.tree_id = t.id 
        ORDER BY tp.is_primary DESC, tp.created_at ASC 
        LIMIT 1
    ) AS primary_photo_url
FROM public.trees t
LEFT JOIN public.species s ON t.species_id = s.id
WHERE t.status = 'approved' AND t.privacy_level != 'hidden';

-- 6. POLÍTICAS DE SEGURIDAD A NIVEL DE FILA (ROW LEVEL SECURITY - RLS)
ALTER TABLE public.species ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_photos ENABLE ROW LEVEL SECURITY;

-- Especies: Cualquiera puede leer especies activas
CREATE POLICY "Permitir lectura publica de especies" 
ON public.species FOR SELECT 
USING (is_active = true);

-- Registros: Cualquiera puede INSERTAR (registrar un árbol público)
CREATE POLICY "Permitir registro publico de siembras" 
ON public.trees FOR INSERT 
WITH CHECK (status = 'pending');

-- Fotos: Cualquiera puede subir fotos asociadas
CREATE POLICY "Permitir subir fotos de siembras" 
ON public.tree_photos FOR INSERT 
WITH CHECK (true);

-- Fotos: Cualquiera puede ver fotos de árboles aprobados
CREATE POLICY "Permitir ver fotos de arboles aprobados" 
ON public.tree_photos FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.trees t 
        WHERE t.id = tree_photos.tree_id AND t.status = 'approved'
    )
);

-- Administradores: Acceso total si está autenticado
CREATE POLICY "Acceso total administradores a especies" 
ON public.species FOR ALL 
TO authenticated 
USING (true) WITH CHECK (true);

CREATE POLICY "Acceso total administradores a siembras" 
ON public.trees FOR ALL 
TO authenticated 
USING (true) WITH CHECK (true);

CREATE POLICY "Acceso total administradores a fotos" 
ON public.tree_photos FOR ALL 
TO authenticated 
USING (true) WITH CHECK (true);
