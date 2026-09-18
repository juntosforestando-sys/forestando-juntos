import urllib.request
import urllib.parse
import json

queries = [
    'Cañazas, Veraguas, Panama',
    'Visvalles, Panama',
    'Rio de Jesus, Veraguas, Panama',
    'Ocu, Herrera, Panama',
    'San Francisco, Veraguas, Panama',
    'Santiago, Veraguas, Panama',
    'Canto del Llano, Santiago, Veraguas, Panama',
    'Santa Rosa, Santiago, Veraguas, Panama',
    'La Colorada, Santiago, Veraguas, Panama'
]

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

for q in queries:
    url = f"https://nominatim.openstreetmap.org/search?format=json&q={urllib.parse.quote(q)}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data:
                print(f"{q} -> lat: {data[0]['lat']}, lon: {data[0]['lon']}")
            else:
                print(f"{q} -> No encontrado")
    except Exception as e:
        print(f"{q} -> Error: {e}")
