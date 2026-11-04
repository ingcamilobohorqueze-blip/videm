/**
 * VIDEM OPERATIONS DASHBOARD & CRM
 * Executive Concierge Control System
 */

// Master Password List (Acepta la clave oficial o variantes cómodas)
const MASTER_PASSWORDS = ['VidemAdmin2026!', 'videm2026', 'camilo2026', 'admin'];

// Storage Keys
const STORAGE_AUTH_KEY = 'videm_admin_authenticated_v1';
const STORAGE_CLIENTS_KEY = 'videm_admin_crm_clients_v6';

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
  populateLinkTargetAccounts();
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

function seedDefaultClients() {
  crmClients = [
    {
      id: 'cli-001',
      name: 'Camilo Andrés Bohórquez (Línea Personal RD)',
      phone: '+57 310 331 1543',
      plan: 'Membresía Personal (Trimestral 90D)',
      price: '16 € (~$72.000 COP)',
      user: 'ing.camilobohorqueze@gmail.com',
      pass: 'Cb0915271043',
      rdEmail: 'ing.camilobohorqueze@gmail.com',
      rdToken: '5UUJR2B4K3EMRUUHAG3YCF2WCBYMTFUGFYUF7V4ZDCRV2CIYA3DQ',
      status: 'Activo',
      startDate: '2026-10-26T00:00:00',
      endDate: '2027-01-26T23:59:59',
      notes: ''
    },
    {
      id: 'cli-002',
      name: 'Cuenta Demo VIDEM 4K (30D RD Activo)',
      phone: '+57 301 556 8904',
      plan: 'Demo VIP',
      price: 'Cortesía',
      user: 'vip.8294@videm.tv',
      pass: 'Videm4K.8294!',
      rdEmail: 'ing.camilobohorqueze@gmail.com',
      rdToken: '76N4SFYLKTKDADDLDIAGR6MDKCG7VQT2FMEGTQDQM3X5U2PFU6QQ',
      status: 'Demo',
      startDate: '2026-10-25T00:00:00',
      endDate: '2026-11-24T23:59:59',
      notes: ''
    },
    {
      id: 'cli-003',
      name: 'John Bedoya (Vecino Conjunto)',
      phone: '160399999680633@lid',
      plan: 'Pase Mensual Flex',
      price: '$55.000 COP',
      user: 'vip.9299@videm.tv',
      pass: 'Videm4K.9299!',
      rdEmail: 'ing.camilobohorquez.e@gmail.com',
      rdToken: '5MDPKLAAN2KYABXWZ55Z5TIVQZWJRLZVWAOGLS62YBPPNVVHNMQA',
      status: 'Activo',
      startDate: '2026-10-26T19:00:00',
      endDate: '2026-11-26T23:59:59',
      notes: ''
    }
  ];
  saveClientsToStorage();
}

function loadClientsFromStorage() {
  // Limpiar versiones obsoletas de almacenamiento local
  ['videm_admin_crm_clients_v1', 'videm_admin_crm_clients_v2', 'videm_admin_crm_clients_v3', 'videm_admin_crm_clients_v4', 'videm_admin_crm_clients_v5'].forEach(k => localStorage.removeItem(k));

  let loaded = false;
  const saved = localStorage.getItem(STORAGE_CLIENTS_KEY);
  if (saved) {
    try {
      crmClients = JSON.parse(saved);
      loaded = Array.isArray(crmClients) && crmClients.length > 0;
    } catch (e) {
      console.error('Error al parsear clientes locales', e);
    }
  }

  if (!loaded) {
    seedDefaultClients();
    return;
  }

  // Las fechas y modificaciones guardadas por el usuario se respetan permanentemente
}

function resetToRealDates() {
  seedDefaultClients();
  renderCrmTable();
  showToast('✅ Fechas reales sincronizadas: Camilo activo (26 Ene 2027), John Bedoya (26 Nov 2026).');
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
        <td>
          <div class="countdown-cell" id="countdown-cell-${client.id}">
            <span class="countdown-timer" id="timer-${client.id}">Calculando...</span>
            ${client.plan.includes('Anual') ? `
              <div class="countdown-dual-bars" style="display:flex; gap:3px; width:100%; margin-top:4px;" title="2 Tramos Real-Debrid de 180 días (Total 360d)">
                <div class="countdown-progress-bg" style="flex:1;" title="Tramo 1 (180d RD Activo)">
                  <div class="countdown-progress-bar" id="bar-${client.id}-t1" style="width: 100%;"></div>
                </div>
                <div class="countdown-progress-bg" style="flex:1;" title="Tramo 2 (180d RD Reserva)">
                  <div class="countdown-progress-bar" id="bar-${client.id}-t2" style="width: 100%;"></div>
                </div>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:0.68rem; color:var(--text-muted); margin-top:2px;">
                <span id="scale-label-${client.id}">Escala 360d (2x180d)</span>
              </div>
            ` : `
              <div class="countdown-progress-bg" style="margin-top:4px;" title="Escala base 180 días Real-Debrid">
                <div class="countdown-progress-bar" id="bar-${client.id}" style="width: 100%;"></div>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:0.68rem; color:var(--text-muted); margin-top:2px;">
                <span id="scale-label-${client.id}">Base 180d RD</span>
              </div>
            `}
          </div>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:0.85rem; font-weight:600; cursor:pointer;" onclick="quickEditDatePrompt('${client.id}')" title="Clic para modificar fecha de vencimiento">${endFormatted}</span>
            <button type="button" class="btn btn-outline btn-sm" style="padding:1px 5px; font-size:0.7rem; border-color:rgba(0,240,255,0.25);" onclick="quickEditDatePrompt('${client.id}')" title="Modificar fecha de expiración">📅</button>
          </div>
        </td>
        <td class="text-right">
          <div class="action-buttons">
            <button class="btn btn-outline btn-sm" style="color:#00F0FF; border-color:rgba(0,240,255,0.3);" onclick="quickLinkClientTv('${client.id}')" title="Vincular Smart TV a este cliente en 1 Clic">
              📺 TV
            </button>
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
  populateLinkTargetAccounts();
}

