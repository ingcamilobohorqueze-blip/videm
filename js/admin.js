/**
 * VIDEM OPERATIONS DASHBOARD & CRM
 * Executive Concierge Control System
 */

// Master Password List (Acepta la clave oficial o variantes cómodas)
const MASTER_PASSWORDS = ['VidemAdmin2026!', 'videm2026', 'camilo2026', 'admin'];

// Storage Keys
const STORAGE_AUTH_KEY = 'videm_admin_authenticated_v1';
const STORAGE_CLIENTS_KEY = 'videm_admin_crm_clients_v3';

// State
let crmClients = [];
let currentFilter = 'all';
let selectedClientId = null;

// =========================================================================
// 1. AUTHENTICATION & SECURITY GATEWAY
// =========================================================================

function checkExistingAuth() {
  const isAuthSession = sessionStorage.getItem(STORAGE_AUTH_KEY);
  const isAuthLocal = localStorage.getItem(STORAGE_AUTH_KEY);

  if (isAuthSession === 'true' || isAuthLocal === 'true') {
    unlockDashboard();
  }
}

function handleAdminLogin() {
  const passInput = document.getElementById('adminPass');
  const rememberCheck = document.getElementById('rememberSession');
  const errorMsg = document.getElementById('authErrorMsg');

  const enteredPass = passInput.value.trim();

  if (MASTER_PASSWORDS.includes(enteredPass)) {
    errorMsg.style.display = 'none';
    if (rememberCheck.checked) {
      localStorage.setItem(STORAGE_AUTH_KEY, 'true');
    } else {
      sessionStorage.setItem(STORAGE_AUTH_KEY, 'true');
    }
    unlockDashboard();
    showToast('🔓 Consola Desbloqueada. Bienvenido, Camilo.');
  } else {
    errorMsg.style.display = 'block';
    passInput.focus();
    passInput.select();
  }
}

function unlockDashboard() {
  const authModal = document.getElementById('adminAuthModal');
  const adminApp = document.getElementById('adminApp');
  if (authModal) authModal.style.display = 'none';
  if (adminApp) adminApp.style.display = 'block';

  initDashboard();
}

function handleAdminLogout() {
  sessionStorage.removeItem(STORAGE_AUTH_KEY);
  localStorage.removeItem(STORAGE_AUTH_KEY);
  location.reload();
}

function togglePassVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
  }
}

// =========================================================================
// 2. DASHBOARD INITIALIZATION & LIVE CLOCK
// =========================================================================

function initDashboard() {
  loadClientsFromStorage();
  startLiveClock();
  startLiveCountdowns();
  updateMetrics();
  renderCrmTable();
  generateAutoClientCredentials();
}

function startLiveClock() {
  function updateTime() {
    const clockEl = document.getElementById('liveClock');
    if (!clockEl) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-CO', {
      timeZone: 'America/Bogota',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    clockEl.textContent = timeStr;
  }
  updateTime();
  setInterval(updateTime, 1000);
}

// =========================================================================
// 3. SEED CLIENTS & STORAGE MANAGEMENT
// =========================================================================

