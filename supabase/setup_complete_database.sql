-- ====================================================================
-- MASTER SQL: INSTALACIÓN COMPLETA Y UNIFICADA (FORESTANDO JUNTOS)
-- Copia y pega TODO este contenido en el SQL Editor de Supabase y haz clic en RUN.
-- ====================================================================

-- 0. LIMPIEZA PREVIA SI EXISTÍAN TABLAS PARCIALES
DROP VIEW IF EXISTS public.public_trees CASCADE;
DROP TRIGGER IF EXISTS trigger_generate_tree_code ON public.trees;
DROP FUNCTION IF EXISTS public.generate_tree_code();
DROP TABLE IF EXISTS public.tree_photos CASCADE;
DROP TABLE IF EXISTS public.trees CASCADE;
DROP TABLE IF EXISTS public.species CASCADE;
DROP SEQUENCE IF EXISTS public.tree_code_seq CASCADE;

-- ====================================================================
-- ESQUEMA INICIAL DE BASE DE DATOS - PLATAFORMA FORESTANDO JUNTOS
-- ====================================================================

-- Habilitar extensión PostGIS si está disponible en Supabase
-- PostGIS opcional

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


-- ====================================================================
-- DATOS SEMILLA E INICIALES - CATÁLOGO DE ESPECIES (PANAMÁ)
-- ====================================================================

INSERT INTO public.species (common_name, scientific_name, description, is_active) VALUES
('Guayacán Morado', 'Handroanthus impetiginosus', 'Árbol nativo de América tropical conocido por sus espectaculares y vistosas flores moradas y su madera densa.', true),
('Guayacán Amarillo', 'Handroanthus chrysanthus', 'Árbol emblemático de impresionante floración amarilla brillante durante la temporada seca.', true),
('Roble', 'Tabebuia rosea', 'Árbol majestuoso conocido como guayacán rosado u ocobo, de floración rosada a blanca.', true),
('Cedro Amargo', 'Cedrela odorata', 'Especie maderable de gran valor ecológico y comercial, nativa de bosques tropicales.', true),
('Caoba', 'Swietenia macrophylla', 'Árbol de copa densa y madera de altísima calidad, fundamental para la reforestación.', true),
('Guayacán de Playa', 'Guaiacum officinale', 'Árbol de crecimiento lento con pequeñas flores moradas a azules y madera muy dura.', true),
('Jacarandá', 'Jacaranda mimosifolia', 'Árbol ornamental de hermosas flores azul-violeta.', true)
ON CONFLICT DO NOTHING;


-- ====================================================================
-- MIGRACIÓN HISTÓRICA DE ÁRBOLES SEMBRADOS (DESDE EXCEL)
-- ====================================================================

INSERT INTO public.trees (code, planter_name, public_name, email, identity_card, custom_species_name, planting_date, latitude, longitude, province, location_description, privacy_level, status, notes) VALUES ('ARB-2024-000001', 'Domingo Vega Vega', 'Domingo Vega Vega', 'domingo.vega@oteima.ac.pa', '6-719-2441', 'Guayacán morado', '2024-09-15', 7.946295, -80.77627, 'Herrera', 'Ocú, Peñas Chatas, Paso Laja', 'exact', 'approved', 'Es un árbol nativo de América tropical y es conocido por sus vistosas flores moradas.') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tree_photos (tree_id, url, is_primary) SELECT id, 'https://lh3.googleusercontent.com/d/1PBT6sagBs-OD8zHkv-dGMIHL0YUFIrcp', true FROM public.trees WHERE code = 'ARB-2024-000001' ON CONFLICT DO NOTHING;

INSERT INTO public.trees (code, planter_name, public_name, email, identity_card, custom_species_name, planting_date, latitude, longitude, province, location_description, privacy_level, status, notes) VALUES ('ARB-2024-000002', 'Fernando Camaño', 'Fernando Camaño', 'fernando.adames@oteima.ac.pa', '9-757-2446', 'Guayacán', '2024-09-15', 8.12218, -80.966103, 'Veraguas', 'Barriada la Esmeralda, corregimiento de Canto del Llano', 'exact', 'approved', 'Plantón pequeño') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tree_photos (tree_id, url, is_primary) SELECT id, 'https://lh3.googleusercontent.com/d/1VqyPSh1QuvN53CoUZVG_PwlpWd_8tkeg', true FROM public.trees WHERE code = 'ARB-2024-000002' ON CONFLICT DO NOTHING;

