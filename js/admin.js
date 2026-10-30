/**
 * VIDEM OPERATIONS DASHBOARD & CRM
 * Executive Concierge Control System
 */

// Master Password List (Acepta la clave oficial o variantes cómodas)
const MASTER_PASSWORDS = ['VidemAdmin2026!', 'videm2026', 'camilo2026', 'admin'];

// Storage Keys
const STORAGE_AUTH_KEY = 'videm_admin_authenticated_v1';
const STORAGE_CLIENTS_KEY = 'videm_admin_crm_clients_v4';

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
      plan: 'Pase Mensual Flex',
      price: '$50.000 COP',
      user: 'vip.9299@videm.tv',
      pass: 'Videm4K.9299!',
      rdEmail: 'ing.camilobohorquez.e@gmail.com',
      status: 'Activo',
      startDate: '2026-10-26T19:00:00',
      endDate: '2026-11-26T23:59:59',
      notes: 'Samsung Q60 Series 55 pulgadas QLED. Pago verificado de $50.000 COP (Pase Mensual Flex 30 días). Enlace 4K Remux activo.'
    }
  ];
  saveClientsToStorage();
}

function loadClientsFromStorage() {
  // Limpiar versiones obsoletas de almacenamiento local si existen
  ['videm_admin_crm_clients_v1', 'videm_admin_crm_clients_v2', 'videm_admin_crm_clients_v3'].forEach(k => localStorage.removeItem(k));

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

  // Auto-corrección / migración forzada para que coincidan con la realidad operativa
  let needsSave = false;

  // 1. Corregir cuenta de Camilo si tiene fecha vieja de 2028 (539 días)
  const camiloAcc = crmClients.find(c => c.id === 'cli-001');
  if (camiloAcc && (new Date(camiloAcc.endDate).getFullYear() > 2026 || camiloAcc.plan.includes('Anual'))) {
    camiloAcc.name = 'Camilo Andrés Bohórquez (Línea Personal RD)';
    camiloAcc.plan = 'Membresía Personal (Por Renovar)';
    camiloAcc.price = '16 € (~$72.000 COP)';
    camiloAcc.user = 'cbohorquez1983';
    camiloAcc.pass = '••••••••';
    camiloAcc.rdEmail = 'ing.camilo.bohorqueze@gmail.com';
    camiloAcc.status = 'Activo';
    camiloAcc.startDate = '2026-04-27T00:00:00';
    camiloAcc.endDate = '2026-10-27T23:59:59';
    camiloAcc.notes = 'Cuenta principal personal en Real-Debrid. Vence mañana martes 27 de Octubre a medianoche. Al renovar con 180 días, darle clic a 🔄 para extender.';
    needsSave = true;
  }

  // 2. Corregir cuenta de John Bedoya a su plan real de 1 Mes (30 días) pagado hoy
  const johnAcc = crmClients.find(c => c.id === 'cli-003');
  if (johnAcc && (johnAcc.status === 'Pendiente' || johnAcc.plan.includes('Semestral') || new Date(johnAcc.endDate).getFullYear() > 2026)) {
    johnAcc.name = 'John Bedoya (Vecino Conjunto)';
    johnAcc.phone = '160399999680633@lid';
    johnAcc.plan = 'Pase Mensual Flex';
    johnAcc.price = '$50.000 COP';
    johnAcc.status = 'Activo';
    johnAcc.user = 'vip.9299@videm.tv';
    johnAcc.pass = 'Videm4K.9299!';
    johnAcc.rdEmail = 'ing.camilobohorquez.e@gmail.com';
    johnAcc.startDate = '2026-10-26T19:00:00';
    johnAcc.endDate = '2026-11-26T23:59:59';
    johnAcc.notes = 'Samsung Q60 Series 55 pulgadas QLED. Pago verificado de $50.000 COP (Pase Mensual Flex 30 días). Enlace 4K Remux activo.';
    needsSave = true;
  }

  if (needsSave) {
    saveClientsToStorage();
  }
}

function resetToRealDates() {
  seedDefaultClients();
  renderCrmTable();
  showToast('✅ Fechas reales sincronizadas: Camilo vence mañana (27 Oct), John Bedoya vence el 26 Nov.');
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
  
  showToast(action === 'cut' ? '⏳ Cortando señal remota de la cuenta Demo...' : '⏳ Restaurando señal 4K Remux en cuenta Demo...');

  try {
    // 1. Obtener credenciales de la cuenta Demo desde el registro CRM
    const demoAccount = crmClients.find(c => c.id === 'cli-002') || {};
    const stremioUser = demoAccount.user || 'vip.8294@videm.tv';
    const stremioPass = demoAccount.pass || 'Videm4K.8294!';
    const rdToken = demoAccount.rdToken || '76N4SFYLKTKDADDLDIAGR6MDKCG7VQT2FMEGTQDQM3X5U2PFU6QQ';
    const torrentioManifestUrl = `https://torrentio.strem.fun/language=latino%7Cqualityfilter=cam,scr%7Cdebridoptions=nodownloadlinks%7Crealdebrid=${rdToken}/manifest.json`;

    // 2. Iniciar sesión en Stremio API
    const loginRes = await fetch('https://api.strem.io/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: stremioUser, password: stremioPass })
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
      const mRes = await fetch(torrentioManifestUrl);
      const manifest = await mRes.json();
      const torrentioAddon = {
        transportUrl: torrentioManifestUrl,
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

    const manifestUrl = `https://torrentio.strem.fun/language=latino%7Cqualityfilter=cam,scr%7Cdebridoptions=nodownloadlinks%7Crealdebrid=${rdToken}/manifest.json`;
    const mRes = await fetch(manifestUrl);
    const manifest = await mRes.json();

    const getRes = await fetch('https://api.strem.io/api/addonCollectionGet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authKey, type: 'AddonCollectionGet' })
    });
    const getData = await getRes.json();
    let currentAddons = getData.result?.addons || [];

    const cleanAddons = currentAddons.filter(a => a.manifest?.id !== 'com.stremio.torrentio.addon');
    cleanAddons.push({
      transportUrl: manifestUrl,
      transportName: 'http',
      manifest
    });

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

async function provisionClientFromModal() {
  if (!selectedClientId) return;
  const client = crmClients.find(c => c.id === selectedClientId);
  if (!client) return;

  const token = (document.getElementById('modalClientRdToken')?.value || '').trim() || client.rdToken;
  if (!token) {
    showToast('⚠️ Pega primero el Token de Real-Debrid');
    return;
  }

  showToast('⏳ Aprovisionando Torrentio RD 4K en Stremio Cloud...');
  const ok = await provisionStremioAccountCloud(client.user, client.pass, token);
  if (ok) {
    client.rdToken = token;
    client.notes = (client.notes || '') + `\n[${new Date().toLocaleDateString('es-CO')}]: Torrentio RD 4K Remux aprovisionado en Stremio Cloud.`;
    saveClientsToStorage();
    document.getElementById('modalClientNotes').value = client.notes;
    showToast(`⚡ ¡${client.name} aprovisionado exitosamente en Stremio Cloud!`);
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