function loadClientsFromStorage() {
  const saved = localStorage.getItem(STORAGE_CLIENTS_KEY);
  if (saved) {
    try {
      crmClients = JSON.parse(saved);
      return;
    } catch (e) {
      console.error('Error al parsear clientes locales', e);
    }
  }

  // Clientes Iniciales Pre-Cargados (Camilo + Demo + John Bedoya)
  const now = new Date();
  
  crmClients = [
    {
      id: 'cli-001',
      name: 'Camilo Andrés Bohórquez (Línea Personal RD)',
      phone: '+57 310 331 1543',
      plan: 'Membresía Personal (Por Renovar)',
      price: '16 € (~$72.000 COP)',
      user: 'cbohorquez1983',
      pass: '••••••••',
      rdEmail: 'ing.camilo.bohorqueze@gmail.com',
      status: 'Activo',
      startDate: '2026-04-27T00:00:00',
      endDate: '2026-10-27T23:59:59',
      notes: 'Cuenta principal personal en Real-Debrid. Vence mañana martes 27 de Octubre a medianoche. Al renovar con 180 días, darle clic a 🔄 para extender.'
    },
    {
      id: 'cli-002',
      name: 'Cuenta Demo VIDEM 4K (30D RD Activo)',
      phone: '+57 301 556 8904',
      plan: 'Demo VIP',
      price: 'Cortesía',
      user: 'vip.8294@videm.tv',
      pass: 'Videm4K.8294!',
      rdEmail: 'ing.camilo.bohorqueze@gmail.com',
      status: 'Demo',
      startDate: '2026-10-25T00:00:00',
      endDate: '2026-11-24T23:59:59',
      notes: 'Cuenta compartida para demostraciones en vivo a vecinos y prospectos de Laneros. Token RD activo por 30 días.'
    },
    {
      id: 'cli-003',
      name: 'John Bedoya (Vecino Conjunto)',
      phone: '160399999680633@lid',
      plan: 'Semestral VIP',
      price: '$240.000 COP',
      user: 'vip.9299@videm.tv',
      pass: 'Videm4K.9299!',
      rdEmail: 'ing.camilobohorquez.e@gmail.com',
      status: 'Pendiente',
      startDate: '2026-10-25T18:00:00',
      endDate: '2027-04-25T23:59:59',
      notes: 'Samsung Q60 Series 55 pulgadas QLED. Probó demo anoche con código Y91E. Contacto por canal privado WhatsApp (LID). En seguimiento de pago hoy.'
    }
  ];

  saveClientsToStorage();
}

function saveClientsToStorage() {
  localStorage.setItem(STORAGE_CLIENTS_KEY, JSON.stringify(crmClients));
  updateMetrics();
}

// =========================================================================
// 4. METRICS & COUNTERS
// =========================================================================

function updateMetrics() {
  const activeCount = crmClients.filter(c => c.status === 'Activo').length;
  const demoCount = crmClients.filter(c => c.status === 'Demo').length;
  
  // Próximos a vencer (< 7 días)
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiringSoonCount = crmClients.filter(c => {
    const end = new Date(c.endDate);
    return end > now && end <= sevenDaysFromNow;
  }).length;

  // Ingresos totales calculados
  let revenue = 0;
  crmClients.forEach(c => {
    if (c.status === 'Activo') {
      if (c.plan.includes('Anual')) revenue += 440000;
      else if (c.plan.includes('Semestral')) revenue += 240000;
      else if (c.plan.includes('Mensual')) revenue += 50000;
    }
  });

  document.getElementById('kpiActiveClients').textContent = activeCount;
  document.getElementById('kpiActiveDemos').textContent = demoCount;
  document.getElementById('kpiExpiringSoon').textContent = expiringSoonCount;
  document.getElementById('kpiTotalRevenue').textContent = '$' + revenue.toLocaleString('es-CO');
}

// =========================================================================
// 5. LIVE COUNTDOWN & CRM TABLE RENDERING
// =========================================================================

