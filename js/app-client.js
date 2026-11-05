/**
 * VIDEM VIP Client App Logic
 */

let activeClient = null;
let deferredPrompt = null;

// PWA Install Prompt Handler
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const banner = document.getElementById('pwaInstallBanner');
  if (banner) banner.style.display = 'flex';
});

function triggerPwaInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        const banner = document.getElementById('pwaInstallBanner');
        if (banner) banner.style.display = 'none';
      }
      deferredPrompt = null;
    });
  }
}

// Session Initialization
document.addEventListener('DOMContentLoaded', () => {
  // Parse query parameters (ej. ?vip=9299 o ?activar=1)
  const urlParams = new URLSearchParams(window.location.search);
  const vipParam = urlParams.get('vip') || urlParams.get('user');
  const activarParam = urlParams.get('activar');

  if (vipParam) {
    const userField = document.getElementById('clientUser');
    if (userField) userField.value = vipParam;
    const actUserField = document.getElementById('actUser');
    if (actUserField) actUserField.value = vipParam;
  }

  if (activarParam) {
    openActivationModal();
  }

  const saved = localStorage.getItem('videm_client_session_v1');
  if (saved) {
    try {
      activeClient = JSON.parse(saved);
      showClientDashboard();
    } catch (e) {
      localStorage.removeItem('videm_client_session_v1');
      showLoginView();
    }
  } else {
    showLoginView();
  }

  // Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
});

// View Toggles
function showLoginView() {
  document.getElementById('loginSection').style.display = 'block';
  document.getElementById('clientDashboardSection').style.display = 'none';
  document.getElementById('userLogoutBtn').style.display = 'none';
}

function showClientDashboard() {
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('clientDashboardSection').style.display = 'block';
  document.getElementById('userLogoutBtn').style.display = 'inline-flex';

  // Render client details
  document.getElementById('clientName').textContent = activeClient.name || 'Cinépfilo VIP';
  document.getElementById('clientPlanBadge').textContent = activeClient.plan || 'Pase 4K Remux';
  document.getElementById('statStatus').textContent = activeClient.status === 'Demo' ? 'Pase Demo Activo' : 'Membresía Activa';
  
  if (activeClient.endDate) {
    const end = new Date(activeClient.endDate);
    document.getElementById('statRenewal').textContent = end.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Pre-load default popular search
  searchVaultTitles('Acción');
}

// Authentication Flow
async function handleClientLogin(e) {
  if (e) e.preventDefault();
  const userInput = document.getElementById('clientUser').value.trim();
  const passInput = document.getElementById('clientPass').value.trim();
  const errEl = document.getElementById('loginErrorMsg');
  const btn = document.getElementById('btnLoginSubmit');

  errEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Autenticando sala privada...';

  try {
    const res = await fetch('/api/client-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', user: userInput, pin: passInput })
    });
    const data = await res.json();

    if (data.success && data.client) {
      activeClient = data.client;
      localStorage.setItem('videm_client_session_v1', JSON.stringify(activeClient));
      showClientDashboard();
    } else {
      errEl.textContent = data.error || 'PIN o credenciales incorrectas.';
      errEl.style.display = 'block';
    }
  } catch (err) {
    errEl.textContent = 'Error de conexión con el servidor VIDEM.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Entrar a mi Sala Privada</span>';
  }
}

// WhatsApp Forgot PIN handler
function handleForgotPin() {
  const user = (document.getElementById('clientUser')?.value || '').trim();
  const msg = user
    ? `Hola VIDEM VIP, olvidé el PIN de mi sala privada de cine 4K (Mi usuario: ${user}). ¿Me ayudas a recuperarlo por favor?`
    : `Hola VIDEM VIP, olvidé el PIN de mi sala privada de cine 4K. ¿Me ayudas a restablecerlo por favor?`;
  window.open(`https://wa.me/573015568904?text=${encodeURIComponent(msg)}`, '_blank');
}

// Activation Modal Controls
function openActivationModal() {
  const modal = document.getElementById('activationModal');
  if (modal) {
    modal.style.display = 'flex';
    const currentVal = document.getElementById('clientUser')?.value.trim();
    if (currentVal && !document.getElementById('actUser').value) {
      document.getElementById('actUser').value = currentVal;
    }
  }
}

function closeActivationModal() {
  const modal = document.getElementById('activationModal');
  if (modal) modal.style.display = 'none';
}

async function handleActivationSubmit(e) {
  if (e) e.preventDefault();
  const actUser = document.getElementById('actUser').value.trim();
  const actPhone = document.getElementById('actPhone').value.trim();
  const actPin = document.getElementById('actPin').value.trim();
  const errEl = document.getElementById('actErrorMsg');
  const succEl = document.getElementById('actSuccessMsg');
  const btn = document.getElementById('btnActSubmit');

  errEl.style.display = 'none';
  succEl.style.display = 'none';

  if (!/^\d{4}$/.test(actPin)) {
    errEl.textContent = 'El PIN debe ser de 4 dígitos numéricos (ej. 1234).';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Guardando y vinculando...';

  try {
    const res = await fetch('/api/client-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'activate',
        user: actUser,
        phone: actPhone,
        pin: actPin
      })
    });
    const data = await res.json();

    if (data.success && data.client) {
      succEl.textContent = '¡PIN guardado! Entrando a tu sala...';
      succEl.style.display = 'block';
      activeClient = data.client;
      localStorage.setItem('videm_client_session_v1', JSON.stringify(activeClient));

      setTimeout(() => {
        closeActivationModal();
        showClientDashboard();
      }, 1000);
    } else {
      errEl.textContent = data.error || 'No se pudo vincular la cuenta.';
      errEl.style.display = 'block';
    }
  } catch (err) {
    errEl.textContent = 'Error de conexión con el servidor VIDEM.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Guardar PIN y Entrar a la Sala</span>';
  }
}

