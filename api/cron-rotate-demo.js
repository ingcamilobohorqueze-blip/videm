const https = require('https');

const SUPABASE_URL = 'https://crkkakwpiggnbuwqopsc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNya2tha3dwaWdnbmJ1d3FvcHNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzQzNTg3MSwiZXhwIjoyMTA5MDExODcxfQ.n4yTSUUIC4QL-_UKPJSs2qvPwCNJVoFcf-kbZqEpRo4';

const EVOLUTION_API_URL = 'https://evolution-api-production-8353.up.railway.app';
const EVOLUTION_API_KEY = 'levanna-wa-key-2024';
const EVOLUTION_INSTANCE = 'VidemProd';

const DEMO_EMAIL = 'vip.8294@videm.tv';
const DEMO_PASS = 'Videm4K.8294**';

function supabaseRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    const postData = body ? JSON.stringify(body) : null;
    const req = https.request(url, {
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, raw: data }); }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function sendWhatsApp(phone, text) {
  return new Promise((resolve) => {
    const cleanPhone = String(phone).replace(/[^0-9]/g, '');
    const data = JSON.stringify({
      number: cleanPhone,
      text: text,
      delay: 1000,
      presence: 'composing'
    });
    const req = https.request(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve(b));
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.write(data);
    req.end();
  });
}