function renderCrmTable() {
  const tbody = document.getElementById('crmTableBody');
  if (!tbody) return;

  const searchTerm = (document.getElementById('crmSearch')?.value || '').toLowerCase().trim();
  
  const filtered = crmClients.filter(client => {
    // Filtro por píldoras
    if (currentFilter !== 'all' && client.status !== currentFilter) {
      return false;
    }
    // Filtro por texto
    if (searchTerm) {
      const matchName = client.name.toLowerCase().includes(searchTerm);
      const matchPhone = client.phone.toLowerCase().includes(searchTerm);
      const matchUser = client.user.toLowerCase().includes(searchTerm);
      const matchPlan = client.plan.toLowerCase().includes(searchTerm);
      return matchName || matchPhone || matchUser || matchPlan;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 32px; color: var(--text-muted);">
          🔍 No se encontraron clientes con el filtro aplicado.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(client => {
    const initials = client.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    const cleanPhone = client.phone.replace(/[^0-9]/g, '');

    // Badges
    let badgeClass = 'badge-active';
    let statusText = '🟢 Activo';
    if (client.status === 'Demo') {
      badgeClass = 'badge-demo';
      statusText = '🔵 Demo VIP';
    } else if (client.status === 'Pendiente') {
      badgeClass = 'badge-pending';
      statusText = '🟡 Pendiente';
    }

    const endFormatted = new Date(client.endDate).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const isLid = client.phone.includes('@lid') || cleanPhone.length > 13 || cleanPhone.startsWith('1522') || cleanPhone.startsWith('16039');
    const phoneDisplay = isLid
      ? `<span class="client-phone-link" style="color:var(--text-muted); cursor:help;" title="Identificador interno de privacidad WhatsApp (LID). Abre WhatsApp y busca directamente el chat de: ${escapeHtml(client.name)}">
           🔒 ${escapeHtml(client.phone)} <span class="badge-lid">LID Privado</span>
         </span>`
      : `<a href="https://wa.me/${cleanPhone}" target="_blank" class="client-phone-link" title="Abrir chat en WhatsApp">
           💬 ${escapeHtml(client.phone)}
         </a>`;

    const isAnnual = client.plan.includes('Anual');
    const trancheTag = isAnnual
      ? `<div class="badge-tranche" title="Estrategia RD: 180 días activos. El CRM te alertará 15 días antes para recargar el tramo 2 (180d) con la reserva.">⚡ Tramo 1/2 RD (180d)</div>`
      : '';

    return `
      <tr data-client-id="${client.id}">
        <td>
          <div class="client-cell">
            <div class="client-avatar">${initials}</div>
            <div class="client-meta">
              <span class="client-name">${escapeHtml(client.name)}</span>
              ${phoneDisplay}
            </div>
          </div>
        </td>
        <td>
          <strong>${escapeHtml(client.plan)}</strong>
          <br><small style="color:var(--text-muted);">${escapeHtml(client.price || '')}</small>
          ${trancheTag}
        </td>
        <td>
          <code style="color:#00F0FF; font-size:0.8rem;">${escapeHtml(client.user)}</code>
          <button type="button" class="btn-copy" style="padding:2px 6px; font-size:0.75rem; margin-left:4px;" onclick="copyText('${client.pass}', 'Contraseña copiada')" title="Copiar Contraseña">🔑</button>
        </td>
        <td>
          <span class="badge ${badgeClass}">${statusText}</span>
        </td>
        <td>
          <div class="countdown-cell" id="countdown-cell-${client.id}">
            <span class="countdown-timer" id="timer-${client.id}">Calculando...</span>
            <div class="countdown-progress-bg">
              <div class="countdown-progress-bar" id="bar-${client.id}" style="width: 100%;"></div>
            </div>
          </div>
        </td>
        <td>
          <span style="font-size:0.85rem; font-weight:600;">${endFormatted}</span>
        </td>
        <td class="text-right">
          <div class="action-buttons">
            <button class="btn btn-secondary btn-sm" onclick="openClientDetailModal('${client.id}')" title="Ver Ficha Técnica 360°">
              👁️ Ficha
            </button>
            <button class="btn btn-outline btn-sm" onclick="quickExtendPrompt('${client.id}')" title="Renovar o Sumar Días">
              🔄
            </button>
            <button class="btn btn-outline btn-sm" style="color:#EF4444;" onclick="deleteClientPrompt('${client.id}')" title="Eliminar Cliente">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  updateAllCountdowns();
}

function startLiveCountdowns() {
  updateAllCountdowns();
  setInterval(updateAllCountdowns, 1000);
}

function updateAllCountdowns() {
  const now = new Date().getTime();

  crmClients.forEach(client => {
    const timerEl = document.getElementById(`timer-${client.id}`);
    const barEl = document.getElementById(`bar-${client.id}`);
    if (!timerEl || !barEl) return;

    const start = new Date(client.startDate).getTime();
    const end = new Date(client.endDate).getTime();
    const totalDuration = end - start;
    const remaining = end - now;

    if (remaining <= 0) {
      timerEl.textContent = '⛔ VENCIDO';
      timerEl.style.color = '#EF4444';
      barEl.style.width = '0%';
      barEl.className = 'countdown-progress-bar danger';
      return;
    }

    // Cálculos de días, horas, minutos y segundos
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    let displayStr = '';
    if (days > 0) {
      displayStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else {
      displayStr = `${hours}h ${minutes}m ${seconds}s`;
    }

    timerEl.textContent = displayStr;

    // Barra de porcentaje
    const pct = Math.max(0, Math.min(100, (remaining / totalDuration) * 100));
    barEl.style.width = pct + '%';

    if (pct < 10) {
      barEl.className = 'countdown-progress-bar danger';
    } else if (pct < 25) {
      barEl.className = 'countdown-progress-bar warning';
    } else {
      barEl.className = 'countdown-progress-bar';
    }
  });
}

// Filtros de búsqueda
function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderCrmTable();
}

function filterClients() {
  renderCrmTable();
}

// =========================================================================
// 6. ACTIVADOR DE DEMOS (OPERACIONES)
function updateDemoLinkUrl(val) {
  const code = (val || '').toUpperCase().trim();
  const anchor = document.getElementById('stremioDirectAnchor');
  if (anchor) {
    if (code.length >= 4) {
      anchor.href = `https://link.stremio.com/${code}`;
      anchor.setAttribute('title', `Clic derecho -> Abrir https://link.stremio.com/${code} en ventana de incógnito`);
      anchor.innerHTML = `<span>🕵️ Clic Derecho: Abrir (${code}) en Incógnito</span>`;
    } else {
      anchor.href = 'https://link.stremio.com';
      anchor.setAttribute('title', 'Clic derecho -> Abrir en ventana de incógnito');
      anchor.innerHTML = '<span>🕵️ Clic Derecho: Abrir en Incógnito</span>';
    }
  }
}

function copyDemoDirectLink() {
  const codeInput = document.getElementById('demoTvCode');
  const code = (codeInput?.value || '').toUpperCase().trim();
  const targetUrl = code.length >= 4 ? `https://link.stremio.com/${code}` : 'https://link.stremio.com';
  
  copyText(targetUrl, `Enlace copiado (${targetUrl}). ¡Pégalo en tu ventana de Incógnito!`);
}

function executeDemoLink() {
  const codeInput = document.getElementById('demoTvCode');
  const code = (codeInput?.value || '').toUpperCase().trim();

  if (!code || code.length < 4) {
    showToast('⚠️ Ingresa un código válido de 4 a 6 letras');
    codeInput?.focus();
    return;
  }

  const linkUrl = `https://link.stremio.com/${code}`;
  
  // Actualizar también el anchor de clic derecho
  updateDemoLinkUrl(code);

  // Abrir la URL oficial de Stremio Link en una ventana emergente limpia
  window.open(linkUrl, '_blank', 'width=520,height=620');

  showToast(`🚀 Abriendo Stremio Link (${code}). Si estás en tu sesión personal, usa Clic Derecho -> Incógnito.`);
}

function openStremioLinkTab() {
  window.open('https://link.stremio.com', '_blank');
}

function copyDemoWhatsAppWelcome() {
  const text = `✦ *VIDEM CONCIERGE | Acceso de Cortesía* 🍿\n\n¡Hola! Bienvenido a tu prueba de streaming 4K Remux nativo sin compresión.\n\nPara enlazarte en 1 minuto:\n📺 1. Abre la tienda de aplicaciones de tu Smart TV o Fire TV y busca: *Stremio*.\n🔑 2. Al abrirla te saldrá un código de 4 letras para vincular (ej: 9A4K).\n💬 3. Envíame esas 4 letras por acá y te activamos el enlace de inmediato.`;
  copyText(text, 'Mensaje de Bienvenida Demo copiado');
}

function copyDemoWhatsAppSuccess() {
  const text = `¡Listo! Ya quedó enlazado tu televisor a nuestra infraestructura privada. 🍿🎬\n\nMira tu pantalla: verás que ya cargó todo el catálogo. Pon cualquier película reciente (como Dune 2 o Top Gun), dale al primer enlace de arriba (Torrentio 4K Remux) y enciende esa barra de sonido.\n\n¡Me cuentas qué tal se ve y se escucha en tu sala!`;
  copyText(text, 'Mensaje de Éxito Demo copiado');
}

const DEMO_EMAIL = 'vip.8294@videm.tv';
const DEMO_PASS = 'Videm4K.8294!';
const DEMO_RD_TOKEN = '76N4SFYLKTKDADDLDIAGR6MDKCG7VQT2FMEGTQDQM3X5U2PFU6QQ';
const DEMO_TORRENTIO_MANIFEST = `https://torrentio.strem.fun/language=latino%7Cqualityfilter=cam,scr%7Cdebridoptions=nodownloadlinks%7Crealdebrid=${DEMO_RD_TOKEN}/manifest.json`;

async function toggleDemoStream(action) {
  const label = document.getElementById('demoStreamLabel');
  const badge = document.getElementById('demoStatusBadge');
  
  showToast(action === 'cut' ? '⏳ Cortando señal remota de la cuenta Demo...' : '⏳ Restaurando señal 4K Remux en cuenta Demo...');

  try {
    // 1. Iniciar sesión en Stremio API
    const loginRes = await fetch('https://api.strem.io/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASS })
    });
    const loginData = await loginRes.json();
    const authKey = loginData.result?.authKey;
    if (!authKey) throw new Error('No se pudo autenticar en la cuenta Demo');

    // 2. Obtener addons actuales
    const getRes = await fetch('https://api.strem.io/api/addonCollectionGet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authKey, type: 'AddonCollectionGet' })
    });
    const getData = await getRes.json();
    let currentAddons = getData.result?.addons || [];

    if (action === 'cut') {
      // Filtrar y remover Torrentio RD
      const cleanAddons = currentAddons.filter(a => a.manifest?.id !== 'com.stremio.torrentio.addon');
      await fetch('https://api.strem.io/api/addonCollectionSet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authKey, type: 'AddonCollectionSet', addons: cleanAddons })
      });

      if (label) label.textContent = '⛔ Señal Cortada (Streams removidos)';
      if (badge) {
        badge.innerHTML = '<span class="pulsing-dot" style="background:#EF4444; box-shadow:0 0 8px #EF4444;"></span><span>Demo Desactivada</span>';
        badge.style.color = '#EF4444';
        badge.style.borderColor = 'rgba(239,68,68,0.4)';
      }
      showToast('🔒 Acceso Demo cortado con éxito (Streams 4K apagados en la TV)');
    } else {
      // Restaurar Torrentio RD
      const mRes = await fetch(DEMO_TORRENTIO_MANIFEST);
      const manifest = await mRes.json();
      const torrentioAddon = {
        transportUrl: DEMO_TORRENTIO_MANIFEST,
        transportName: 'http',
        manifest: manifest
      };
      const cleanAddons = currentAddons.filter(a => a.manifest?.id !== 'com.stremio.torrentio.addon');
      cleanAddons.push(torrentioAddon);

      await fetch('https://api.strem.io/api/addonCollectionSet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authKey, type: 'AddonCollectionSet', addons: cleanAddons })
      });

      if (label) label.textContent = 'Señal activa a 80 Mbps Remux';
      if (badge) {
        badge.innerHTML = '<span class="pulsing-dot green"></span><span>Demo 30D Online</span>';
        badge.style.color = '#10B981';
        badge.style.borderColor = 'rgba(16,185,129,0.3)';
      }
      showToast('⚡ Señal Demo restaurada: Torrentio RD 4K Remux activo en vivo');
    }
  } catch (err) {
    console.error('Error al gestionar señal demo:', err);
    showToast('⚠️ Error al comunicarse con la cuenta demo: ' + err.message);
  }
}

