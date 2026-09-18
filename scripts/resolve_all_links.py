import urllib.request
import re
import json

raw_items = [
    # 1. Domingo Vega Vega
    {"id": 1, "name": "Domingo Vega Vega", "raw": """8.016322, -80.817181
8º0'58"N, 80º49'1"W
17 N 520145.36 886106.77
17P NJ 20146 86107"""},

    # 2. Fernando Camaño
    {"id": 2, "name": "Fernando Camaño", "raw": "https://maps.apple.com/?ll=8.111931,-80.970868&q=Marcador&t=m"},

    # 3. Anthony Rodriguez
    {"id": 3, "name": "Anthony Rodriguez", "raw": "https://www.google.com/maps/search/?api=1&query=33JF%2B652++Santiago++Veraguas+Province++Panama"},

    # 4. Kevin Elieser Concepción Rodríguez
    {"id": 4, "name": "Kevin Elieser Concepción Rodríguez", "raw": "8.322717898883392, -81.02702797286486"},

    # 5. Fatima Escobar
    {"id": 5, "name": "Fatima Escobar", "raw": "https://maps.app.goo.gl/kp9smGdMzPW4in4GA"},

    # 6. Corina Nicole Lara González
    {"id": 6, "name": "Corina Nicole Lara González", "raw": "8.093288,-80.828315"},

    # 7. Angie Hidalgo (1)
    {"id": 7, "name": "Angie Hidalgo (1)", "raw": "https://maps.app.goo.gl/mk9DydETa3nkCP7B7"},

    # 8. Angie Hidalgo (2)
    {"id": 8, "name": "Angie Hidalgo (2)", "raw": "https://maps.app.goo.gl/mk9DydETa3nkCP7B7"},

    # 9. Angie Hidalgo (3)
    {"id": 9, "name": "Angie Hidalgo (3)", "raw": "https://maps.app.goo.gl/mk9DydETa3nkCP7B7"},

    # 10. Lia Milena González Pardo
    {"id": 10, "name": "Lia Milena González Pardo", "raw": "8.24489° N, 80.98041° O"},

    # 11. Fernando Barría Cornejo (1)
    {"id": 11, "name": "Fernando Barría Cornejo (1)", "raw": "https://maps.app.goo.gl/xyH7X3ajJXxSvQyk6"},

    # 12. Fernando Barría Cornejo (2)
    {"id": 12, "name": "Fernando Barría Cornejo (2)", "raw": "https://maps.app.goo.gl/xyH7X3ajJXxSvQyk6"},

    # 13. John Jordán
    {"id": 13, "name": "John Jordán", "raw": "Coordenadad 7.9844805, -81.1622413"}
]

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

def resolve_item(item):
    text = item['raw'].strip()
    
    # Si es una URL corta maps.app.goo.gl, hacer un request para ver a dónde redirige
    if 'maps.app.goo.gl' in text or 'goo.gl' in text:
        req = urllib.request.Request(text, headers=headers)
        try:
            with urllib.request.urlopen(req) as resp:
                final_url = resp.geturl()
                print(f"[{item['id']}] {item['name']} -> Redirigió a: {final_url}")
                # Buscar @lat,lng en la URL redirigida de Google Maps (ej. @8.1234,-80.5678)
                m = re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', final_url)
                if m:
                    return float(m.group(1)), float(m.group(2))
                m2 = re.search(r'q=(-?\d+\.\d+),(-?\d+\.\d+)', final_url)
                if m2:
                    return float(m2.group(1)), float(m2.group(2))
                m3 = re.search(r'll=(-?\d+\.\d+),(-?\d+\.\d+)', final_url)
                if m3:
                    return float(m3.group(1)), float(m3.group(2))
        except Exception as e:
            print(f"[{item['id']}] {item['name']} -> Error resolviendo enlace: {e}")

    # Si es Apple Maps
    if 'maps.apple.com' in text:
        m = re.search(r'll=(-?\d+\.\d+),(-?\d+\.\d+)', text)
        if m:
            return float(m.group(1)), float(m.group(2))

    # Buscar lat, lng con decimales en texto directo
    m = re.search(r'(-?\d+\.\d+)\s*[°\s]*[Nn]?\s*,\s*(-?\d+\.\d+)\s*[°\s]*[WOwo]?', text)
    if m:
        lat = float(m.group(1))
        lng = float(m.group(2))
        if lng > 0:
            lng = -lng
        return lat, lng

    return 8.11, -80.97

results = {}
for item in raw_items:
    lat, lng = resolve_item(item)
    results[item['id']] = {"name": item['name'], "lat": lat, "lng": lng}
    print(f"RESULTADO [{item['id']}] {item['name']} => Lat: {lat}, Lng: {lng}")

with open('resolved_coords.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
