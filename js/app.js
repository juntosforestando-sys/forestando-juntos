// Lógica principal de la aplicación Forestando Juntos

let state = {
    trees: [],
    speciesList: [],
    selectedSpeciesFilter: 'all',
    selectedProvinceFilter: 'all',
    currentView: 'home',
    map: null,
    formMap: null,
    activeMarkers: [],
    currentFormCoords: { lat: 8.11, lng: -80.97 },
    userMarker: null,
    isAdminLoggedIn: false,
    selectedPhotos: []
};

// Inicialización de la App
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    await loadInitialData();
    setupEventListeners();
    handleHashRouting();
    updateStatsCounter();
    
    // Registrar Service Worker para soporte offline en campo
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('Service Worker de Forestando Juntos activo (Modo Offline)'))
            .catch(err => console.warn('Error registrando Service Worker:', err));
    }

    // Escuchar cuando el dispositivo vuelva a tener señal
    window.addEventListener('online', () => {
        showToast('📶 Conexión a internet restablecida. Sincronizando registros capturados...');
        syncOfflineTrees();
    });

    // Intentar sincronizar si hay pendientes acumulados
    if (navigator.onLine) {
        syncOfflineTrees();
    }

    // Activar Keep-Alive para prevenir pausas de Supabase Cloud
    setupSupabaseKeepAlive();
    setInterval(setupSupabaseKeepAlive, 5 * 60 * 1000);
}

// Mantenedor de actividad para Supabase Cloud
function setupSupabaseKeepAlive() {
    const sb = getSupabaseClient();
    if (sb && navigator.onLine) {
        sb.from('public_trees').select('id').limit(1).then(() => {
            console.log('[Keep-Alive] Supabase Cloud activo y respondiendo.');
        }).catch(err => console.warn('[Keep-Alive] Error en ping:', err));
    }
}

let supabaseClient = null;

function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    if (typeof window.supabase !== 'undefined' && typeof SUPABASE_CONFIG !== 'undefined') {
        if (!SUPABASE_CONFIG.useFallback && SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey && !SUPABASE_CONFIG.url.includes('your-supabase-project')) {
            try {
                supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            } catch (e) {
                console.warn('Error al inicializar cliente Supabase:', e);
            }
        }
    }
    return supabaseClient;
}

async function loadInitialData() {
    const sb = getSupabaseClient();
    if (sb) {
        try {
            const { data: treesData, error: treesErr } = await sb.from('public_trees').select('*');
            if (!treesErr && treesData && treesData.length > 0) {
                state.trees = treesData.map(t => ({
                    ...t,
                    status: t.status || 'approved',
                    species_name: t.display_species || t.species_name || 'Guayacán Morado'
                }));
                saveTreesToStorage();
            } else {
                fallbackLocalData();
            }

            const { data: specData, error: specErr } = await sb.from('species').select('*').eq('is_active', true);
            if (!specErr && specData && specData.length > 0) {
                state.speciesList = specData;
                saveSpeciesToStorage();
            } else {
                fallbackLocalSpecies();
            }
        } catch (err) {
            console.warn('Conectando a dataset local fallback:', err);
            fallbackLocalData();
            fallbackLocalSpecies();
        }
    } else {
        fallbackLocalData();
        fallbackLocalSpecies();
    }

    populateSpeciesDropdown();
    populateFilterDropdowns();
    updateStatsCounter();
}

function fallbackLocalData() {
    const savedTrees = localStorage.getItem('fj_trees');
    if (savedTrees) {
        const parsed = JSON.parse(savedTrees);
        if (parsed.length < DEMO_TREES.length) {
            state.trees = [...DEMO_TREES];
            saveTreesToStorage();
        } else {
            state.trees = parsed;
        }
    } else {
        state.trees = [...DEMO_TREES];
        saveTreesToStorage();
    }
}

function fallbackLocalSpecies() {
    const savedSpecies = localStorage.getItem('fj_species');
    if (savedSpecies) {
        state.speciesList = JSON.parse(savedSpecies);
    } else {
        state.speciesList = [...DEMO_SPECIES];
        saveSpeciesToStorage();
    }
}

function saveTreesToStorage() {
    localStorage.setItem('fj_trees', JSON.stringify(state.trees));
}

function saveSpeciesToStorage() {
    localStorage.setItem('fj_species', JSON.stringify(state.speciesList));
}