// =========================================================================
// 7. CLIENT CREATION & GENERATOR
// =========================================================================

function generateAutoClientCredentials() {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  
  const userEl = document.getElementById('genStremioUser');
  const passEl = document.getElementById('genStremioPass');
  const rdEmailEl = document.getElementById('genRdEmail');

  if (userEl) userEl.value = `vip.${randomSuffix}@videm.tv`;
  if (passEl) passEl.value = `Videm4K.${randomSuffix}!`;
  
  // Dot trick email for RD
  const dotVariants = [
    'ing.camilo.bohorquez.e@gmail.com',
    'ing.camilobohorquez.e@gmail.com',
    'i.ng.camilo.bohorqueze@gmail.com',
    'ing.c.amilo.bohorqueze@gmail.com'
  ];
  const chosenEmail = dotVariants[Math.floor(Math.random() * dotVariants.length)];
  if (rdEmailEl) rdEmailEl.value = chosenEmail;
}

function updatePlanDates() {
  // Opcional para previsualizar expiración
}

function saveNewClient() {
  const name = document.getElementById('clientName').value.trim();
  const phone = document.getElementById('clientPhone').value.trim();
  const plan = document.getElementById('clientPlan').value;
  const status = document.getElementById('clientStatus').value;
  const user = document.getElementById('genStremioUser').value;
  const pass = document.getElementById('genStremioPass').value;
  const rdEmail = document.getElementById('genRdEmail').value;

  if (!name || !phone) {
    showToast('⚠️ Completa el nombre y teléfono del cliente');
    return;
  }

  // Calcular fechas
  const now = new Date();
  let days = 180;
  let price = '$240.000 COP';
  if (plan.includes('Anual')) { days = 365; price = '$440.000 COP'; }
  else if (plan.includes('Mensual')) { days = 30; price = '$50.000 COP'; }
  else if (plan.includes('Demo')) { days = 1; price = 'Cortesía'; }

  const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

  const newClient = {
    id: 'cli-' + Date.now(),
    name,
    phone,
    plan,
    price,
    user,
    pass,
    rdEmail,
    status,
    startDate: now.toISOString(),
    endDate,
    notes: `Creado el ${now.toLocaleDateString('es-CO')}. Aprovisionamiento inicial.`
  };

  crmClients.unshift(newClient);
  saveClientsToStorage();
  renderCrmTable();

  // Limpiar campos y regenerar
  document.getElementById('clientName').value = '';
  document.getElementById('clientPhone').value = '';
  generateAutoClientCredentials();

  showToast(`✅ Cliente ${name} guardado con éxito`);
}

