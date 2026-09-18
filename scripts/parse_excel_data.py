import zipfile
import xml.etree.ElementTree as ET
import re
import json
import math

def parse_excel():
    z = zipfile.ZipFile('Registro detallado de siembra (respuestas).xlsx')
    
    # 1. Leer string table
    strings_tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
    strings = []
    for elem in strings_tree.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t'):
        strings.append(elem.text if elem.text is not None else '')

    # 2. Leer relaciones para mapear hipervínculos
    rel_map = {}
    try:
        rels_content = z.read('xl/worksheets/_rels/sheet1.xml.rels')
        rels_tree = ET.fromstring(rels_content)
        for r in rels_tree.findall('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship'):
            rel_map[r.attrib['Id']] = r.attrib.get('Target', '')
    except Exception:
        pass

    # 3. Leer sheet1
    sheet_tree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

    cell_hyperlinks = {}
    hyperlinks_elem = sheet_tree.find('s:hyperlinks', ns)
    if hyperlinks_elem is not None:
        for h in hyperlinks_elem.findall('s:hyperlink', ns):
            ref = h.attrib.get('ref')
            r_id = h.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
            target = rel_map.get(r_id, '')
            if ref and target:
                cell_hyperlinks[ref] = target

    rows_dict_list = []
    for r_idx, row in enumerate(sheet_tree.findall('.//s:row', ns), 1):
        r_cells = {}
        for c in row.findall('s:c', ns):
            cell_ref = c.attrib.get('r', '')
            col_letter = re.sub(r'\d+', '', cell_ref)
            
            v = c.find('s:v', ns)
            val = v.text if v is not None else ''
            t = c.attrib.get('t')
            if t == 's' and val.isdigit() and int(val) < len(strings):
                val = strings[int(val)]
            
            link = cell_hyperlinks.get(cell_ref)
            if link:
                val = link

            r_cells[col_letter] = val
        rows_dict_list.append(r_cells)

    if not rows_dict_list:
        return []

    header_row = rows_dict_list[0]
    
    data = []
    coord_counts = {}

    for row_idx, r_cells in enumerate(rows_dict_list[1:], 2):
        row_dict = {}
        for col_let, header_title in header_row.items():
            if not header_title:
                continue
            val = r_cells.get(col_let, '')
            if header_title in row_dict:
                if not row_dict[header_title] and val:
                    row_dict[header_title] = val
            else:
                row_dict[header_title] = val
        
        o_link = cell_hyperlinks.get(f'O{row_idx}') or r_cells.get('O', '')
        if o_link and ('http' in o_link or 'drive.google' in o_link):
            row_dict['Foto del Árbol sembrado'] = o_link

        # Ignorar filas donde el nombre esté vacío
        name = (row_dict.get('Nombre Completo') or '').strip()
        if not name:
            continue

        # Extraer lat y lng
        coord_text = row_dict.get('Coordenadas de la siembra', '')
        lat, lng = extract_lat_lng(coord_text, row_dict.get('Ubicación de la Siembra', ''))
        
        # Desplazamiento micro-espacial para evitar que los pines se encimen exactamente en el mismo punto
        coord_key = f"{round(lat, 5)},{round(lng, 5)}"
        count = coord_counts.get(coord_key, 0)
        coord_counts[coord_key] = count + 1

        if count > 0:
            angle = count * (2 * math.pi / 6)
            radius = 0.00035 * count
            lat += radius * math.sin(angle)
            lng += radius * math.cos(angle)

        row_dict['_parsed_lat'] = round(lat, 6)
        row_dict['_parsed_lng'] = round(lng, 6)

        # Convertir links de Google Drive a direct URLs (lh3.googleusercontent.com/d/FILE_ID)
        photo_url = row_dict.get('Foto del Árbol sembrado', '')
        drive_match = re.search(r'id=([a-zA-Z0-9_-]+)', photo_url)
        if drive_match:
            file_id = drive_match.group(1)
            row_dict['Foto del Árbol sembrado'] = f"https://lh3.googleusercontent.com/d/{file_id}"
        elif 'drive.google.com/file/d/' in photo_url:
            file_id = photo_url.split('/file/d/')[1].split('/')[0]
            row_dict['Foto del Árbol sembrado'] = f"https://lh3.googleusercontent.com/d/{file_id}"

        data.append(row_dict)
    
    return data

def extract_lat_lng(text, alt_text=''):
    combined = f"{text} {alt_text}"
    m = re.search(r'(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)', combined)
    if m:
        return float(m.group(1)), float(m.group(2))
    
    m = re.search(r'll=(-?\d+\.\d+),(-?\d+\.\d+)', combined)
    if m:
        return float(m.group(1)), float(m.group(2))

    return 8.11, -80.97

if __name__ == '__main__':
    records = parse_excel()
    print(f"Total registros válidos leídos: {len(records)}")
    with open('parsed_historical_data.json', 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print("Guardado en parsed_historical_data.json con micro-desplazamiento espacial para pines duplicados.")