// Control del Enrutador (Vistas)
function showView(viewId, params = {}) {
    state.currentView = viewId;
    window.location.hash = viewId + (params.code ? `?code=${params.code}` : '');
    
    document.querySelectorAll('.app-view').forEach(view => {
        view.classList.add('hidden');
    });

    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) {
        targetView.classList.remove('hidden');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Acciones específicas al entrar a cada vista
    if (viewId === 'mapa') {
        setTimeout(() => initPublicMap(), 150);
    } else if (viewId === 'registrar') {
        setTimeout(() => {
            initFormMap();
            const dateInput = document.getElementById('input-date');
            if (dateInput && !dateInput.value) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
            const latInput = document.getElementById('input-lat');
            const lngInput = document.getElementById('input-lng');
            if (latInput && !latInput.value) latInput.value = state.currentFormCoords.lat.toFixed(6);
            if (lngInput && !lngInput.value) lngInput.value = state.currentFormCoords.lng.toFixed(6);
        }, 150);
    } else if (viewId === 'arbol' && params.code) {
        renderTreeProfile(params.code);
    } else if (viewId === 'admin') {
        renderAdminDashboard();
    }
}

function handleHashRouting() {
    const hash = window.location.hash.replace('#', '');
    if (!hash) {
        showView('home');
        return;
    }

    const [view, queryString] = hash.split('?');
    const params = {};
    if (queryString) {
        const urlParams = new URLSearchParams(queryString);
        for (const [key, value] of urlParams) {
            params[key] = value;
        }
    }

    showView(view || 'home', params);
}

// Rellenar selects de especies
function populateSpeciesDropdown() {
    const select = document.getElementById('species-select');
    if (!select) return;
    select.innerHTML = '<option value="">Selecciona una especie...</option>';
    
    state.speciesList.forEach(sp => {
        const opt = document.createElement('option');
        opt.value = sp.common_name;
        opt.textContent = `${sp.common_name} (${sp.scientific_name || 'N/A'})`;
        select.appendChild(opt);
    });

    const otherOpt = document.createElement('option');
    otherOpt.value = 'otro';
    otherOpt.textContent = '+ Otra especie no listada';
    select.appendChild(otherOpt);
}

function populateFilterDropdowns() {
    const speciesFilter = document.getElementById('filter-species');
    if (!speciesFilter) return;

    speciesFilter.innerHTML = '<option value="all">Todas las Especies</option>';
    const speciesNames = [...new Set(state.trees.map(t => t.species_name))].filter(Boolean);
    speciesNames.forEach(sp => {
        const opt = document.createElement('option');
        opt.value = sp;
        opt.textContent = sp;
        speciesFilter.appendChild(opt);
    });

    const provinceFilter = document.getElementById('filter-province');
    if (!provinceFilter) return;
    provinceFilter.innerHTML = '<option value="all">Todas las Provincias</option>';
    const provinces = [...new Set(state.trees.map(t => t.province))].filter(Boolean);
    provinces.forEach(pr => {
        const opt = document.createElement('option');
        opt.value = pr;
        opt.textContent = pr;
        provinceFilter.appendChild(opt);
    });
}

// Actualizar Contador Estadístico de la Landing Page
function updateStatsCounter() {
    // Registros históricos válidos (aprobados y dados de baja) para no perder la estadística de siembras realizadas
    const historicalTrees = state.trees.filter(t => t.status === 'approved' || t.status === 'dead' || t.status === 'baja' || !t.status);
    const totalCount = historicalTrees.length;
    const speciesCount = new Set(historicalTrees.map(t => t.species_name)).size;
    const provincesCount = new Set(historicalTrees.map(t => t.province)).size;

    const elTotal = document.getElementById('stat-total-trees');
    const elSpecies = document.getElementById('stat-species-count');
    const elProvinces = document.getElementById('stat-provinces-count');

    if (elTotal) elTotal.textContent = totalCount;
    if (elSpecies) elSpecies.textContent = speciesCount;
    if (elProvinces) elProvinces.textContent = provincesCount;
}