// =========================================================================
// 8. CLIENT DETAIL MODAL & CRM OPERATIONS
// =========================================================================

function openClientDetailModal(clientId) {
  const client = crmClients.find(c => c.id === clientId);
  if (!client) return;

  selectedClientId = clientId;

  document.getElementById('modalClientName').textContent = client.name;
  document.getElementById('modalClientPhone').textContent = client.phone;
  document.getElementById('modalClientPlanBadge').textContent = client.plan;
  document.getElementById('modalClientUser').textContent = client.user;
  document.getElementById('modalClientPass').textContent = client.pass;

  const startFormatted = new Date(client.startDate).toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  const endFormatted = new Date(client.endDate).toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  document.getElementById('modalClientStartDate').textContent = startFormatted;
  document.getElementById('modalClientEndDate').textContent = endFormatted;
  document.getElementById('modalClientNotes').value = client.notes || '';

  const cleanPhone = client.phone.replace(/[^0-9]/g, '');
  const isLid = client.phone.includes('@lid') || cleanPhone.length > 13 || cleanPhone.startsWith('1522') || cleanPhone.startsWith('16039');
  const waBtn = document.getElementById('modalClientWhatsAppLink');
  if (waBtn) {
    if (isLid) {
      waBtn.href = '#';
      waBtn.onclick = (e) => {
        e.preventDefault();
        alert(`Este contacto utiliza un identificador privado de WhatsApp (LID).\n\nPara chatear con él/ella, abre tu WhatsApp y búscalo por su nombre: "${client.name}". El chat ya está en tu bandeja de entrada.`);
      };
      waBtn.innerHTML = '<span>🔒 Chat Privado (Buscar "' + escapeHtml(client.name) + '")</span>';
    } else {
      waBtn.href = `https://wa.me/${cleanPhone}`;
      waBtn.onclick = null;
      waBtn.innerHTML = '<span>💬 Abrir Chat de WhatsApp</span>';
    }
  }

  document.getElementById('clientDetailModal').style.display = 'flex';
}

