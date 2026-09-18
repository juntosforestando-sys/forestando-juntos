import json
import re

def generate_full_demo_js():
    with open('parsed_historical_data.json', 'r', encoding='utf-8') as f:
        records = json.load(f)

    demo_trees = []
    
    # Imagen de fallback elegante para árboles que no tengan foto válida
    default_photos = [
        "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=800&q=80"
    ]

    for idx, r in enumerate(records, 1):
        code = f"ARB-2024-{idx:06d}"
        planter_name = (r.get('Nombre Completo') or r.get('Nombre del Forestador') or 'Participante OTEIMA').strip()
        public_name = planter_name
        email = (r.get('Dirección de correo electrónico') or r.get('Email') or '').strip()
        species_name = (r.get('Tipo de Árbol') or 'Guayacán Morado').strip()
        scientific_name = (r.get('Nombre científico del Árbol') or '').strip()
        province = (r.get('Provincia / Comarca') or 'Veraguas').strip()
        location_desc = (r.get('Ubicación de la Siembra') or '').strip()
        notes = (r.get('Descripción del Árbol') or '').strip()
        lat = r.get('_parsed_lat', 8.11)
        lng = r.get('_parsed_lng', -80.97)

        photo_url = (r.get('Foto del Árbol sembrado') or '').strip()
        if not photo_url or 'http' not in photo_url:
            photo_url = default_photos[(idx - 1) % len(default_photos)]

        demo_trees.append({
            "id": f"excel-{idx}",
            "code": code,
            "planter_name": planter_name,
            "public_name": public_name,
            "email": email,
            "species_name": species_name,
            "species_scientific_name": scientific_name,
            "planting_date": "2024-09-15",
            "latitude": lat,
            "longitude": lng,
            "province": province,
            "location_description": location_desc,
            "privacy_level": "exact",
            "status": "approved",
            "notes": notes,
            "primary_photo_url": photo_url
        })

    # Especies únicas
    species_set = set(t['species_name'] for t in demo_trees if t['species_name'])
    demo_species = [
        {"id": f"sp-{i+1}", "common_name": sp, "scientific_name": ""}
        for i, sp in enumerate(sorted(species_set))
    ]

    js_content = f"""// Configuración centralizada de Supabase para Forestando Juntos

const SUPABASE_CONFIG = {{
    url: "https://your-supabase-project.supabase.co",
    anonKey: "your-anon-key-here",
    useFallback: true
}};

// Dataset inicial completo con los 15 registros extraídos del Excel histórico
const DEMO_TREES = {json.dumps(demo_trees, ensure_ascii=False, indent=4)};

const DEMO_SPECIES = {json.dumps(demo_species, ensure_ascii=False, indent=4)};
"""

    with open('js/supabase-config.js', 'w', encoding='utf-8') as f:
        f.write(js_content)

    print(f"Actualizado js/supabase-config.js con todos los {len(demo_trees)} registros del Excel.")

if __name__ == '__main__':
    generate_full_demo_js()