function startLiveCountdowns() {
  updateAllCountdowns();
  setInterval(updateAllCountdowns, 1000);
}

function updateAllCountdowns() {
  const now = new Date().getTime();
  const MS_DAY = 1000 * 60 * 60 * 24;
  const STANDARD_BASE_DAYS = 180; // Medida estándar Real-Debrid

  crmClients.forEach(client => {
    const timerEl = document.getElementById(`timer-${client.id}`);
    if (!timerEl) return;

    const end = new Date(client.endDate).getTime();
    const remaining = end - now;
    const isAnnual = (client.plan || '').toLowerCase().includes('anual');

    if (remaining <= 0) {
      timerEl.textContent = '⛔ VENCIDO';
      timerEl.style.color = '#EF4444';
      if (isAnnual) {
        const b1 = document.getElementById(`bar-${client.id}-t1`);
        const b2 = document.getElementById(`bar-${client.id}-t2`);
        if (b1) { b1.style.width = '0%'; b1.className = 'countdown-progress-bar danger'; }
        if (b2) { b2.style.width = '0%'; b2.className = 'countdown-progress-bar danger'; }
      } else {
        const barEl = document.getElementById(`bar-${client.id}`);
        if (barEl) { barEl.style.width = '0%'; barEl.className = 'countdown-progress-bar danger'; }
      }
      const scaleLabel = document.getElementById(`scale-label-${client.id}`);
      if (scaleLabel) scaleLabel.textContent = 'Vencido';
      return;
    }

    const remDays = remaining / MS_DAY;
    const days = Math.floor(remDays);
    const hours = Math.floor((remaining % MS_DAY) / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    let displayStr = days > 0 ? `${days}d ${hours}h ${minutes}m ${seconds}s` : `${hours}h ${minutes}m ${seconds}s`;
    timerEl.textContent = displayStr;

    // Actualizar etiqueta descriptiva de escala
    const scaleLabel = document.getElementById(`scale-label-${client.id}`);
    if (scaleLabel) {
      if (isAnnual) {
        scaleLabel.textContent = `${days}d de 360d (2x180d RD)`;
      } else {
        const pctVal = Math.round((remDays / STANDARD_BASE_DAYS) * 100);
        scaleLabel.textContent = `${days}d / 180d RD (${pctVal}%)`;
      }
    }

    // Color por urgencia real de días:
    // <= 5 días: peligro (rojo)
    // <= 15 días: alerta de renovación (ámbar)
    // > 15 días: saludable (verde/cian)
    let colorClass = 'countdown-progress-bar';
    if (days <= 5) {
      colorClass = 'countdown-progress-bar danger';
      timerEl.style.color = '#EF4444';
    } else if (days <= 15) {
      colorClass = 'countdown-progress-bar warning';
      timerEl.style.color = '#F59E0B';
    } else {
      timerEl.style.color = '#00F0FF';
    }

    if (isAnnual) {
      const b1 = document.getElementById(`bar-${client.id}-t1`);
      const b2 = document.getElementById(`bar-${client.id}-t2`);
      // Tramo 1: 0 - 180d
      const t1Days = Math.min(remDays, 180);
      const t1Pct = Math.max(0, Math.min(100, (t1Days / 180) * 100));
      // Tramo 2: 181 - 360d
      const t2Days = Math.max(0, remDays - 180);
      const t2Pct = Math.max(0, Math.min(100, (t2Days / 180) * 100));

      if (b1) {
        b1.style.width = t1Pct + '%';
        b1.className = colorClass;
      }
      if (b2) {
        b2.style.width = t2Pct + '%';
        b2.className = 'countdown-progress-bar';
      }
    } else {
      const barEl = document.getElementById(`bar-${client.id}`);
      if (barEl) {
        // Escala sobre estándar Real-Debrid de 180 días
        const pct = Math.max(0, Math.min(100, (remDays / STANDARD_BASE_DAYS) * 100));
        barEl.style.width = pct + '%';
        barEl.className = colorClass;
      }
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
// 6. VINCULADOR AUTÓNOMO SMART TV & DESPACHO
// =========================================================================

let lastDeliveryData = {
  name: 'Invitado Demo',
  phone: '',
  code: '',
  accountName: 'Cuenta Demo VIDEM 4K',
  accountEmail: 'vip.8294@videm.tv'
};

function populateLinkTargetAccounts() {
  const select = document.getElementById('linkTargetSelect');
  if (!select) return;

  const currentVal = select.value || 'demo';

  // Demo siempre de primera
  let html = `<option value="demo">🔵 Cuenta Demo VIDEM 4K (vip.8294@videm.tv) [Pase Cortesía]</option>`;

  // Listar clientes activos y demos registrados en CRM
  crmClients.forEach(c => {
    if (c.id === 'cli-002') return; // ya representada en Demo
    const badge = c.status === 'Demo' ? '🔵' : (c.status === 'Activo' ? '🟢' : '🟡');
    html += `<option value="${c.id}">${badge} ${escapeHtml(c.name)} (${escapeHtml(c.user)}) [${escapeHtml(c.plan)}]</option>`;
  });

  html += `<option value="manual">⚙️ Ingresar otra cuenta manual...</option>`;

  select.innerHTML = html;
  if ([...select.options].some(o => o.value === currentVal)) {
    select.value = currentVal;
  }
}

function onLinkTargetSelectChange() {
  const select = document.getElementById('linkTargetSelect');
  const manualBox = document.getElementById('manualAccountFields');
  if (!select || !manualBox) return;

  if (select.value === 'manual') {
    manualBox.style.display = 'block';
  } else {
    manualBox.style.display = 'none';
  }
}

function updateDemoLinkUrl(val) {
  const code = (val || '').toUpperCase().trim();
  const anchor = document.getElementById('stremioDirectAnchor');
  if (anchor) {
    if (code.length >= 4) {
      anchor.href = `https://link.stremio.com/${code}`;
      anchor.innerHTML = `<span>↗️ Abrir (${code}) en stremio.com/link</span>`;
    } else {
      anchor.href = 'https://link.stremio.com';
      anchor.innerHTML = `<span>↗️ stremio.com/link (Respaldo)</span>`;
    }
  }
}

function clearTvCodeInput() {
  const input = document.getElementById('demoTvCode');
  if (input) {
    input.value = '';
    input.focus();
  }
  const telemetry = document.getElementById('linkLiveTelemetryBox');
  if (telemetry) telemetry.style.display = 'none';
  showToast('🧹 Campo de código limpio. Listo para nuevo TV.');
}

async function executeAutonomousLink() {
  const codeInput = document.getElementById('demoTvCode');
  const code = (codeInput?.value || '').toUpperCase().trim();
  const btn = document.getElementById('btnLinkDemo');
  const btnText = document.getElementById('btnLinkDemoText');
  const telemetryBox = document.getElementById('linkLiveTelemetryBox');

  if (!code || code.length < 4) {
    showToast('⚠️ Ingresa el código de 4 a 6 letras del televisor');
    codeInput?.focus();
    return;
  }

  // 1. Determinar cuenta destino (Demo, Cliente CRM o Manual)
  const targetSelect = document.getElementById('linkTargetSelect');
  const targetVal = targetSelect ? targetSelect.value : 'demo';

  let targetUser = '';
  let targetPass = '';
  let targetName = 'Cuenta Demo';
  let targetPhone = '';
  let targetClientObj = null;

  if (targetVal === 'demo') {
    const demoAcc = crmClients.find(c => c.id === 'cli-002') || {};
    targetUser = demoAcc.user || 'vip.8294@videm.tv';
    targetPass = demoAcc.pass || 'Videm4K.8294!';
    targetName = 'Pase Demo Cortesía VIDEM';
    targetPhone = demoAcc.phone || '';
  } else if (targetVal === 'manual') {
    targetUser = (document.getElementById('manualStremioUser')?.value || '').trim();
    targetPass = (document.getElementById('manualStremioPass')?.value || '').trim();
    targetName = targetUser;
    if (!targetUser || !targetPass) {
      showToast('⚠️ Ingresa el usuario y contraseña de la cuenta manual');
      return;
    }
  } else {
    // Cliente del CRM
    targetClientObj = crmClients.find(c => c.id === targetVal);
    if (!targetClientObj) {
      showToast('⚠️ Cliente no encontrado en el CRM');
      return;
    }
    targetUser = targetClientObj.user;
    targetPass = targetClientObj.pass;
    targetName = targetClientObj.name;
    targetPhone = targetClientObj.phone;
  }

  // Feedback en botón
  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = '⏳ Vinculando TV en vivo...';
  const t0 = performance.now();

  try {
    // PASO A: Autenticarse en Stremio para obtener authKey
    const loginRes = await fetch('https://api.strem.io/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: targetUser, password: targetPass })
    });
    const loginData = await loginRes.json();
    const authKey = loginData.result?.authKey;

    if (!authKey) {
      throw new Error(loginData.error?.message || 'Error al iniciar sesión en Stremio con ' + targetUser);
    }

    // PASO A.1: Si es la cuenta Demo, asegurar AUTOMÁTICAMENTE la señal y el Addon Maestro VIDEM
    if (targetVal === 'demo') {
      try {
        // 1. Encender la señal del Proxy Maestro en tiempo real
        const apiBase = (window.location.origin && window.location.origin.startsWith('http')) ? window.location.origin : 'https://videm.tv';
        await fetch(`${apiBase}/api/toggle-demo-signal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'restore' })
        }).catch(() => {});

        // 2. Asegurar que el addon VIDEM 4K Cinema esté registrado en la cuenta
        const getRes = await fetch('https://api.strem.io/api/addonCollectionGet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authKey, type: 'AddonCollectionGet' })
        });
        const getData = await getRes.json();
        const existingAddons = getData.result?.addons || [];
        const hasVidem = existingAddons.some(a => a.manifest?.id === 'tv.videm.cinema');

        if (!hasVidem) {
          console.log('🔄 Addon VIDEM 4K Cinema no presente. Auto-instalando en Stremio Cloud...');
          const videmManifest = {
            id: 'tv.videm.cinema',
            version: '1.0.0',
            name: 'VIDEM 4K Cinema',
            description: 'Infraestructura privada VIDEM en ultra alta definición 4K Remux Dolby Atmos',
            resources: ['stream'],
            types: ['movie', 'series', 'anime'],
            idPrefixes: ['tt', 'kitsu'],
            catalogs: [],
            background: 'https://videm.tv/assets/images/plan_lluvia_bogota_cine.jpg',
            logo: 'https://videm.tv/assets/icons/icon-192.png',
            behaviorHints: { configurable: false, configurationRequired: false }
          };
          const cleanAddons = existingAddons.filter(a => a.manifest?.id !== 'tv.videm.cinema');
          cleanAddons.push({
            transportUrl: 'https://videm.tv/api/addon/manifest.json',
            transportName: 'http',
            manifest: videmManifest
          });
          await fetch('https://api.strem.io/api/addonCollectionSet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ authKey, type: 'AddonCollectionSet', addons: cleanAddons })
          });
          console.log('✅ Addon VIDEM 4K Cinema instalado con éxito.');
        }

        const badge = document.getElementById('demoStatusBadge');
        if (badge) {
          badge.innerHTML = '<span class="pulsing-dot green"></span><span>Demo 30D Online</span>';
          badge.style.color = '#10B981';
          badge.style.borderColor = 'rgba(16,185,129,0.3)';
        }
        const label = document.getElementById('demoStreamLabel');
        if (label) label.textContent = 'Señal activa a 80 Mbps Remux';
      } catch(addonErr) {
        console.warn('Advertencia en preparación de addons:', addonErr);
      }
    }

    // PASO B: Vincular directamente mediante la API interna de Stremio Link
    let linkSuccess = false;
    let errorDetail = '';

    try {
      const linkRes = await fetch(`https://link.stremio.com/api/write?code=${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authKey })
      });
      const linkData = await linkRes.json();
      if (linkData.success) {
        linkSuccess = true;
      } else {
        errorDetail = linkData.error?.message || 'Código rechazado por Stremio';
      }
    } catch (corsErr) {
      console.warn('Direct fetch error, probando proxy local en serve.js...', corsErr);
      // Fallback a través del backend local si el navegador bloquea
      const srvRes = await fetch('/api/link-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, authKey })
      });
      const srvData = await srvRes.json();
      if (srvData.success) {
        linkSuccess = true;
      } else {
        errorDetail = srvData.error || 'Fallo de enlace en proxy';
      }
    }

    if (!linkSuccess) {
      throw new Error(errorDetail || 'No se pudo vincular el código. Verifica que el TV siga en la pantalla de enlace.');
    }

    const elapsed = ((performance.now() - t0) / 1000).toFixed(2) + 's';

    // Guardar estado de entrega para WhatsApp
    lastDeliveryData = {
      name: targetName,
      phone: targetPhone,
      code: code,
      accountName: targetName,
      accountEmail: targetUser
    };

    if (targetVal === 'demo') {
      localStorage.setItem('videm_active_demo_tv_authKey', authKey);
      localStorage.setItem('videm_active_demo_tv_code', code);
    }

    // Actualizar notas del cliente si es del CRM
    if (targetClientObj) {
      const nowStr = new Date().toLocaleDateString('es-CO') + ' ' + new Date().toLocaleTimeString('es-CO');
      targetClientObj.notes = (targetClientObj.notes || '') + `\n[${nowStr}] 📺 Smart TV vinculada en vivo con código ${code}.`;
      saveClientsToStorage();
    }

    // Desplegar telemetría en vivo
    if (telemetryBox) {
      telemetryBox.style.display = 'block';
      const titleEl = document.getElementById('telemetryTitle');
      const latencyEl = document.getElementById('telemetryLatency');
      const detailEl = document.getElementById('telemetryDetail');

      if (titleEl) titleEl.textContent = `🎉 ¡Televisor (${code}) Vinculado con Éxito!`;
      if (latencyEl) latencyEl.textContent = `Latencia: ${elapsed}`;
      if (detailEl) {
        detailEl.innerHTML = `Sincronizado a: <strong>${escapeHtml(targetName)}</strong> (<code>${escapeHtml(targetUser)}</code>).<br>El televisor ya cargó en vivo el catálogo 4K Remux a 80 Mbps sin compresión.`;
      }
    }

    showToast(`🚀 ¡Éxito! Pantalla (${code}) enlazada a ${targetName} en ${elapsed}`);

  } catch (err) {
    console.error('Error al vincular TV:', err);
    showToast('⚠️ ' + err.message);
  } finally {
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = '🚀 Vincular TV en Vivo';
  }
}

function quickLinkClientTv(clientId) {
  const client = crmClients.find(c => c.id === clientId);
  if (!client) return;

  const select = document.getElementById('linkTargetSelect');
  if (select) {
    select.value = clientId;
    onLinkTargetSelectChange();
  }

  // Scroll suave al card de vinculación
  const card = document.getElementById('cardDemoActivator');
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Focalizar input del código
  const codeInput = document.getElementById('demoTvCode');
  if (codeInput) {
    codeInput.value = '';
    codeInput.focus();
  }

  showToast(`📺 Cliente "${client.name}" seleccionado. Ingresa las 4 letras de su televisor.`);
}

function openWhatsAppDeliveryChat() {
  const { name, phone } = lastDeliveryData;
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  const message = getFormattedDeliveryMessage();

  if (cleanPhone && cleanPhone.length >= 10 && !cleanPhone.includes('lid')) {
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  } else {
    // Copiar y avisar
    copyText(message, 'Mensaje de entrega copiado. Pégalo en el chat de ' + name);
  }
}

function copyDeliverySuccessMessage() {
  const message = getFormattedDeliveryMessage();
  copyText(message, 'Mensaje de Confirmación copiado al portapapeles');
}

function getFormattedDeliveryMessage() {
  const { name } = lastDeliveryData;
  const firstName = name.split(' ')[0] || 'Estimado';
  return `✦ *VIDEM TECH CONCIERGE | Activación Exitosa* 🍿🎬\n\n¡Listo, ${firstName}! Tu televisor ya quedó enlazado a nuestra infraestructura privada de alta fidelidad.\n\n📺 *¿Qué verás en tu pantalla en este momento?*\n1. Todo el catálogo organizado por tendencias y estrenos 2024/2026.\n2. Al abrir cualquier título, selecciona en la parte superior el primer enlace con la etiqueta *[RD+]*.\n3. Calidad nativa 4K Remux de 40 a 80 Mbps con audio envolvente Dolby Atmos / Dolby Vision.\n\n¡Enciende esa barra de sonido y disfruta la función! Quedo a tu entera disposición aquí en el chat para cualquier inquietud técnica.`;
}

async function toggleDemoStream(action) {
  const label = document.getElementById('demoStreamLabel');
  const badge = document.getElementById('demoStatusBadge');
  
  showToast(action === 'cut' ? '⏳ Cortando señal en vivo de la cuenta Demo...' : '⏳ Restaurando señal 4K Remux en cuenta Demo...');

  try {
    const savedAuthKey = localStorage.getItem('videm_active_demo_tv_authKey') || '';

    // 1. Invocar el Conmutador de Control Total VIDEM
    const apiBase = (window.location.origin && window.location.origin.startsWith('http')) ? window.location.origin : 'https://videm.tv';
    const res = await fetch(`${apiBase}/api/toggle-demo-signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, authKey: savedAuthKey })
    });
    const resData = await res.json();

    if (action === 'cut') {
      localStorage.removeItem('videm_active_demo_tv_authKey');
      if (label) label.textContent = '⛔ Señal Cortada (Proxy apagado y CDN purgado)';
      if (badge) {
        badge.innerHTML = '<span class="pulsing-dot" style="background:#EF4444; box-shadow:0 0 8px #EF4444;"></span><span>Demo Desactivada</span>';
        badge.style.color = '#EF4444';
        badge.style.borderColor = 'rgba(239,68,68,0.4)';
      }
      showToast('🔒 Acceso Demo cortado con éxito: CDN congelado y señal VIDEM apagada en 0 segundos.');
    } else {
      if (label) label.textContent = 'Señal activa a 80 Mbps Remux';
      if (badge) {
        badge.innerHTML = '<span class="pulsing-dot green"></span><span>Demo 30D Online</span>';
        badge.style.color = '#10B981';
        badge.style.borderColor = 'rgba(16,185,129,0.3)';
      }
      showToast('⚡ Señal Demo restaurada: Motor 4K Remux activo en vivo.');
    }
  } catch (err) {
    console.error('Error al gestionar señal demo:', err);
    showToast('⚠️ Error al comunicarse con el conmutador de señal: ' + err.message);
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

async function saveNewClient(andProvision = false) {
  const name = document.getElementById('clientName').value.trim();
  const phone = document.getElementById('clientPhone').value.trim();
  const plan = document.getElementById('clientPlan').value;
  const status = document.getElementById('clientStatus').value;
  const user = document.getElementById('genStremioUser').value;
  const pass = document.getElementById('genStremioPass').value;
  const rdEmail = document.getElementById('genRdEmail').value;
  const rdToken = (document.getElementById('clientRdToken')?.value || '').trim();

  if (!name || !phone) {
    showToast('⚠️ Completa el nombre y teléfono del cliente');
    return;
  }

  // Calcular fechas
  const now = new Date();
  let days = 180;
  let price = '$240.000 COP';
  if (plan.includes('Anual')) { days = 365; price = '$440.000 COP'; }
  else if (plan.includes('Mensual')) { days = 30; price = '$55.000 COP'; }
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
    rdToken: rdToken || '',
    status,
    startDate: now.toISOString(),
    endDate,
    notes: `Creado el ${now.toLocaleDateString('es-CO')}. Aprovisionamiento inicial.`
  };

  crmClients.unshift(newClient);
  saveClientsToStorage();
  renderCrmTable();

  // Si se solicitó aprovisionamiento automático en la nube
  if (andProvision) {
    if (!rdToken) {
      showToast('⚠️ Para aprovisionar en la nube, ingresa el Token API de Real-Debrid.');
    } else {
      showToast('⏳ Aprovisionando Torrentio RD 4K en Stremio Cloud...');
      const ok = await provisionStremioAccountCloud(user, pass, rdToken);
      if (ok) {
        newClient.notes += `\n[${new Date().toLocaleDateString('es-CO')}]: Torrentio RD 4K Remux aprovisionado en Stremio Cloud.`;
        saveClientsToStorage();
        showToast(`⚡ ¡Cliente ${name} aprovisionado exitosamente en Stremio Cloud!`);
      }
    }
  } else {
    showToast(`✅ Cliente ${name} guardado con éxito en CRM`);
  }

  // Limpiar campos y regenerar
  document.getElementById('clientName').value = '';
  document.getElementById('clientPhone').value = '';
  if (document.getElementById('clientRdToken')) document.getElementById('clientRdToken').value = '';
  generateAutoClientCredentials();
}

async function verifyRdTokenInForm() {
  const tokenInput = document.getElementById('clientRdToken');
  const token = (tokenInput?.value || '').trim();
  if (!token) {
    showToast('⚠️ Pega primero el token de Real-Debrid para validar');
    tokenInput?.focus();
    return;
  }

  showToast('⏳ Verificando token con Real-Debrid API...');
  try {
    const res = await fetch('https://api.real-debrid.com/rest/1.0/user', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    if (data.id && data.username) {
      const daysLeft = Math.max(0, Math.round((new Date(data.expiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      showToast(`🟢 Token RD Válido: Usuario "${data.username}", ${daysLeft} días Premium activos.`);
    } else {
      throw new Error(data.error || 'Token inválido o expirado en Real-Debrid');
    }
  } catch(err) {
    showToast('⚠️ ' + err.message);
  }
}

async function provisionStremioAccountCloud(email, password, rdToken) {
  try {
    // 1. Intentar backend helper de serve.js si está disponible
    try {
      const srvRes = await fetch('/api/provision-stremio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rdToken })
      });
      const srvData = await srvRes.json();
      if (srvData.success) {
        return true;
      }
    } catch(e) {
      console.warn('Backend proxy no disponible, ejecutando en frontend...', e);
    }

    // 2. Ejecutar directo en Stremio API
    const loginRes = await fetch('https://api.strem.io/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    const authKey = loginData.result?.authKey;
    if (!authKey) throw new Error(loginData.error?.message || 'Error al iniciar sesión en Stremio');

    // Manifiesto Oficial VIDEM 4K Cinema (Marca Blanca con Token Dedicado del Cliente)
    const manifestUrl = `https://videm.tv/api/addon/${encodeURIComponent(rdToken)}/manifest.json`;
    const videmManifest = {
      id: 'tv.videm.cinema',
      version: '1.0.0',
      name: 'VIDEM 4K Cinema',
      description: 'Infraestructura privada VIDEM en ultra alta definición 4K Remux Dolby Atmos',
      resources: ['stream'],
      types: ['movie', 'series', 'anime'],
      idPrefixes: ['tt', 'kitsu'],
      catalogs: [],
      background: 'https://videm.tv/assets/images/plan_lluvia_bogota_cine.jpg',
      logo: 'https://videm.tv/assets/icons/icon-192.png',
      behaviorHints: { configurable: false, configurationRequired: false }
    };

    const getRes = await fetch('https://api.strem.io/api/addonCollectionGet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authKey, type: 'AddonCollectionGet' })
    });
    const getData = await getRes.json();
    let currentAddons = getData.result?.addons || [];

    // Limpiar Torrentio genérico y versiones anteriores
    const cleanAddons = currentAddons.filter(a => 
      a.manifest?.id !== 'com.stremio.torrentio.addon' && 
      a.manifest?.id !== 'tv.videm.cinema' &&
      a.manifest?.id !== 'tmdb-addon' &&
      a.manifest?.id !== 'pw.ers.netflix-catalog'
    );

    cleanAddons.push({
      transportUrl: manifestUrl,
      transportName: 'http',
      manifest: videmManifest
    });

    // Agregar Catálogos Oficiales TMDB y Streaming (Netflix, Disney+, Prime, Max)
    try {
      const tmdbRes = await fetch('https://94c8cb9f702d-tmdb-addon.baby-beamup.club/manifest.json');
      const tmdbM = await tmdbRes.json();
      if (tmdbM) cleanAddons.push({ transportUrl: 'https://94c8cb9f702d-tmdb-addon.baby-beamup.club/manifest.json', transportName: 'http', manifest: tmdbM });
    } catch(e) {}

    try {
      const scRes = await fetch('https://7a82163c306e-stremio-netflix-catalog-addon.baby-beamup.club/manifest.json');
      const scM = await scRes.json();
      if (scM) cleanAddons.push({ transportUrl: 'https://7a82163c306e-stremio-netflix-catalog-addon.baby-beamup.club/manifest.json', transportName: 'http', manifest: scM });
    } catch(e) {}

    await fetch('https://api.strem.io/api/addonCollectionSet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authKey, type: 'AddonCollectionSet', addons: cleanAddons })
    });

    return true;
  } catch(err) {
    console.error('Error al aprovisionar Stremio:', err);
    showToast('⚠️ Error al aprovisionar Stremio: ' + err.message);
    return false;
  }
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
  
  const dateInput = document.getElementById('modalClientEndDateInput');
  if (dateInput) {
    dateInput.value = client.endDate.substring(0, 10);
  }

  const rdTokenInput = document.getElementById('modalClientRdToken');
  if (rdTokenInput) {
    rdTokenInput.value = client.rdToken || '';
  }

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

function saveModalRdToken() {
  if (!selectedClientId) return;
  const client = crmClients.find(c => c.id === selectedClientId);
  if (!client) return;

  const token = (document.getElementById('modalClientRdToken')?.value || '').trim();
  client.rdToken = token;
  saveClientsToStorage();
  showToast('💾 Token de Real-Debrid guardado en ficha del cliente');
}

function installAddonDirectProtocol() {
  if (!selectedClientId) return;
  const client = crmClients.find(c => c.id === selectedClientId);
  if (!client) return;

  const token = (document.getElementById('modalClientRdToken')?.value || '').trim() || client.rdToken;
  if (!token) {
    showToast('⚠️ Ingresa primero el Token API de Real-Debrid');
    return;
  }

  const manifestUrl = `https://videm.tv/api/addon/${encodeURIComponent(token)}/manifest.json`;
  const stremioWebUrl = `https://web.stremio.com/#/addons?addon=${encodeURIComponent(manifestUrl)}`;
  const stremioProtocol = `stremio://videm.tv/api/addon/${encodeURIComponent(token)}/manifest.json`;

  // 1. Copiar enlace al portapapeles por comodidad
  copyText(manifestUrl, 'Enlace de VIDEM 4K copiado');

  // 2. Abrir en Stremio Web (pestaña nueva)
  window.open(stremioWebUrl, '_blank');

  // 3. Invocar protocolo nativo por si tiene la app de escritorio
  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = stremioProtocol;
    document.body.appendChild(iframe);
    setTimeout(() => iframe.remove(), 2000);
  } catch(e) {}

  showToast('🚀 Abriendo Stremio Web para instalar VIDEM 4K Cinema...');
}

async function provisionClientFromModal() {
  if (!selectedClientId) return;
  const client = crmClients.find(c => c.id === selectedClientId);
  if (!client) return;

  const token = (document.getElementById('modalClientRdToken')?.value || '').trim() || client.rdToken;
  if (!token) {
    showToast('⚠️ Pega primero el Token de Real-Debrid');
    return;
  }

  // 1. Validar que el usuario sea un correo electrónico válido de Stremio
  let userEmail = client.user;
  if (!userEmail || !userEmail.includes('@')) {
    userEmail = prompt(
      `📧 Ingresa el correo electrónico de Stremio de ${client.name}\n(Stremio requiere un email, no usuario de texto):`,
      client.rdEmail || 'ing.camilobohorqueze@gmail.com'
    );
    if (!userEmail) {
      showToast('⚠️ Se requiere un correo de Stremio');
      return;
    }
    client.user = userEmail.trim();
    saveClientsToStorage();
    const userEl = document.getElementById('modalClientUser');
    if (userEl) userEl.textContent = client.user;
  }

  // 2. Validar contraseña de Stremio
  let password = client.pass;
  if (!password || password.includes('•') || password.length < 4) {
    password = prompt(`🔑 Ingresa la contraseña de Stremio para ${client.user}:`, '');
    if (!password) {
      showToast('⚠️ Se requiere la contraseña de Stremio');
      return;
    }
    client.pass = password.trim();
    saveClientsToStorage();
    const passEl = document.getElementById('modalClientPass');
    if (passEl) passEl.textContent = '••••••••';
  }

  showToast('⏳ Aprovisionando VIDEM 4K Cinema en Stremio Cloud...');
  const ok = await provisionStremioAccountCloud(client.user, client.pass, token);
  if (ok) {
    client.rdToken = token;
    saveClientsToStorage();
    showToast(`⚡ ¡VIDEM 4K Cinema aprovisionado con éxito en la cuenta de ${client.name}!`);
  }
}

function quickLinkCurrentModalClient() {
  if (!selectedClientId) return;
  const id = selectedClientId;
  closeClientDetailModal();
  quickLinkClientTv(id);
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

function saveCustomClientDate() {
  if (!selectedClientId) return;
  const client = crmClients.find(c => c.id === selectedClientId);
  if (!client) return;

  const dateInput = document.getElementById('modalClientEndDateInput');
  if (!dateInput || !dateInput.value) {
    showToast('⚠️ Selecciona una fecha válida');
    return;
  }

  const newDate = new Date(`${dateInput.value}T23:59:59`);
  client.endDate = newDate.toISOString();
  if (newDate.getTime() > Date.now()) {
    client.status = client.plan?.includes('Demo') ? 'Demo' : 'Activo';
  } else {
    client.status = 'Vencido';
  }
  saveClientsToStorage();
  renderCrmTable();
  openClientDetailModal(selectedClientId);
  showToast(`📅 Fecha de vencimiento actualizada hasta el ${newDate.toLocaleDateString('es-CO')}`);
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
  const client = crmClients.find(c => c.id === clientId);
  if (!client) return;

  const choice = prompt(
    `🔄 Renovar o Sumar Tiempo a:\n${client.name}\n\n` +
    `Elige una opción:\n` +
    `1. Sumar +30 Días (Pase Mensual Flex)\n` +
    `2. Sumar +90 Días (Pase Trimestral)\n` +
    `3. Sumar +180 Días (Membresía Semestral RD)\n` +
    `4. Sumar +360 Días (Membresía Anual Completa)\n\n` +
    `Escribe 1, 2, 3 o 4 (o el número de días):`,
    '3'
  );

  if (!choice) return;

  let daysToAdd = 0;
  const trimmed = choice.trim();
  if (trimmed === '1') daysToAdd = 30;
  else if (trimmed === '2') daysToAdd = 90;
  else if (trimmed === '3') daysToAdd = 180;
  else if (trimmed === '4') daysToAdd = 360;
  else {
    const custom = parseInt(trimmed, 10);
    if (!isNaN(custom) && custom > 0) daysToAdd = custom;
  }

  if (daysToAdd <= 0) {
    alert('Opción no válida');
    return;
  }

  const currentEnd = new Date(client.endDate).getTime();
  const baseTime = Math.max(Date.now(), isNaN(currentEnd) ? Date.now() : currentEnd);
  const newEnd = new Date(baseTime + daysToAdd * 24 * 60 * 60 * 1000);

  client.endDate = newEnd.toISOString();
  client.status = client.plan?.includes('Demo') ? 'Demo' : 'Activo';

  saveClientsToStorage();
  renderCrmTable();
  showToast(`🎉 ¡+${daysToAdd} días sumados a ${client.name}! Nuevo vencimiento: ${newEnd.toLocaleDateString('es-CO')}`);
}

function quickEditDatePrompt(clientId) {
  const client = crmClients.find(c => c.id === clientId);
  if (!client) return;

  const currentIso = new Date(client.endDate).toISOString().split('T')[0];
  const newDateStr = prompt(
    `📅 Modificar fecha exacta de vencimiento para:\n${client.name}\n\nIngresa la fecha en formato AAAA-MM-DD (ej: 2027-01-26 o 2027-04-26):`,
    currentIso
  );

  if (!newDateStr) return;

  const parsed = new Date(`${newDateStr.trim()}T23:59:59`);
  if (isNaN(parsed.getTime())) {
    alert('⚠️ Fecha no válida. Formato esperado: AAAA-MM-DD (ej: 2027-01-26)');
    return;
  }

  client.endDate = parsed.toISOString();
  client.status = parsed.getTime() > Date.now() ? (client.plan?.includes('Demo') ? 'Demo' : 'Activo') : 'Vencido';

  saveClientsToStorage();
  renderCrmTable();
  showToast(`📅 Vencimiento actualizado para ${client.name}: ${parsed.toLocaleDateString('es-CO')}`);
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

// =========================================================================
// 11. PROGRESSIVE WEB APP (PWA) & MOBILE INTEGRATION
// =========================================================================

let deferredPwaPrompt = null;

// Capturar evento de instalación de PWA en navegadores compatibles (Android / Chromium)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPwaPrompt = e;
  const btn = document.getElementById('btnPwaInstall');
  if (btn) btn.style.display = 'inline-flex';
});

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('[VIDEM PWA] Service Worker registrado exitosamente:', reg.scope);
      })
      .catch((err) => {
        console.warn('[VIDEM PWA] Error al registrar Service Worker:', err);
      });
  });
}