INSERT INTO public.trees (code, planter_name, public_name, email, identity_card, custom_species_name, planting_date, latitude, longitude, province, location_description, privacy_level, status, notes) VALUES ('ARB-2024-000003', 'Anthony Rodriguez', 'Anthony Rodriguez', 'anthony.rodriguez@oteima.ac.pa', '4-830-1297', 'Guayacán Morado', '2024-09-15', 8.08053, -80.97686, 'Veraguas', 'Veraguas, Nuevo Santiago, San Antonio.', 'exact', 'approved', 'Es un arbusto de 2 a 5 m de altura, presenta ramas gruesas y torcidas desde la base, con un diámetro del tronco de hasta 20 cm., de copa densa, apretada, perennifolio. Sus flores son pequeñas y violáceas. Sus frutos son cápsulas moradas, tiene numerosas semillas.') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tree_photos (tree_id, url, is_primary) SELECT id, 'https://lh3.googleusercontent.com/d/127loAtCKA4gZ7f0Tq6mBqZjwQpJnu3q5', true FROM public.trees WHERE code = 'ARB-2024-000003' ON CONFLICT DO NOTHING;

INSERT INTO public.trees (code, planter_name, public_name, email, identity_card, custom_species_name, planting_date, latitude, longitude, province, location_description, privacy_level, status, notes) VALUES ('ARB-2024-000004', 'Kevin Elieser Concepción Rodríguez', 'Kevin Elieser Concepción Rodríguez', 'kevin.concepcion@oteima.ac.pa', '9-762-2281', 'Guayacán', '2024-09-15', 8.299948, -81.010664, 'Veraguas', 'La Honda, San Juan, San Francisco, Veraguas, Panamá', 'exact', 'approved', 'Este árbol pertenece a la familia Bignoniaceae y es también llamado guayacán rosado, apamate, o ocobo. Es originario de América y se encuentra comúnmente en diversas regiones tropicales, como Colombia y otros países de América Central y del Sur.') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tree_photos (tree_id, url, is_primary) SELECT id, 'https://lh3.googleusercontent.com/d/1jDQt1GUHKcL2GTBtuJ35Ke7_pYHCb4yX', true FROM public.trees WHERE code = 'ARB-2024-000004' ON CONFLICT DO NOTHING;

INSERT INTO public.trees (code, planter_name, public_name, email, identity_card, custom_species_name, planting_date, latitude, longitude, province, location_description, privacy_level, status, notes) VALUES ('ARB-2024-000005', 'Fatima Escobar', 'Fatima Escobar', 'fatima.escobar@oteima.ac.pa', '9-762-263', 'Guayacán morado', '2024-09-15', 7.960288, -81.174184, 'Veraguas', 'Rio de Jesus, el cuartillo', 'exact', 'approved', 'El guayacán es un árbol tropical conocido por su madera dura y sus flores vistosas.') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tree_photos (tree_id, url, is_primary) SELECT id, 'https://lh3.googleusercontent.com/d/1sxNKjTj9d-19iEbj3ZwtDA2ZW9Sgs5gc', true FROM public.trees WHERE code = 'ARB-2024-000005' ON CONFLICT DO NOTHING;