function closeClientDetailModal() {
  document.getElementById('clientDetailModal').style.display = 'none';
  selectedClientId = null;
}

function saveClientModalNotes() {
  if (!selectedClientId) return;
  const client = crmClients.find(c => c.id === selectedClientId);
  if (!client) return;

  const notes = document.getElementById('modalClientNotes').value;
  client.notes = notes;
  saveClientsToStorage();
  showToast('💾 Notas del cliente guardadas');
}

function extendClientSubscription() {
  if (!selectedClientId) return;
  const client = crmClients.find(c => c.id === selectedClientId);
  if (!client) return;

  const currentEnd = new Date(client.endDate).getTime();
  const baseTime = Math.max(Date.now(), currentEnd);
  // Sumar 180 días
  const newEnd = new Date(baseTime + 180 * 24 * 60 * 60 * 1000);
  client.endDate = newEnd.toISOString();
  client.status = 'Activo';

  saveClientsToStorage();
  renderCrmTable();
  openClientDetailModal(selectedClientId); // Refrescar modal
  showToast(`🎉 Membresía renovada (+180 días) hasta ${newEnd.toLocaleDateString('es-CO')}`);
}

function quickExtendPrompt(clientId) {
  selectedClientId = clientId;
  extendClientSubscription();
}

function deleteClientPrompt(clientId) {
  const client = crmClients.find(c => c.id === clientId);
  if (!client) return;

  if (confirm(`¿Estás seguro de eliminar a ${client.name} del CRM?`)) {
    crmClients = crmClients.filter(c => c.id !== clientId);
    saveClientsToStorage();
    renderCrmTable();
    showToast('🗑️ Cliente eliminado del CRM');
  }
}

// =========================================================================
// 9. BACKUP & EXPORT/IMPORT
// =========================================================================

function exportClientsJSON() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(crmClients, null, 2));
  const downloadAnchor = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `VIDEM_CRM_Backup_${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('📥 Copia de seguridad descargada en JSON');
}

function importClientsJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        crmClients = imported;
        saveClientsToStorage();
        renderCrmTable();
        showToast(`📤 Se restauraron ${imported.length} clientes exitosamente`);
      } else {
        alert('El archivo no contiene un listado válido de clientes');
      }
    } catch (err) {
      alert('Error al leer el archivo JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// =========================================================================
// 10. UTILITIES
// =========================================================================

function copyField(fieldId) {
  const input = document.getElementById(fieldId);
  if (input) {
    copyText(input.value, 'Copiado al portapapeles');
  }
}

function copyText(text, successMsg) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(successMsg || 'Copiado al portapapeles');
  }).catch(() => {
    // Fallback
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showToast(successMsg || 'Copiado al portapapeles');
  });
}

function showToast(message) {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Global initialization on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  checkExistingAuth();
});