// Geolocalización GPS para el Formulario
function requestGPSLocation() {
    const btn = document.getElementById('btn-gps');
    const statusText = document.getElementById('gps-status');
    
    if (!navigator.geolocation) {
        alert('Tu navegador no soporta geolocalización GPS.');
        return;
    }

    if (btn) btn.classList.add('gps-button-active');
    if (statusText) statusText.textContent = 'Obteniendo coordenadas GPS...';

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const accuracy = pos.coords.accuracy;

            state.currentFormCoords = { lat, lng };

            document.getElementById('input-lat').value = lat.toFixed(6);
            document.getElementById('input-lng').value = lng.toFixed(6);
            document.getElementById('input-accuracy').value = accuracy ? Math.round(accuracy) : '';

            if (statusText) {
                statusText.textContent = `📍 Ubicación detectada con precisión de ~${Math.round(accuracy || 10)}m`;
                statusText.classList.remove('text-gray-500');
                statusText.classList.add('text-emerald-700', 'font-medium');
            }

            if (btn) btn.classList.remove('gps-button-active');

            if (state.formMap) {
                state.formMap.setView([lat, lng], 16);
                if (state.userMarker) {
                    state.userMarker.setLatLng([lat, lng]);
                } else {
                    state.userMarker = L.marker([lat, lng], { draggable: true }).addTo(state.formMap);
                }
            }
        },
        (err) => {
            if (btn) btn.classList.remove('gps-button-active');
            if (statusText) {
                statusText.textContent = 'No se pudo obtener el GPS. Puedes arrastrar el marcador en el mapa.';
                statusText.classList.add('text-amber-600');
            }
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

// Inicializar Mini Mapa del Formulario
function initFormMap() {
    const container = document.getElementById('form-map');
    if (!container || state.formMap) return;

    const latInput = document.getElementById('input-lat');
    const lngInput = document.getElementById('input-lng');
    if (latInput && !latInput.value) latInput.value = state.currentFormCoords.lat.toFixed(6);
    if (lngInput && !lngInput.value) lngInput.value = state.currentFormCoords.lng.toFixed(6);

    state.formMap = L.map('form-map').setView([state.currentFormCoords.lat, state.currentFormCoords.lng], 13);

    // Servidor Google Maps Callejero
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Maps &mdash; Forestando Juntos',
        maxZoom: 20
    }).addTo(state.formMap);

    state.userMarker = L.marker([state.currentFormCoords.lat, state.currentFormCoords.lng], { draggable: true }).addTo(state.formMap);

    state.userMarker.on('dragend', function (e) {
        const coord = e.target.getLatLng();
        if (latInput) latInput.value = coord.lat.toFixed(6);
        if (lngInput) lngInput.value = coord.lng.toFixed(6);
        state.currentFormCoords = { lat: coord.lat, lng: coord.lng };
    });
}

// Inicializar Mapa Público Principal
function initPublicMap() {
    const container = document.getElementById('map-container');
    if (!container) return;

    if (state.map) {
        state.map.invalidateSize();
        renderMapMarkers();
        return;
    }

    state.map = L.map('map-container').setView([8.11, -80.97], 9);

    // Google Maps Callejero y Satelital / Híbrido
    const googleRoadmap = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Maps &mdash; Forestando Juntos',
        maxZoom: 20
    });

    const googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Maps &mdash; Forestando Juntos',
        maxZoom: 20
    });

    googleRoadmap.addTo(state.map);

    L.control.layers({
        "🗺️ Google Maps (Callejero)": googleRoadmap,
        "🛰️ Google Maps (Satelital)": googleHybrid
    }).addTo(state.map);

    renderMapMarkers();
}

function renderMapMarkers() {
    if (!state.map) return;

    // Limpiar marcadores existentes anteriores
    if (state.activeMarkers && state.activeMarkers.length > 0) {
        state.activeMarkers.forEach(m => state.map.removeLayer(m));
        state.activeMarkers = [];
    }

    // Mostrar árboles aprobados (verdes) y árboles dados de baja (rojos)
    const visibleTrees = state.trees.filter(t => t.status === 'approved' || t.status === 'dead' || t.status === 'baja');
    
    const filteredTrees = visibleTrees.filter(t => {
        const matchesSpecies = state.selectedSpeciesFilter === 'all' || t.species_name === state.selectedSpeciesFilter;
        const matchesProvince = state.selectedProvinceFilter === 'all' || t.province === state.selectedProvinceFilter;
        return matchesSpecies && matchesProvince;
    });

    const greenTreeIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const redTreeIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const bounds = [];

    filteredTrees.forEach(t => {
        const isDead = t.status === 'dead' || t.status === 'baja';
        const markerIcon = isDead ? redTreeIcon : greenTreeIcon;
        const badgeHtml = isDead 
            ? `<span class="inline-block text-xs font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded mb-1">${t.code} • Dado de Baja 🥀</span>`
            : `<span class="inline-block text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded mb-1">${t.code}</span>`;

        const popupHtml = `
            <div class="p-3 text-left">
                <img src="${t.primary_photo_url || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=400&q=80'}" class="w-full h-32 object-cover rounded-lg mb-2">
                ${badgeHtml}
                ${state.isAdminLoggedIn ? '<span class="inline-block text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded mb-1 ml-1">🔓 Arrastra para mover</span>' : ''}
                <h4 class="font-bold text-gray-900 text-sm leading-tight">${t.species_name}</h4>
                <p class="text-xs text-gray-500 mb-1">Sembrado por: <strong>${t.public_name}</strong></p>
                <p class="text-xs text-gray-400 mb-2">📍 ${t.location_description || t.province}</p>
                <button onclick="showView('arbol', {code: '${t.code}'})" class="w-full text-center py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-md transition-colors">
                    Ver Ficha del Árbol 🌳
                </button>
            </div>
        `;

        const isDraggable = !!state.isAdminLoggedIn;
        const marker = L.marker([t.latitude, t.longitude], { 
            icon: markerIcon, 
            draggable: isDraggable 
        }).bindPopup(popupHtml);

        if (isDraggable) {
            marker.on('dragend', async function (e) {
                const newCoord = e.target.getLatLng();
                t.latitude = parseFloat(newCoord.lat.toFixed(6));
                t.longitude = parseFloat(newCoord.lng.toFixed(6));

                saveTreesToStorage();

                const sb = getSupabaseClient();
                if (sb) {
                    try {
                        await sb.from('trees').update({
                            latitude: t.latitude,
                            longitude: t.longitude
                        }).eq('code', t.code);
                    } catch (err) {
                        console.warn('Error al actualizar coordenadas en Supabase:', err);
                    }
                }

                showToast(`📍 Ubicación de ${t.code} (${t.species_name}) actualizada a ${t.latitude}, ${t.longitude}`);
            });
        }

        marker.addTo(state.map);
        state.activeMarkers.push(marker);
        bounds.push([t.latitude, t.longitude]);
    });

    if (bounds.length > 0) {
        state.map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 15 });
    }

    const counterEl = document.getElementById('map-filtered-count');
    if (counterEl) {
        counterEl.textContent = `${filteredTrees.length} árboles mostrados`;
    }
}

