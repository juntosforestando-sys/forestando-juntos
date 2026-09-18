import json
import re

def escape_sql(text):
    if not text:
        return ''
    # Reemplazar salto de línea por espacio o \n en SQL
    text = str(text).replace("'", "''").replace('\r\n', ' ').replace('\n', ' ')
    return text.strip()

def generate_sql():
    with open('parsed_historical_data.json', 'r', encoding='utf-8') as f:
        records = json.load(f)

    sql_lines = [
        "-- ====================================================================",
        "-- MIGRACIÓN HISTÓRICA DE ÁRBOLES SEMBRADOS (DESDE EXCEL)",
        "-- ====================================================================",
        ""
    ]

    for idx, r in enumerate(records, 1):
        code = f"ARB-2024-{idx:06d}"
        planter_name = escape_sql(r.get('Nombre Completo') or r.get('Nombre del Forestador') or 'Participante')
        public_name = escape_sql(r.get('Nombre Completo') or 'Participante OTEIMA')
        email = escape_sql(r.get('Dirección de correo electrónico') or r.get('Email') or '')
        identity_card = escape_sql(r.get('Cédula') or '')
        species_name = escape_sql(r.get('Tipo de Árbol') or 'Guayacán Morado')
        province = escape_sql(r.get('Provincia / Comarca') or 'Veraguas')
        location_desc = escape_sql(r.get('Ubicación de la Siembra') or '')
        notes = escape_sql(r.get('Descripción del Árbol') or '')
        lat = r.get('_parsed_lat', 8.11)
        lng = r.get('_parsed_lng', -80.97)

        photo_url = escape_sql(r.get('Foto del Árbol sembrado') or '')

        tree_sql = f"INSERT INTO public.trees (code, planter_name, public_name, email, identity_card, custom_species_name, planting_date, latitude, longitude, province, location_description, privacy_level, status, notes) VALUES ('{code}', '{planter_name}', '{public_name}', '{email}', '{identity_card}', '{species_name}', '2024-09-15', {lat}, {lng}, '{province}', '{location_desc}', 'exact', 'approved', '{notes}') ON CONFLICT (code) DO NOTHING;"

        sql_lines.append(tree_sql)

        if photo_url and ('http' in photo_url or 'lh3.googleusercontent' in photo_url):
            photo_sql = f"INSERT INTO public.tree_photos (tree_id, url, is_primary) SELECT id, '{photo_url}', true FROM public.trees WHERE code = '{code}' ON CONFLICT DO NOTHING;"
            sql_lines.append(photo_sql)

        sql_lines.append("")

    with open('supabase/seed_historical_trees.sql', 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_lines))

    print(f"Generadas inserciones SQL para {len(records)} registros históricos en supabase/seed_historical_trees.sql")

if __name__ == '__main__':
    generate_sql()
