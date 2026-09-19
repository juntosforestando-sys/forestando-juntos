import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, HRFlowable, KeepTogether
from reportlab.lib.units import inch

def build_pdf():
    pdf_filename = "Manual_del_Sembrador_Forestando_Juntos.pdf"
    workspace_pdf_path = os.path.join(r"c:\Users\Infoplazas\Documents\Proyecto Forestando Juntos", pdf_filename)
    artifacts_pdf_path = os.path.join(r"C:\Users\Infoplazas\.gemini\antigravity\brain\928bd06f-8430-4e69-a62f-8fb5b69bffea", pdf_filename)

    doc = SimpleDocTemplate(
        workspace_pdf_path,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=35,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    
    # Custom Color Palette
    PRIMARY = colors.HexColor("#065f46")   # Emerald 800
    SECONDARY = colors.HexColor("#047857") # Emerald 700
    ACCENT = colors.HexColor("#d1fae5")    # Emerald 100
    DARK_TEXT = colors.HexColor("#1e293b") # Slate 800
    GRAY_TEXT = colors.HexColor("#64748b") # Slate 500
    BORDER_COLOR = colors.HexColor("#cbd5e1") # Slate 300

    # Custom Styles
    styles.add(ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=PRIMARY,
        alignment=0,
        spaceAfter=4
    ))

    styles.add(ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=SECONDARY,
        spaceAfter=8
    ))

    styles.add(ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=PRIMARY,
        spaceBefore=12,
        spaceAfter=6
    ))

    styles.add(ParagraphStyle(
        'StepTitle',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=DARK_TEXT,
        spaceBefore=8,
        spaceAfter=4
    ))

    styles.add(ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=DARK_TEXT,
        spaceAfter=4
    ))

    styles.add(ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13,
        textColor=PRIMARY,
        spaceAfter=2
    ))

    styles.add(ParagraphStyle(
        'FooterText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=GRAY_TEXT,
        alignment=1
    ))

    story = []

    # --- ENCABEZADO FORMAL CON LOGO ---
    logo_path = r"c:\Users\Infoplazas\Documents\Proyecto Forestando Juntos\img\logo.jpg"
    logo_img = Image(logo_path, width=1.1*inch, height=1.1*inch)
    
    header_text_html = """
    <font color="#065f46" size="14"><b>FORESTANDO JUNTOS — PANAMÁ 🇵🇦</b></font><br/>
    <font color="#64748b" size="9"><i>"De mano en mano, reforestando Panamá"</i></font><br/>
    <font color="#334155" size="8"><b>Plataforma Digital de Registro, Mapeo y Monitoreo Ambiental</b></font><br/>
    <font color="#047857" size="8">Enlace Oficial: <a href="https://forestando-juntos.netlify.app"><u>https://forestando-juntos.netlify.app</u></a></font>
    """
    header_para = Paragraph(header_text_html, styles['Normal'])

    header_table = Table([[logo_img, header_para]], colWidths=[1.3*inch, 5.7*inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,0), (0,0), 'LEFT'),
        ('LEFTPADDING', (1,0), (1,0), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY, spaceBefore=4, spaceAfter=12))

    # --- TÍTULO PRINCIPAL DEL MANUAL ---
    story.append(Paragraph("MANUAL OFICIAL DEL SEMBRADOR", styles['DocTitle']))
    story.append(Paragraph("GUÍA PASO A PASO PARA EL REGISTRO Y GEOLOCALIZACIÓN DE ÁRBOLES", styles['DocSubTitle']))
    
    # --- RECOMENDACIONES PREVIAS (BOXED CALLOUT) ---
    callout_html = """
    <b>📌 Recomendaciones Importantes Antes de Iniciar:</b><br/>
    • <b>GPS Activo:</b> Verifique que la función de ubicación (GPS) de su celular esté encendida.<br/>
    • <b>Fotografía en el Sitio:</b> Tome la foto del plantón o árbol directamente durante la jornada de siembra.<br/>
    • <b>Soporte Offline (Sin Cobertura):</b> Si no cuenta con señal de internet en el campo, el sistema guardará su registro de forma segura en el teléfono y lo enviará automáticamente al servidor al retornar a un área con cobertura.
    """
    callout_table = Table([[Paragraph(callout_html, styles['CalloutText'])]], colWidths=[7.0*inch])
    callout_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), ACCENT),
        ('BOX', (0,0), (-1,-1), 1, SECONDARY),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(callout_table)
    story.append(Spacer(1, 10))

    # --- PASOS DEL PROCEDIMIENTO ---
    story.append(Paragraph("PROCEDIMIENTO PASO A PASO", styles['SectionHeader']))

    steps = [
        ("PASO 1: Ingreso a la Plataforma Web", [
            "• Abra el navegador de su teléfono o computadora e ingrese al enlace oficial: <a href='https://forestando-juntos.netlify.app'><b><u>https://forestando-juntos.netlify.app</u></b></a>",
            "• En la barra superior o menú principal, haga clic en el botón verde <b>+ Registrar Árbol</b>."
        ]),
        ("PASO 2: Identificación del Sembrador", [
            "• <b>Nombre Completo:</b> Ingrese su nombre y apellido (o el nombre de la institución / grupo organizador).",
            "• <b>Nombre Público:</b> Corresponde al nombre que se mostrará públicamente en la ficha del árbol en el mapa.",
            "• <b>Contacto (Correo y WhatsApp):</b> Escriba su correo electrónico y número de WhatsApp (ej. <i>6500-1234</i>) para recibir la confirmación oficial."
        ]),
        ("PASO 3: Datos de la Especie y la Siembra", [
            "• <b>Especie de Árbol:</b> Seleccione el nombre de la especie sembrada (ej. <i>Guayacán Morado, Roble, Caoba, Guayacán Amarillo</i>).",
            "• <i>En caso de no estar en la lista:</i> Elija la opción <b>'Otro / No listado'</b> y escriba el nombre común.",
            "• <b>Fecha y Entorno:</b> Indique la fecha exacta de siembra y el tipo de terreno (finca privada, parque, ribera de río, etc.)."
        ]),
        ("PASO 4: Captura de Ubicación GPS Exacta (Paso Crítico)", [
            "• Presione el botón azul <b>📍 Usar mi ubicación actual (GPS)</b> y seleccione <b>Permitir</b> cuando el celular solicite acceso a la posición.",
            "• <b>Verificación en el Mapa:</b> Verifique que el marcador verde quede posicionado sobre el terreno de la siembra.",
            "• <i>Ajuste Manual:</i> Si requiere corregir la posición, puede arrastrar el mapa o tocar con su dedo la ubicación exacta.",
            "• Indique la <b>Provincia</b> y una breve descripción o referencia del lugar (ej. <i>Canto del Llano, corregimiento Carlos Santana</i>)."
        ]),
        ("PASO 5: Carga de Fotografía del Plantón", [
            "• Presione <b>Subir Foto del Árbol</b> y seleccione <b>Cámara</b> para capturar la imagen en tiempo real.",
            "• Asegúrese de que el plantón se observe con claridad en el centro de la fotografía."
        ]),
        ("PASO 6: Envío y Comprobante Digital por WhatsApp", [
            "• Haga clic en el botón verde <b>🚀 Enviar Registro de Siembra</b>.",
            "• Se desplegará una pantalla de confirmación con su <b>Código Único de Registro</b> (ejemplo: <b>ARB-2026-000015</b>).",
            "• Haga clic en el botón <b>💬 Recibir Confirmación en WhatsApp</b> para guardar su comprobante personalizado."
        ])
    ]

    for step_title, bullet_list in steps:
        step_elements = []
        step_elements.append(Paragraph(f"<b>{step_title}</b>", styles['StepTitle']))
        for bullet in bullet_list:
            step_elements.append(Paragraph(bullet, styles['CustomBody']))
        step_elements.append(Spacer(1, 4))
        story.append(KeepTogether(step_elements))

    story.append(Spacer(1, 6))

    # --- SECCIÓN DE PREGUNTAS FRECUENTES ---
    story.append(Paragraph("PREGUNTAS FRECUENTES Y SOPORTE", styles['SectionHeader']))

    faq_html = """
    <b>¿Cuándo aparecerá el árbol en el mapa público?</b><br/>
    Cada registro ingresa a un proceso de revisión y validación por el administrador. Una vez aprobado, aparecerá inmediatamente visible en el mapa interactivo para todo el público.<br/><br/>
    <b>¿Cómo funciona el registro sin señal de internet?</b><br/>
    El chip GPS de su teléfono funciona vía satélite sin requerir datos móviles. Complete el formulario con normalidad; los datos y fotos se guardarán localmente en su celular y se enviarán automáticamente a la nube en cuanto recupere la conexión a internet.
    """
    faq_para = Paragraph(faq_html, styles['CustomBody'])
    faq_table = Table([[faq_para]], colWidths=[7.0*inch])
    faq_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(faq_table)

    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER_COLOR, spaceBefore=4, spaceAfter=8))

    # --- PIE DE PÁGINA FORMAL ---
    footer_html = """
    <b>Plataforma Digital Forestando Juntos — Panamá</b><br/>
    Desarrollado por <b>Nando Compusystem © 2026</b> • Todos los derechos reservados<br/>
    Enlace Web: <a href="https://forestando-juntos.netlify.app"><u>https://forestando-juntos.netlify.app</u></a> | Contacto: <u>juntosforestando@gmail.com</u>
    """
    story.append(Paragraph(footer_html, styles['FooterText']))

    # Build Document
    doc.build(story)
    
    # Duplicate to Artifacts Directory
    import shutil
    shutil.copy(workspace_pdf_path, artifacts_pdf_path)
    
    print(f"PDF generado exitosamente en: {workspace_pdf_path}")
    print(f"Copia guardada en artefactos: {artifacts_pdf_path}")

if __name__ == '__main__':
    build_pdf()
