import json

def inspect():
    with open('parsed_historical_data.json', 'r', encoding='utf-8') as f:
        records = json.load(f)

    for idx, r in enumerate(records, 1):
        print(f"=== REGISTRO {idx}: {r.get('Nombre Completo')} ===")
        print(f"  Provincia: {r.get('Provincia / Comarca')}")
        print(f"  Ubicación Texto: {r.get('Ubicación de la Siembra')}")
        print(f"  Coordenadas Texto: {r.get('Coordenadas de la siembra')}")
        print(f"  Lat/Lng Actuales: {r.get('_parsed_lat')}, {r.get('_parsed_lng')}")
        print("-" * 60)

if __name__ == '__main__':
    inspect()