function showToast(message) {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.className = 'fixed bottom-5 right-5 z-[9999] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl font-medium text-sm transition-all duration-300 transform translate-y-10 opacity-0';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.remove('translate-y-10', 'opacity-0');
    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
    }, 4000);
}

// Manejo de Fotos (Cámara / Galería)
function handlePhotoUpload(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    const container = document.getElementById('photo-preview-container');

    files.slice(0, 3).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imgUrl = e.target.result;
            state.selectedPhotos.push(imgUrl);
            
            const div = document.createElement('div');
            div.className = 'relative group';
            div.innerHTML = `
                <img src="${imgUrl}" class="w-20 h-20 object-cover rounded-xl border-2 border-emerald-500 shadow-md">
                <button type="button" onclick="this.parentElement.remove()" class="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow">✕</button>
            `;
            container.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

// Envío del Formulario de Registro
let lastSubmittedTree = null;

async function handleFormSubmit(e) {
    e.preventDefault();

    const planterName = document.getElementById('input-planter-name').value.trim();
    const publicName = document.getElementById('input-public-name').value.trim() || planterName;
    const email = document.getElementById('input-email') ? document.getElementById('input-email').value.trim() : '';
    const phone = document.getElementById('input-phone') ? document.getElementById('input-phone').value.trim() : '';
    const environment = document.getElementById('input-environment') ? document.getElementById('input-environment').value : 'Finca / Terreno Privado';
    const speciesSelect = document.getElementById('species-select').value;
    const customSpecies = document.getElementById('input-custom-species').value.trim();
    const plantingDate = document.getElementById('input-date').value || new Date().toISOString().split('T')[0];
    const province = document.getElementById('input-province').value;
    const locationDesc = document.getElementById('input-location-desc').value.trim();
    const notes = document.getElementById('input-notes').value.trim();

    const lat = parseFloat(document.getElementById('input-lat').value) || state.currentFormCoords.lat;
    const lng = parseFloat(document.getElementById('input-lng').value) || state.currentFormCoords.lng;

    const speciesName = speciesSelect === 'otro' ? customSpecies : speciesSelect;

    // Generar código único ARB-YYYY-XXXXXX
    const currentYear = new Date().getFullYear();
    const seq = state.trees.length + 1;
    const treeCode = `ARB-${currentYear}-${String(seq).padStart(6, '0')}`;

    const newTree = {
        id: 'tree-' + Date.now(),
        code: treeCode,
        planter_name: planterName,
        public_name: publicName,
        email: email,
        phone: phone,
        environment: environment,
        species_name: speciesName,
        planting_date: plantingDate,
        latitude: lat,
        longitude: lng,
        province: province,
        location_description: locationDesc,
        privacy_level: 'exact',
        status: 'pending', // Siempre queda pendiente por defecto
        synced: false, // Flag de sincronización offline
        notes: notes,
        primary_photo_url: state.selectedPhotos[0] || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
        created_at: new Date().toISOString()
    };

    lastSubmittedTree = newTree;
    state.trees.unshift(newTree);
    saveTreesToStorage();
    updateStatsCounter();
    populateFilterDropdowns();

    // Enviar a la nube de Supabase si está activo
    const sb = getSupabaseClient();
    if (sb && navigator.onLine) {
        sb.from('trees').insert({
            planter_name: planterName,
            public_name: publicName,
            email: email,
            phone: phone,
            custom_species_name: speciesName,
            planting_date: plantingDate,
            latitude: lat,
            longitude: lng,
            province: province,
            location_description: locationDesc,
            privacy_level: 'exact',
            status: 'pending',
            notes: notes
        }).select().then(({ data: dbTree, error }) => {
            if (!error && dbTree && dbTree[0]) {
                newTree.synced = true;
                saveTreesToStorage();
                if (state.selectedPhotos[0]) {
                    sb.from('tree_photos').insert({
                        tree_id: dbTree[0].id,
                        url: state.selectedPhotos[0],
                        is_primary: true
                    }).then(() => console.log('Foto guardada en Supabase Cloud.'));
                }
            }
        }).catch(err => console.warn('Guardado offline en dispositivo. Se sincronizará al conectar a internet:', err));
    } else {
        showToast('📍 Registro guardado localmente en tu teléfono. Se enviará cuando tengas internet.');
    }

    // Disparar notificación automática por correo electrónico al administrador
    sendAdminEmailNotification(newTree);

    // Mostrar modal de éxito con el ID del árbol
    const modalCode = document.getElementById('success-tree-code');
    if (modalCode) modalCode.textContent = treeCode;
    
    const modal = document.getElementById('modal-success');
    if (modal) modal.classList.remove('hidden');

    document.getElementById('form-registro').reset();
    state.selectedPhotos = [];
    document.getElementById('photo-preview-container').innerHTML = '';
}

// Sincronización automática de registros capturados sin internet
async function syncOfflineTrees() {
    if (!navigator.onLine) return;
    const sb = getSupabaseClient();
    if (!sb) return;

    const unsynced = state.trees.filter(t => t.synced === false);
    if (!unsynced.length) return;

    console.log(`[Offline Sync] Sincronizando ${unsynced.length} registros capturados sin internet...`);
    let count = 0;

    for (const tree of unsynced) {
        try {
            const { data: dbTree, error } = await sb.from('trees').insert({
                planter_name: tree.planter_name,
                public_name: tree.public_name,
                email: tree.email,
                phone: tree.phone,
                custom_species_name: tree.species_name,
                planting_date: tree.planting_date,
                latitude: tree.latitude,
                longitude: tree.longitude,
                province: tree.province,
                location_description: tree.location_description,
                privacy_level: 'exact',
                status: tree.status || 'pending',
                notes: tree.notes
            }).select();

            if (!error && dbTree && dbTree[0]) {
                tree.synced = true;
                count++;
                if (tree.primary_photo_url && tree.primary_photo_url.startsWith('data:')) {
                    await sb.from('tree_photos').insert({
                        tree_id: dbTree[0].id,
                        url: tree.primary_photo_url,
                        is_primary: true
                    });
                }
            }
        } catch (e) {
            console.warn('Error en la sincronización offline:', e);
        }
    }
    
    if (count > 0) {
        saveTreesToStorage();
        showToast(`📶 ¡Se enviaron automáticamente ${count} árbol(es) registrados sin internet!`);
    }
}

function sendWhatsAppConfirmation() {
    if (!lastSubmittedTree) return;

    const cleanPhone = (lastSubmittedTree.phone || '').replace(/\D/g, '');
    const message = encodeURIComponent(
        `🌱 *¡Hola ${lastSubmittedTree.planter_name}!*\n\n` +
        `¡Felicidades y muchas gracias por sembrar vida y futuro en Panamá! 🇵🇦🌳\n\n` +
        `Queremos confirmarte que tu siembra ha sido registrada exitosamente en la plataforma *Forestando Juntos*:\n\n` +
        `📋 *Código Único:* ${lastSubmittedTree.code}\n` +
        `🌳 *Especie:* ${lastSubmittedTree.species_name}\n` +
        `📍 *Provincia:* ${lastSubmittedTree.province}\n` +
        `📅 *Fecha de Siembra:* ${lastSubmittedTree.planting_date}\n\n` +
        `Una vez validada por el equipo, podrás ver tu árbol marcado en el mapa interactivo.\n\n` +
        `*¡Gracias por dejar tu huella verde!* 💚\n` +
        `_De mano en mano, reforestando Panamá._`
    );

    const waUrl = cleanPhone 
        ? `https://wa.me/${cleanPhone}?text=${message}`
        : `https://api.whatsapp.com/send?text=${message}`;

    window.open(waUrl, '_blank');
}

function sendAdminNotificationWhatsApp() {
    if (!lastSubmittedTree) return;

    const adminPhone = (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG.adminPhone)
        ? SUPABASE_CONFIG.adminPhone.replace(/\D/g, '')
        : '';

    const message = encodeURIComponent(
        `🚨 *¡NUEVO ÁRBOL REGISTRADO (PENDIENTE)!* 🌳\n\n` +
        `📋 *Código:* ${lastSubmittedTree.code}\n` +
        `👤 *Sembrador:* ${lastSubmittedTree.planter_name}\n` +
        `📞 *Teléfono:* ${lastSubmittedTree.phone || 'No especificado'}\n` +
        `🌳 *Especie:* ${lastSubmittedTree.species_name}\n` +
        `📍 *Provincia:* ${lastSubmittedTree.province}\n` +
        `📍 *Coordenadas:* ${lastSubmittedTree.latitude}, ${lastSubmittedTree.longitude}\n` +
        `📅 *Fecha:* ${lastSubmittedTree.planting_date}\n\n` +
        `👉 *Entra al panel admin para revisar y aprobar:* \n` +
        `${window.location.origin}/#admin`
    );

    const waUrl = adminPhone 
        ? `https://wa.me/${adminPhone}?text=${message}`
        : `https://api.whatsapp.com/send?text=${message}`;

    window.open(waUrl, '_blank');
}

// Notificación automática por correo electrónico al administrador
async function sendAdminEmailNotification(tree) {
    if (!navigator.onLine) return;
    
    const adminEmail = (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG.adminEmail)
        ? SUPABASE_CONFIG.adminEmail
        : '';

    if (!adminEmail) return;

    try {
        await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(adminEmail), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                _subject: `🚨 ¡Nuevo Árbol Registrado (PENDIENTE)! - ${tree.code}`,
                _template: 'table',
                "Código de Registro": tree.code,
                "Nombre del Sembrador": tree.planter_name,
                "Especie de Árbol": tree.species_name,
                "Provincia": tree.province,
                "Ubicación Exacta": tree.location_description || 'No especificada',
                "Coordenadas": `${tree.latitude}, ${tree.longitude}`,
                "Fecha de Siembra": tree.planting_date,
                "Teléfono de Contacto": tree.phone || 'No indicado',
                "Email de Contacto": tree.email || 'No indicado',
                "Notas del Sembrador": tree.notes || 'Ninguna',
                "Enlace al Panel de Administración": `${window.location.origin}/#admin`
            })
        });
        console.log('[Email Notification] Alerta de nuevo árbol enviada al correo del administrador.');
    } catch (err) {
        console.warn('Error al enviar correo de notificación al administrador:', err);
    }
}

