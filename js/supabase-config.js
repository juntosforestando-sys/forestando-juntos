// ============================================================================
// CONFIGURACIÓN PÚBLICA DEL CLIENTE WEB (FORESTANDO JUNTOS)
// NOTA DE SEGURIDAD / AUDITORÍA SOC:
// Este archivo contiene únicamente configuraciones y llaves públicas de cliente
// requeridas por el navegador (Frontend). 
// Las credenciales administrativas nunca se exponen aquí y son autenticadas
// directamente en el servidor mediante Supabase Auth y Row Level Security (RLS).
// ============================================================================

const SUPABASE_CONFIG = {
    url: "https://wxchapqelujpuwgbffkg.supabase.co",
    // anonKey: Llave pública anónima de Supabase para consultas de clientes web.
    // El acceso a los datos está estrictamente restringido en el servidor mediante RLS.
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4Y2hhcHFlbHVqcHV3Z2JmZmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NDMyNDgsImV4cCI6MjEwNTMxOTI0OH0.UKTqHvCFSiLs9H6U-7emsZHlVk2avfQ3Vei-A_kaIBE",
    useFallback: false,
    // Canales de contacto institucional para notificaciones
    notificationPhone: "",
    notificationEmail: "juntosforestando@gmail.com"
};

// Configuración de EmailJS para confirmaciones automáticas al sembrador
// publicKey: Llave pública del cliente requerida para el envío de plantillas transaccionales.
const EMAILJS_CONFIG = {
    serviceId: "service_50omyml",
    templateId: "template_oc65kek",
    publicKey: "i5KgjZeHss1pwy6k6"
};

// Dataset sintético de respaldo (SOC H10: Sin datos personales ni correos reales)
const DEMO_TREES = [
    {
        "id": "demo-1",
        "code": "ARB-2024-000001",
        "planter_name": "Sembrador Comunitario",
        "public_name": "Sembrador Comunitario",
        "email": null,
        "species_name": "Guayacán morado",
        "species_scientific_name": "Handroanthus impetiginosus",
        "planting_date": "2024-09-15",
        "latitude": 7.946295,
        "longitude": -80.77627,
        "province": "Herrera",
        "location_description": "Ocú, Peñas Chatas, Paso Laja",
        "privacy_level": "exact",
        "status": "approved",
        "notes": "Árbol nativo de América tropical conocido por sus vistosas flores moradas.",
        "primary_photo_url": "https://lh3.googleusercontent.com/d/1PBT6sagBs-OD8zHkv-dGMIHL0YUFIrcp"
    },
    {
        "id": "demo-2",
        "code": "ARB-2024-000002",
        "planter_name": "Sembrador Voluntario",
        "public_name": "Sembrador Voluntario",
        "email": null,
        "species_name": "Guayacán",
        "species_scientific_name": "Guaiacum officinale",
        "planting_date": "2024-09-15",
        "latitude": 8.12218,
        "longitude": -80.966103,
        "province": "Veraguas",
        "location_description": "Barriada la Esmeralda, Canto del Llano",
        "privacy_level": "exact",
        "status": "approved",
        "notes": "Plantón en desarrollo saludable.",
        "primary_photo_url": "https://lh3.googleusercontent.com/d/1VqyPSh1QuvN53CoUZVG_PwlpWd_8tkeg"
    },
    {
        "id": "demo-3",
        "code": "ARB-2024-000003",
        "planter_name": "Sembrador Comunitario",
        "public_name": "Sembrador Comunitario",
        "email": null,
        "species_name": "Guayacán Morado",
        "species_scientific_name": "Handroanthus impetiginosus",
        "planting_date": "2024-09-15",
        "latitude": 8.08053,
        "longitude": -80.97686,
        "province": "Veraguas",
        "location_description": "Veraguas, Nuevo Santiago, San Antonio.",
        "privacy_level": "exact",
        "status": "approved",
        "notes": "Arbusto nativo en crecimiento de copa densa.",
        "primary_photo_url": "https://lh3.googleusercontent.com/d/127loAtCKA4gZ7f0Tq6mBqZjwQpJnu3q5"
    },
    {
        "id": "demo-4",
        "code": "ARB-2024-000004",
        "planter_name": "Sembrador Voluntario",
        "public_name": "Sembrador Voluntario",
        "email": null,
        "species_name": "Guayacán",
        "species_scientific_name": "Tabebuia rosea",
        "planting_date": "2024-09-15",
        "latitude": 8.299948,
        "longitude": -81.010664,
        "province": "Veraguas",
        "location_description": "La Honda, San Juan, San Francisco, Veraguas",
        "privacy_level": "exact",
        "status": "approved",
        "notes": "Guayacán rosado en óptimas condiciones de siembra.",
        "primary_photo_url": "https://lh3.googleusercontent.com/d/1jDQt1GUHKcL2GTBtuJ35Ke7_pYHCb4yX"
    },
    {
        "id": "demo-5",
        "code": "ARB-2024-000005",
        "planter_name": "Sembrador Comunitario",
        "public_name": "Sembrador Comunitario",
        "email": null,
        "species_name": "Guayacán morado",
        "species_scientific_name": "Guaiacum coulteri",
        "planting_date": "2024-09-15",
        "latitude": 7.960288,
        "longitude": -81.174184,
        "province": "Veraguas",
        "location_description": "Río de Jesús, El Cuartillo",
        "privacy_level": "exact",
        "status": "approved",
        "notes": "Árbol tropical con excelente arraigo radicular.",
        "primary_photo_url": "https://lh3.googleusercontent.com/d/1sxNKjTj9d-19iEbj3ZwtDA2ZW9Sgs5gc"
    }
];

const DEMO_SPECIES = [
    {
        "id": "sp-1",
        "common_name": "Guayacán morado",
        "scientific_name": "Handroanthus impetiginosus"
    },
    {
        "id": "sp-2",
        "common_name": "Guayacán",
        "scientific_name": "Guaiacum officinale"
    },
    {
        "id": "sp-3",
        "common_name": "Roble Sabana",
        "scientific_name": "Tabebuia rosea"
    },
    {
        "id": "sp-4",
        "common_name": "Caoba Nacional",
        "scientific_name": "Swietenia macrophylla"
    },
    {
        "id": "sp-5",
        "common_name": "Cedro Amargo",
        "scientific_name": "Cedrela odorata"
    }
];