INSERT INTO public.trees (code, planter_name, public_name, email, identity_card, custom_species_name, planting_date, latitude, longitude, province, location_description, privacy_level, status, notes) VALUES ('ARB-2024-000006', 'Corina Nicole Lara González', 'Corina Nicole Lara González', 'corina.lara@oteima.ac.pa', '9-758-1377', 'Guayacán Morado', '2024-09-15', 8.115386, -80.949904, 'Veraguas', 'Distrito de Santiago, corregimiento  Carlos Santana Ávila, lugar El Espino de Santa Rosa', 'exact', 'approved', 'El guayacán es un árbol tropical conocido por su madera dura y sus flores vistosas. Aquí tienes algunas recomendaciones para su siembra:  1. Clima: El guayacán requiere un clima cálido y tropical. Idealmente, debe recibir pleno sol y estar en una región con temperaturas que no bajen de 10°C.  2. Suelo: Prefiere suelos bien drenados y ligeramente ácidos a neutros. Evita suelos arcillosos o que retengan demasiada agua, ya que esto puede llevar a problemas de raíz.  3. Preparación del Suelo: Asegúrate de preparar el suelo adecuadamente antes de plantar. Puedes mejorar el drenaje agregando arena o material orgánico.  4. Espaciado: Si plantas más de un árbol, asegúrate de dejarlos a una distancia adecuada, generalmente de 4 a 6 metros entre cada uno, para permitir un buen desarrollo.  5. Riego: Aunque el guayacán es bastante resistente a la sequía una vez establecido, asegúrate de regar bien durante el primer año para fomentar un buen crecimiento. Luego, el riego puede reducirse a medida que el árbol se aclimata.  6. Fertilización: Fertiliza el suelo con un abono balanceado durante la temporada de crecimiento para apoyar el desarrollo saludable del árbol.  7. Mantenimiento: Controla las plagas y enfermedades, y poda el árbol si es necesario para mantener su forma y salud.  Recuerda que el guayacán es un árbol de crecimiento lento, así que ten paciencia mientras se desarrolla.') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tree_photos (tree_id, url, is_primary) SELECT id, 'https://lh3.googleusercontent.com/d/1nINt8LsiABPTLUixwX2GBm9OZPtUnZXC', true FROM public.trees WHERE code = 'ARB-2024-000006' ON CONFLICT DO NOTHING;

INSERT INTO public.trees (code, planter_name, public_name, email, identity_card, custom_species_name, planting_date, latitude, longitude, province, location_description, privacy_level, status, notes) VALUES ('ARB-2024-000007', 'Angie Hidalgo', 'Angie Hidalgo', 'angie.milagros@oteima.ac.pa', '9-762-2343', 'Guayacan morado', '2024-09-15', 8.016372, -80.984086, 'Veraguas', 'Los Hatillos vía La Colorada, Santiago, Veraguas.', 'exact', 'approved', 'El guayacán morado (Handroanthus impetiginosus) es un árbol majestuoso y emblemático de América Latina, conocido por su floración espectacular. En temporada, sus ramas se cubren de racimos de flores de un color púrpura intenso, creando un manto de tonos vibrantes que contrastan con el azul del cielo y el verdor de su follaje.') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tree_photos (tree_id, url, is_primary) SELECT id, 'https://lh3.googleusercontent.com/d/1_IWcuUYVDQ1s-9Uy24RSstWPW7EokfL8', true FROM public.trees WHERE code = 'ARB-2024-000007' ON CONFLICT DO NOTHING;

INSERT INTO public.trees (code, planter_name, public_name, email, identity_card, custom_species_name, planting_date, latitude, longitude, province, location_description, privacy_level, status, notes) VALUES ('ARB-2024-000008', 'Angie Hidalgo', 'Angie Hidalgo', 'angie.milagros@oteima.ac.pa', '9-762-2343', 'Guayacan morado', '2024-09-15', 8.0166, -80.9843, 'Veraguas', 'Los Hatillos vía La Colorada, Santiago, Veraguas.', 'exact', 'approved', 'El guayacan morado, conocido por su hermosa floración de color violeta o morada. Durante la temporada seca, su copa se llena de vida con un manto de color que contrasta bellamente con el cielo despejado. El guayacán morado simboliza fuerza, resistencia y renovación. Su capacidad para florecer de manera espectacular en la temporada seca, cuando la mayoría de los árboles parecen inertes, lo convierte en un símbolo de perseverancia frente a la adversidad.') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tree_photos (tree_id, url, is_primary) SELECT id, 'https://lh3.googleusercontent.com/d/1LzK31KZMVSdFsdiTlsYsoRvuciLtjO6M', true FROM public.trees WHERE code = 'ARB-2024-000008' ON CONFLICT DO NOTHING;

INSERT INTO public.trees (code, planter_name, public_name, email, identity_card, custom_species_name, planting_date, latitude, longitude, province, location_description, privacy_level, status, notes) VALUES ('ARB-2024-000009', 'Angie Hidalgo', 'Angie Hidalgo', 'angie.milagros@oteima.ac.pa', '9-762-2343', 'Guayacán morado', '2024-09-15', 8.0161, -80.9838, 'Veraguas', 'Los Hatillos vía La Colorada, Santiago, Veraguas.', 'exact', 'approved', 'El guayacan morado, conocido por su hermosa floración de color violeta o morada. Durante la temporada seca, su copa se llena de vida con un manto de color que contrasta bellamente con el cielo despejado. El guayacán morado simboliza fuerza, resistencia y renovación. Su capacidad para florecer de manera espectacular en la temporada seca, cuando la mayoría de los árboles parecen inertes, lo convierte en un símbolo de perseverancia frente a la adversidad.') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tree_photos (tree_id, url, is_primary) SELECT id, 'https://lh3.googleusercontent.com/d/1iQSzL1Swm2EcGWvpPU_PHUWyCTXsd7IK', true FROM public.trees WHERE code = 'ARB-2024-000009' ON CONFLICT DO NOTHING;

