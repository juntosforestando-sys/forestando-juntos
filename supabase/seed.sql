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