function closeSuccessModal() {
    const modal = document.getElementById('modal-success');
    if (modal) modal.classList.add('hidden');
    showView('home');
}

// Vista de Ficha de un Árbol Específico
function renderTreeProfile(code) {
    const tree = state.trees.find(t => t.code === code);
    const container = document.getElementById('tree-profile-content');
    if (!container) return;

    if (!tree) {
        container.innerHTML = `
            <div class="text-center py-16">
                <p class="text-xl text-gray-500 font-semibold mb-4">Árbol no encontrado o no disponible públicamente.</p>
                <button onclick="showView('mapa')" class="px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700">Ver Mapa de Árboles</button>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl mx-auto border border-emerald-100">
            <div class="relative h-72 sm:h-96 w-full bg-gray-900">
                <img src="${tree.primary_photo_url}" class="w-full h-full object-cover opacity-90" alt="${tree.species_name}">
                <div class="absolute top-4 left-4">
                    <span class="px-4 py-1.5 bg-emerald-600 text-white font-bold text-sm rounded-full shadow-lg">
                        ${tree.code}
                    </span>
                </div>
                <div class="absolute bottom-4 left-4 right-4 text-white">
                    <h1 class="text-3xl font-extrabold shadow-sm">${tree.species_name}</h1>
                    <p class="text-emerald-200 text-sm font-medium">📍 ${tree.province} ${tree.location_description ? '• ' + tree.location_description : ''}</p>
                </div>
            </div>

            <div class="p-6 sm:p-8 space-y-6">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-gray-100 pb-6">
                    <div class="bg-emerald-50 p-4 rounded-xl">
                        <p class="text-xs text-emerald-800 font-semibold uppercase">Sembrado por</p>
                        <p class="text-lg font-bold text-gray-900">${tree.public_name}</p>
                    </div>
                    <div class="bg-emerald-50 p-4 rounded-xl">
                        <p class="text-xs text-emerald-800 font-semibold uppercase">Fecha de Siembra</p>
                        <p class="text-lg font-bold text-gray-900">${tree.planting_date}</p>
                    </div>
                    <div class="bg-emerald-50 p-4 rounded-xl">
                        <p class="text-xs text-emerald-800 font-semibold uppercase">Estado</p>
                        <span class="inline-block mt-1 px-3 py-1 bg-emerald-200 text-emerald-900 text-xs font-bold rounded-md">🌱 Registrado & Aprobado</span>
                    </div>
                </div>

                ${tree.notes ? `
                <div>
                    <h3 class="text-md font-bold text-gray-900 mb-2">Comentarios de la siembra:</h3>
                    <p class="text-gray-600 bg-gray-50 p-4 rounded-xl italic">${tree.notes}</p>
                </div>
                ` : ''}

                <div class="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100">
                    <button onclick="navigator.clipboard.writeText(window.location.href); alert('¡Enlace de la ficha copiado al portapapeles!');" class="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl text-center transition-colors">
                        🔗 Compartir Ficha
                    </button>
                    <button onclick="showView('mapa')" class="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-center transition-colors">
                        🗺️ Ver en el Mapa Público
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Renderizar Panel de Administración con Autenticación
function renderAdminDashboard() {
    const adminContentContainer = document.getElementById('admin-content-container');
    const loginContainer = document.getElementById('admin-login-container');

    if (!adminContentContainer || !loginContainer) return;

    if (!state.isAdminLoggedIn) {
        // Mostrar pantalla de Login de Administrador y ocultar datos sensibles
        loginContainer.classList.remove('hidden');
        adminContentContainer.classList.add('hidden');
        return;
    }

    // Administrador autenticado: mostrar panel completo
    loginContainer.classList.add('hidden');
    adminContentContainer.classList.remove('hidden');

    const tableBody = document.getElementById('admin-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    state.trees.forEach(t => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 transition-colors border-b border-gray-100 text-sm';
        
        const isDead = t.status === 'dead' || t.status === 'baja';
        const badgeClass = t.status === 'approved' ? 'badge-approved' : isDead ? 'badge-dead' : t.status === 'rejected' ? 'badge-rejected' : 'badge-pending';
        const statusLabel = t.status === 'approved' ? 'Aprobado 🌿' : isDead ? 'Dado de Baja 🥀' : t.status === 'rejected' ? 'Rechazado' : 'Pendiente';

        tr.innerHTML = `
            <td class="py-3 px-4 font-mono font-bold text-gray-800">${t.code}</td>
            <td class="py-3 px-4 font-semibold text-gray-900">${t.species_name}</td>
            <td class="py-3 px-4">
                <div class="font-bold text-gray-900">${t.planter_name}</div>
                <div class="text-xs text-emerald-800 font-mono">${t.email || ''} ${t.identity_card ? '• ' + t.identity_card : ''}</div>
            </td>
            <td class="py-3 px-4">${t.province}</td>
            <td class="py-3 px-4">${t.planting_date}</td>
            <td class="py-3 px-4">
                <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass}">
                    ${statusLabel}
                </span>
            </td>
            <td class="py-3 px-4 text-right space-x-1">
                <button onclick="focusTreeOnMap('${t.code}')" class="px-2 py-1 bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100 text-xs font-semibold rounded transition-colors" title="Ajustar posición en el mapa">
                    📍 Reubicar
                </button>
                ${t.status !== 'approved' ? `
                    <button onclick="updateTreeStatus('${t.id}', 'approved')" class="px-2 py-1 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700" title="Aprobar árbol (pin verde en mapa)">
                        🌿 Aprobar
                    </button>
                ` : ''}
                ${!isDead ? `
                    <button onclick="updateTreeStatus('${t.id}', 'dead')" class="px-2 py-1 bg-rose-600 text-white text-xs font-semibold rounded hover:bg-rose-700" title="Dar de baja árbol no sobreviviente (pin rojo en mapa)">
                        🥀 Baja
                    </button>
                ` : ''}
                ${t.status !== 'rejected' ? `
                    <button onclick="updateTreeStatus('${t.id}', 'rejected')" class="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded hover:bg-red-200">
                        Rechazar
                    </button>
                ` : ''}
            </td>
        `;
        tableBody.appendChild(tr);
    });

    const pendingCount = state.trees.filter(t => t.status === 'pending').length;
    const approvedCount = state.trees.filter(t => t.status === 'approved').length;
    const deadCount = state.trees.filter(t => t.status === 'dead' || t.status === 'baja').length;
    
    const elPending = document.getElementById('admin-pending-count');
    const elApproved = document.getElementById('admin-approved-count');
    const elDead = document.getElementById('admin-dead-count');

    if (elPending) elPending.textContent = pendingCount;
    if (elApproved) elApproved.textContent = approvedCount;
    if (elDead) elDead.textContent = deadCount;
}

function focusTreeOnMap(code) {
    const tree = state.trees.find(t => t.code === code);
    if (!tree) return;

    showView('mapa');
    setTimeout(() => {
        if (state.map) {
            state.map.setView([tree.latitude, tree.longitude], 17);
            const targetMarker = state.activeMarkers.find(m => {
                const latLng = m.getLatLng();
                return Math.abs(latLng.lat - tree.latitude) < 0.0001 && Math.abs(latLng.lng - tree.longitude) < 0.0001;
            });
            if (targetMarker) {
                targetMarker.openPopup();
            }
        }
        showToast(`🔓 Modo Edición Activo: Arrastra el marcador de ${tree.code} para reubicarlo.`);
    }, 350);
}

function handleAdminLogin(e) {
    e.preventDefault();
    const email = document.getElementById('admin-email').value.trim().toLowerCase();
    const pass = document.getElementById('admin-password').value.trim();

    const validEmail = (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG.adminEmail)
        ? SUPABASE_CONFIG.adminEmail.toLowerCase()
        : 'juntosforestando@gmail.com';

    const validPass = (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG.adminPassword)
        ? SUPABASE_CONFIG.adminPassword
        : 'Forestando2026!';

    if (email === validEmail && pass === validPass) {
        state.isAdminLoggedIn = true;
        renderAdminDashboard();
        if (state.map) renderMapMarkers();
        showToast('🔓 Sesión de Administrador iniciada. Modo edición de mapa activado.');
        document.getElementById('admin-email').value = '';
        document.getElementById('admin-password').value = '';
    } else {
        alert('❌ Correo electrónico o contraseña de administrador incorrectos.');
    }
}

function logoutAdmin() {
    state.isAdminLoggedIn = false;
    renderAdminDashboard();
    if (state.map) renderMapMarkers();
    showToast('🔒 Sesión de Administrador cerrada.');
}

function updateTreeStatus(treeId, newStatus) {
    const tree = state.trees.find(t => t.id === treeId || t.code === treeId);
    if (tree) {
        tree.status = newStatus;
        saveTreesToStorage();

        // Actualizar estado en la nube de Supabase Cloud
        const sb = getSupabaseClient();
        if (sb) {
            sb.from('trees').update({ status: newStatus }).eq('code', tree.code)
                .then(() => console.log(`[Supabase] Estado de ${tree.code} actualizado a ${newStatus}`))
                .catch(err => console.warn('Error al actualizar estado en Supabase:', err));
        }

        renderAdminDashboard();
        updateStatsCounter();
        if (state.map) renderMapMarkers();

        const statusMsg = (newStatus === 'dead' || newStatus === 'baja')
            ? '🥀 Árbol dado de baja (marcador rojo activo en el mapa).' 
            : newStatus === 'approved' 
            ? '🌿 Árbol activo (marcador verde en el mapa).' 
            : '❌ Árbol rechazado.';
        showToast(`Estado de ${tree.code} actualizado: ${statusMsg}`);
    }
}

// Exportar Registros a CSV
function exportTreesToCSV() {
    if (!state.trees.length) {
        alert('No hay registros para exportar.');
        return;
    }

    const headers = ["Código", "Especie", "Nombre Completo", "Email", "Cédula", "Fecha Siembra", "Provincia", "Latitud", "Longitud", "Estado"];
    const rows = state.trees.map(t => [
        t.code,
        `"${t.species_name}"`,
        `"${t.planter_name}"`,
        `"${t.email || ''}"`,
        `"${t.identity_card || ''}"`,
        t.planting_date,
        `"${t.province}"`,
        t.latitude,
        t.longitude,
        t.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `forestando_juntos_arboles_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Configuración de Event Listeners
function setupEventListeners() {
    window.addEventListener('hashchange', handleHashRouting);

    const form = document.getElementById('form-registro');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    const speciesSelect = document.getElementById('species-select');
    if (speciesSelect) {
        speciesSelect.addEventListener('change', (e) => {
            const customInput = document.getElementById('input-custom-species-container');
            if (e.target.value === 'otro') {
                customInput.classList.remove('hidden');
            } else {
                customInput.classList.add('hidden');
            }
        });
    }

    const filterSpecies = document.getElementById('filter-species');
    if (filterSpecies) {
        filterSpecies.addEventListener('change', (e) => {
            state.selectedSpeciesFilter = e.target.value;
            renderMapMarkers();
        });
    }

    const filterProvince = document.getElementById('filter-province');
    if (filterProvince) {
        filterProvince.addEventListener('change', (e) => {
            state.selectedProvinceFilter = e.target.value;
            renderMapMarkers();
        });
    }

    // Manejo de carga de archivos de foto
    const photoInput = document.getElementById('input-photos');
    if (photoInput) {
        photoInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            state.selectedPhotos = [];
            const container = document.getElementById('photo-preview-container');
            container.innerHTML = '';

            files.slice(0, 3).forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const imgUrl = event.target.result;
                    state.selectedPhotos.push(imgUrl);
                    
                    const img = document.createElement('img');
                    img.src = imgUrl;
                    img.className = 'w-24 h-24 object-cover rounded-lg border-2 border-emerald-500 shadow';
                    container.appendChild(img);
                };
                reader.readAsDataURL(file);
            });
        });
    }

    // Limpieza activa del DOM para remover cualquier widget flotante de Netlify
    const purgeNetlifyBadge = () => {
        document.querySelectorAll('a[href*="netlify"], iframe[src*="netlify"], [class*="netlify"], [id*="netlify"], [data-netlify]').forEach(el => {
            if (el.tagName !== 'LINK' && el.tagName !== 'SCRIPT') {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                el.style.opacity = '0';
                try { el.remove(); } catch (e) {}
            }
        });
    };
    purgeNetlifyBadge();
    setInterval(purgeNetlifyBadge, 1000);
}