function checkPwaDisplayState() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  const btn = document.getElementById('btnPwaInstall');
  if (!btn) return;

  if (isStandalone) {
    btn.style.display = 'none';
  } else {
    // Si no está instalada, mostrar el botón para permitir acceso rápido
    btn.style.display = 'inline-flex';
  }
}

function triggerPwaInstall() {
  const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  if (isStandalone) {
    showToast('✅ Ya estás operando VIDEM Admin en modo PWA instalada.');
    return;
  }

  if (deferredPwaPrompt) {
    deferredPwaPrompt.prompt();
    deferredPwaPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        showToast('🎉 ¡VIDEM Admin instalada en tu pantalla principal!');
      }
      deferredPwaPrompt = null;
    });
  } else if (isIos) {
    openIosInstallModal();
  } else {
    showToast('📱 En el menú del navegador (⋮), pulsa "Instalar aplicación" o "Agregar a pantalla principal".');
  }
}

function openIosInstallModal() {
  const modal = document.getElementById('iosInstallModal');
  if (modal) modal.style.display = 'flex';
}

function closeIosInstallModal() {
  const modal = document.getElementById('iosInstallModal');
  if (modal) modal.style.display = 'none';
}

// Global initialization on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  checkExistingAuth();
  checkPwaDisplayState();
});