INSERT INTO public.trees (code, planter_name, public_name, email, identity_card, custom_species_name, planting_date, latitude, longitude, province, location_description, privacy_level, status, notes) VALUES ('ARB-2024-000010', 'Lia Milena González Pardo', 'Lia Milena González Pardo', 'liag70921@gmail.com', '9-765-2184', 'Guayacán', '2024-09-15', 8.2995, -81.01, 'Veraguas', 'San Francisco Distrito, Barrida El Rosario', 'exact', 'approved', 'Árbol pequeño color verde de tamaño pequeño') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tree_photos (tree_id, url, is_primary) SELECT id, 'https://lh3.googleusercontent.com/d/1h8Vwe3I33Tsj4W_G5isH3eHGa5Omos0l', true FROM public.trees WHERE code = 'ARB-2024-000010' ON CONFLICT DO NOTHING;

INSERT INTO public.trees (code, planter_name, public_name, email, identity_card, custom_species_name, planting_date, latitude, longitude, province, location_description, privacy_level, status, notes) VALUES ('ARB-2024-000011', 'Fernando Barría Cornejo', 'Fernando Barría Cornejo', 'fernando.barria@oteima.ac.pa', '9-715-388', 'Guayacán Morado', '2024-09-15', 8.225, -81.365, 'Veraguas', 'Cañazas, Visvalles, Alto de Los Sánchez', 'exact', 'approved', 'Es un árbol de hasta 15 metros de altura, con una corteza grisácea y flores moradas en racimos que florecen en primavera. Su madera es dura y valiosa, y es apreciado por su belleza ornamental.') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tree_photos (tree_id, url, is_primary) SELECT id, 'https://lh3.googleusercontent.com/d/1TAFDv-tB8PbANZb2ohXq1rJZ4Ib7eEdI', true FROM public.trees WHERE code = 'ARB-2024-000011' ON CONFLICT DO NOTHING;

INSERT INTO public.trees (code, planter_name, public_name, email, identity_card, custom_species_name, planting_date, latitude, longitude, province, location_description, privacy_level, status, notes) VALUES ('ARB-2024-000012', 'Fernando Barría Cornejo', 'Fernando Barría Cornejo', 'fernando.barria@oteima.ac.pa', '9-715-388', 'Guayacán Morado', '2024-09-15', 8.2253, -81.3653, 'Veraguas', 'Cañazas, Visvalles, Alto de Los Sanchez', 'exact', 'approved', 'Es un árbol de hasta 15 metros de altura, con una corteza grisácea y flores moradas en racimos que florecen en primavera. Su madera es dura y valiosa, y es apreciado por su belleza ornamental.') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tree_photos (tree_id, url, is_primary) SELECT id, 'https://lh3.googleusercontent.com/d/1Q_o4vsgx3kw0BpJF2UhjQqevY-7ugR_X', true FROM public.trees WHERE code = 'ARB-2024-000012' ON CONFLICT DO NOTHING;

INSERT INTO public.trees (code, planter_name, public_name, email, identity_card, custom_species_name, planting_date, latitude, longitude, province, location_description, privacy_level, status, notes) VALUES ('ARB-2024-000013', 'John jordán', 'John jordán', 'john.jordan@oteima.ac.pa', '9-767-1065', 'Guayacá', '2024-09-15', 7.9605, -81.1745, 'Veraguas', 'Distrito Rio de Jesús', 'exact', 'approved', 'El guayacán morado, científicamente conocido como Guaiacum sanctum, es un árbol nativo de América Central y el Caribe, famoso por su madera extremadamente dura y densa, así como por sus hermosas flores moradas') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tree_photos (tree_id, url, is_primary) SELECT id, 'https://lh3.googleusercontent.com/d/1s2JWF9oo-CkgZ7XSm5IDSS63fQIg10cg', true FROM public.trees WHERE code = 'ARB-2024-000013' ON CONFLICT DO NOTHING;

