import os

def main():
    schema = open('supabase/migrations/00001_initial_schema.sql', encoding='utf-8').read()
    schema_clean = schema.replace('CREATE EXTENSION IF NOT EXISTS "postgis";', '-- PostGIS opcional')

    seed = open('supabase/seed.sql', encoding='utf-8').read()
    trees = open('supabase/seed_historical_trees.sql', encoding='utf-8').read()

    master_sql = f"""-- ====================================================================
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

{schema_clean}

{seed}

{trees}
"""

    with open('supabase/setup_complete_database.sql', 'w', encoding='utf-8') as f:
        f.write(master_sql)

    print("Creado supabase/setup_complete_database.sql exitosamente.")

if __name__ == '__main__':
    main()