async function getStremioAuthKey() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASS });
    const req = https.request('https://api.strem.io/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(b);
          if (json.result?.authKey) resolve(json.result.authKey);
          else reject(new Error('Login falló'));
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function linkStremioTvCode(code, authKey) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ authKey });
    const req = https.request(`https://link.stremio.com/api/write?code=${encodeURIComponent(code)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(b);
          if (parsed.success) resolve(parsed);
          else reject(new Error(parsed.error?.message || 'Error vinculando'));
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const VIDEM_MANIFEST = {
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

const TMDB_URL = 'https://94c8cb9f702d-tmdb-addon.baby-beamup.club/manifest.json';
const STREAMCAT_URL = 'https://7a82163c306e-stremio-netflix-catalog-addon.baby-beamup.club/manifest.json';

function fetchRemoteJson(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve(JSON.parse(b)); }
        catch(e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

async function ensureDemoAddons(authKey) {
  try {
    const existing = await new Promise((resolve) => {
      const p = JSON.stringify({ authKey, type: 'AddonCollectionGet' });
      const req = https.request('https://api.strem.io/api/addonCollectionGet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(p) }
      }, (r) => {
        let b = '';
        r.on('data', c => b += c);
        r.on('end', () => {
          try { resolve(JSON.parse(b).result?.addons || []); }
          catch(e) { resolve([]); }
        });
      });
      req.on('error', () => resolve([]));
      req.write(p);
      req.end();
    });

    const hasVidem = existing.some(a => a.manifest?.id === 'tv.videm.cinema');
    const hasTmdb = existing.some(a => a.manifest?.id === 'tmdb-addon');
    const hasStreamCat = existing.some(a => a.manifest?.id === 'pw.ers.netflix-catalog');

    if (!hasVidem || !hasTmdb || !hasStreamCat) {
      let clean = existing.filter(a => 
        a.manifest?.id !== 'com.stremio.torrentio.addon' &&
        a.manifest?.id !== 'tv.videm.cinema' &&
        a.manifest?.id !== 'tmdb-addon' &&
        a.manifest?.id !== 'pw.ers.netflix-catalog'
      );

      clean.push({
        transportUrl: 'https://videm.tv/api/addon/manifest.json',
        transportName: 'http',
        manifest: VIDEM_MANIFEST
      });

      const tmdbM = await fetchRemoteJson(TMDB_URL);
      if (tmdbM) {
        clean.push({ transportUrl: TMDB_URL, transportName: 'http', manifest: tmdbM });
      }

      const streamM = await fetchRemoteJson(STREAMCAT_URL);
      if (streamM) {
        clean.push({ transportUrl: STREAMCAT_URL, transportName: 'http', manifest: streamM });
      }

      await new Promise((resolve) => {
        const p = JSON.stringify({ authKey, type: 'AddonCollectionSet', addons: clean });
        const req = https.request('https://api.strem.io/api/addonCollectionSet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(p) }
        }, (r) => {
          let b = '';
          r.on('data', c => b += c);
          r.on('end', resolve);
        });
        req.on('error', resolve);
        req.write(p);
        req.end();
      });
    }
  } catch(e) {
    console.warn('ensureDemoAddons warning:', e.message);
  }
}

module.exports = async (req, res) => {
  try {
    const now = new Date();

    // 1. Buscar sesiones activas vencidas
    const expRes = await supabaseRequest('/rest/v1/demo_sessions?status=eq.active&scheduled_end=lte.' + now.toISOString());
    const expiredSessions = expRes.data || [];

    for (const s of expiredSessions) {
      // Marcar completada
      await supabaseRequest(`/rest/v1/demo_sessions?id=eq.${s.id}`, 'PATCH', { status: 'completed' });
      await supabaseRequest(`/rest/v1/users?phone=eq.${s.user_phone}`, 'PATCH', { status: 'demo_expired' });

      // Mensaje de cierre y oferta comercial
      const followUpMsg = [
        "🍿 *¡Esperamos que hayas disfrutado tu experiencia VIDEM!* 🎬",
        "",
        "Tu pase de cortesía de 2 horas ha finalizado con éxito. ¿Pudiste comprobar la diferencia de nitidez del 4K Remux y el sonido envolvente?",
        "",
        "💡 *Activa tu Membresía VIP Oficial para continuar sin interrupciones:*",
        "• *Pase Mensual (1 Mes):* $55.000 COP",
        "• *Membresía Semestral (6 Meses):* $240.000 COP _(Ahorras $90.000)_",
        "• *Membresía Anual (12 Meses):* $440.000 COP _(Máximo ahorro)_",
        "",
        "Escríbeme por aquí si deseas activar tu acceso permanente hoy mismo. ¡Feliz día! 👋"
      ].join("\n");

      await sendWhatsApp(s.user_phone, followUpMsg);
    }

    // 2. Si no hay ninguna sesión activa ahora, activar al siguiente en cola
    const curActiveRes = await supabaseRequest('/rest/v1/demo_sessions?status=eq.active&scheduled_end=gt.' + now.toISOString());
    const currentActive = curActiveRes.data || [];

    if (currentActive.length === 0) {
      const nextRes = await supabaseRequest('/rest/v1/demo_sessions?status=eq.queued&order=scheduled_start.asc&limit=1');
      const nextSession = nextRes.data && nextRes.data[0];

      if (nextSession) {
        const newStart = now;
        const newEnd = new Date(now.getTime() + (2 * 60 * 60 * 1000));

        // Purgar streams CDN anteriores en Real-Debrid para evitar conflicto de múltiples IPs
        try {
          const rdRes = await new Promise((resolve) => {
            https.get('https://api.real-debrid.com/rest/1.0/downloads', {
              headers: { 'Authorization': 'Bearer ' + DEMO_RD_TOKEN }
            }, (r) => {
              let d = '';
              r.on('data', c => d += c);
              r.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve([]); } });
            }).on('error', () => resolve([]));
          });
          if (Array.isArray(rdRes)) {
            for (const item of rdRes) {
              await new Promise((resolve) => {
                const dReq = https.request('https://api.real-debrid.com/rest/1.0/downloads/delete/' + item.id, {
                  method: 'DELETE',
                  headers: { 'Authorization': 'Bearer ' + DEMO_RD_TOKEN }
                }, resolve);
                dReq.on('error', resolve);
                dReq.end();
              });
            }
          }
        } catch(e) {}

        // Marcar la sesión en cola como notificada
        await supabaseRequest(`/rest/v1/demo_sessions?id=eq.${nextSession.id}`, 'PATCH', {
          status: 'ready_for_code'
        });

        // Notificar por WhatsApp para que envíe su código fresco
        const readyMsg = [
          "🎉 *¡LLEGÓ TU TURNO VIP EN VIDEM!* 📺🍿",
          "",
          "Tenemos una línea 4K Remux de alta velocidad disponible para tu pantalla.",
          "",
          "Para activar tus 2 horas completas de cortesía:",
          "1️⃣ Enciende tu televisor y abre la app *Stremio*.",
          "2️⃣ Escríbeme aquí el código de 4 letras que ves en tu pantalla (ej: ABCD o 9K4X).",
          "",
          "¡En cuanto lo envíes, tu televisor quedará sincronizado en 10 segundos! 🎬"
        ].join("\n");

        await sendWhatsApp(nextSession.user_phone, readyMsg);
      }
    }

    res.status(200).json({ success: true, processedExpired: expiredSessions.length });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
};