function handleClientLogout() {
  localStorage.removeItem('videm_client_session_v1');
  activeClient = null;
  showLoginView();
}

// Smart TV Link Flow
async function handleLinkTvDevice() {
  const codeInput = document.getElementById('tvCodeInput');
  const code = (codeInput?.value || '').trim();
  const feedback = document.getElementById('tvLinkFeedback');
  const btn = document.getElementById('btnLinkTvSubmit');

  if (!code || code.length < 4) {
    feedback.textContent = '⚠️ Ingresa el código completo que ves en tu televisor.';
    feedback.style.color = 'var(--warning)';
    feedback.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Enlazando Smart TV...';
  feedback.style.display = 'none';

  try {
    // 1. Obtener authKey de la cuenta Stremio del cliente
    let authKey = null;
    const loginRes = await fetch('https://api.strem.io/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: activeClient.user, password: activeClient.pass || 'Videm4K.9299!' })
    });
    const loginData = await loginRes.json();
    authKey = loginData.result?.authKey;

    if (!authKey) {
      // Fallback a login maestro demo si es cuenta cortesía
      const demoLog = await fetch('https://api.strem.io/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'vip.8294@videm.tv', password: 'Videm4K.8294**' })
      });
      const dLogData = await demoLog.json();
      authKey = dLogData.result?.authKey;
    }

    // 2. Enviar a /api/link-device
    const linkRes = await fetch('/api/link-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        authKey,
        isDemo: activeClient.status === 'Demo',
        phone: activeClient.phone
      })
    });
    const linkData = await linkRes.json();

    if (linkData.success) {
      feedback.textContent = '🎉 ¡Televisor enlazado con éxito! Tu pantalla ya tiene el estándar 4K Remux activo.';
      feedback.style.color = 'var(--success)';
      feedback.style.display = 'block';
      codeInput.value = '';
    } else {
      feedback.textContent = '❌ ' + (linkData.error || 'Código rechazado o expirado.');
      feedback.style.color = 'var(--danger)';
      feedback.style.display = 'block';
    }
  } catch (e) {
    feedback.textContent = '❌ Error de sincronización. Escribe a tu Conserje para asistencia.';
    feedback.style.color = 'var(--danger)';
    feedback.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Vincular Televisor Ahora';
  }
}

// Vault Title Search & Injection
let searchDebounce = null;
function handleVaultSearchInput(e) {
  clearTimeout(searchDebounce);
  const q = e.target.value.trim();
  if (q.length < 2) return;
  searchDebounce = setTimeout(() => searchVaultTitles(q), 450);
}

async function searchVaultTitles(query) {
  const container = document.getElementById('vaultResultsContainer');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center; padding: 18px; color: var(--text-dim);">🔍 Buscando en catálogo en español...</div>';

  try {
    const res = await fetch(`/api/request-title?action=search&query=${encodeURIComponent(query)}`);
    const data = await res.json();
    const results = data.results || [];

    if (results.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding: 18px; color: var(--text-muted);">No encontramos coincidencias exactas. Puedes escribir el nombre completo para pedirlo a tu Conserje.</div>';
      return;
    }

    container.innerHTML = results.map(item => `
      <div class="vault-item-card">
        <img src="${item.poster}" alt="${item.title}" class="vault-poster" loading="lazy">
        <div class="vault-info">
          <div class="vault-title">${item.title}</div>
          <div class="vault-meta">
            <span>📅 ${item.year || 'Estreno'}</span>
            <span>⭐ ${item.rating}</span>
            <span>${item.type === 'series' ? '📺 Serie' : '🎬 Película'}</span>
          </div>
          <button class="btn-inject-title" onclick="requestTitleToVault('${item.tmdbId}', '${item.type}', '${item.title.replace(/'/g, "\\'")}')">
            <span>⚡ Añadir a mi TV</span>
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<div style="text-align:center; padding: 18px; color: var(--danger);">Error cargando catálogo.</div>';
  }
}

async function requestTitleToVault(tmdbId, type, titleName) {
  const toast = document.getElementById('vaultToast');
  showAppToast(`⏳ Procesando "${titleName}" en tu Bóveda Privada...`);

  try {
    const res = await fetch('/api/request-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'request_vault',
        tmdbId,
        type,
        titleName,
        rdToken: activeClient?.rdToken
      })
    });
    const data = await res.json();

    if (data.success) {
      showAppToast(data.message || `🎉 "${titleName}" quedó disponible en tu Smart TV.`);
    } else {
      showAppToast('⚠️ ' + (data.error || 'No se pudo procesar automáticamente. Conserje notificado.'));
    }
  } catch (e) {
    showAppToast('⚠️ Solicitud enviada a tu Conserje vía WhatsApp.');
  }
}

function showAppToast(msg) {
  let toast = document.getElementById('appToastEl');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appToastEl';
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = 'rgba(6, 8, 13, 0.95)';
    toast.style.border = '1px solid var(--accent-cyan)';
    toast.style.color = '#fff';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '12px';
    toast.style.fontSize = '0.85rem';
    toast.style.fontWeight = '600';
    toast.style.zIndex = '9999';
    toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    toast.style.maxWidth = '90%';
    toast.style.textAlign = 'center';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 4500);
}

