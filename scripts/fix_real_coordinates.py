import json

# Coordenadas exactas que corresponden a la posición real de los poblados en el mapa de Panamá del usuario:
# 1. Bisvalles (Cañazas, Veraguas): ~8.225000, -81.365000
# 2. La Colorada / Los Hatillos (Santiago): ~8.016372, -80.984086
# 3. Río de Jesús: ~7.960288, -81.174184
# 4. San Francisco / La Honda / El Rosario: ~8.299948, -81.010664
# 5. El Espino de Santa Rosa: ~8.115386, -80.949904
# 6. Ocú (Herrera): ~7.946295, -80.776270
# 7. Canto del Llano / Nuevo Santiago: ~8.122180, -80.966103

EXACT_MAP_COORDINATES = {
    # 1. Domingo Vega Vega -> Ocú (Herrera)
    "1": {"lat": 7.946295, "lng": -80.776270},
    
    # 2. Fernando Camaño -> Canto del Llano (Santiago)
    "2": {"lat": 8.122180, "lng": -80.966103},
    
    # 3. Anthony Rodriguez -> Nuevo Santiago
    "3": {"lat": 8.080530, "lng": -80.976860},
    
    # 4. Kevin Concepción -> La Honda, San Francisco
    "4": {"lat": 8.299948, "lng": -81.010664},
    
    # 5. Fatima Escobar -> Río de Jesús (El Cuartillo)
    "5": {"lat": 7.960288, "lng": -81.174184},
    
    # 6. Corina Lara -> El Espino de Santa Rosa
    "6": {"lat": 8.115386, "lng": -80.949904},
    
    # 7, 8, 9. Angie Hidalgo -> La Colorada / Los Hatillos
    "7": {"lat": 8.016372, "lng": -80.984086},
    "8": {"lat": 8.016600, "lng": -80.984300},
    "9": {"lat": 8.016100, "lng": -80.983800},
    
    # 10. Lia Milena González -> San Francisco, Barriada El Rosario
    "10": {"lat": 8.299500, "lng": -81.010000},
    
    # 11, 12. Fernando Barría -> Bisvalles (Cañazas)
    "11": {"lat": 8.225000, "lng": -81.365000},
    "12": {"lat": 8.225300, "lng": -81.365300},
    
    # 13. John Jordán -> Distrito Río de Jesús
    "13": {"lat": 7.960500, "lng": -81.174500}
}

def update_parsed_data():
    with open('parsed_historical_data.json', 'r', encoding='utf-8') as f:
        records = json.load(f)

    for idx, item in enumerate(records, 1):
        key = str(idx)
        if key in EXACT_MAP_COORDINATES:
            item['_parsed_lat'] = EXACT_MAP_COORDINATES[key]['lat']
            item['_parsed_lng'] = EXACT_MAP_COORDINATES[key]['lng']

    with open('parsed_historical_data.json', 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print(f"Coordenadas mapeadas exactamente a los poblados del mapa en el dataset.")

if __name__ == '__main__':
    update_parsed_data()
