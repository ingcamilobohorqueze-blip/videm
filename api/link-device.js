const https = require('https');

const SUPABASE_URL = 'https://crkkakwpiggnbuwqopsc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNya2tha3dwaWdnbmJ1d3FvcHNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzQzNTg3MSwiZXhwIjoyMTA5MDExODcxfQ.n4yTSUUIC4QL-_UKPJSs2qvPwCNJVoFcf-kbZqEpRo4';
const DEMO_PHONE = '573015568904';
const DEMO_EMAIL = 'vip.8294@videm.tv';

const VIDEM_MANIFEST = {
  id: 'tv.videm.cinema',
  version: '1.7.5',
  name: 'VIDEM 4K Cinema',
  description: 'Infraestructura privada VIDEM en ultra alta definición 4K Remux Dolby Atmos (Audio Latino, Subtítulos Sincronizados, Smart TV Friendly & Metadatos Actualizados)',
  resources: [
    'stream',
    'subtitles',
    { name: 'meta', types: ['series', 'movie'], idPrefixes: ['tt'] }
  ],
  types: ['movie', 'series', 'anime'],
  idPrefixes: ['tt', 'kitsu', 'tmdb:'],
  catalogs: [],
  background: 'https://videm.tv/assets/images/hero-home-theater.jpeg',
  logo: 'https://videm.tv/assets/icons/icon-192.png',
  behaviorHints: { configurable: false, configurationRequired: false }
};

function stremioApiPost(endpoint, payload) {
  return new Promise((resolve) => {
    const p = JSON.stringify(payload);
    const req = https.request(`https://api.strem.io/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(p) }
    }, (r) => {
      let b = '';
      r.on('data', c => b += c);
      r.on('end', () => {
        try { resolve(JSON.parse(b)); }
        catch (e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(6000, () => {
      req.destroy();
      resolve(null);
    });
    req.write(p);
    req.end();
  });
}

// Limpia por completo "Seguir viendo" y "Biblioteca" EXCLUSIVAMENTE en la cuenta Demo oficial (vip.8294@videm.tv).
// Doble candado de seguridad: verifica por API getUser que el authKey pertenezca al correo Demo antes de tocar nada.
async function clearDemoLibrary(authKey) {
  try {
    const userRes = await stremioApiPost('getUser', { authKey });
    const accountEmail = String(userRes?.result?.email || '').trim().toLowerCase();
    if (accountEmail !== DEMO_EMAIL) {
      // Nunca tocar cuentas VIP ni ninguna cuenta que no sea la Demo oficial
      return { skipped: true, reason: 'not_demo_account' };
    }

    const libRes = await stremioApiPost('datastoreGet', {
      authKey,
      collection: 'libraryItem',
      all: true
    });
    const items = Array.isArray(libRes?.result) ? libRes.result : [];
    const nowIso = new Date().toISOString();

    const toClear = items.filter(it =>
      it && it._id && (
        !it.removed ||
        !it.temp ||
        (it.state && (it.state.timeOffset > 0 || it.state.video_id || it.state.lastWatched || it.state.timeWatched > 0 || it.state.flaggedWatched > 0))
      )
    );

    if (toClear.length === 0) {
      return { skipped: false, cleared: 0 };
    }

    const changes = toClear.map(it => ({
      ...it,
      removed: true,
      temp: true,
      _mtime: nowIso,
      state: {
        ...(it.state || {}),
        lastWatched: '',
        timeWatched: 0,
        timeOffset: 0,
        overallTimeWatched: 0,
        timesWatched: 0,
        flaggedWatched: 0,
        duration: 0,
        video_id: '',
        watched: '',
        noNotif: true
      }
    }));

    const putRes = await stremioApiPost('datastorePut', {
      authKey,
      collection: 'libraryItem',
      changes
    });

    return { skipped: false, cleared: changes.length, success: Boolean(putRes?.result?.success) };
  } catch (e) {
    console.warn('clearDemoLibrary warning:', e.message);
    return { skipped: false, error: e.message };
  }
}

async function ensureDemoAddons(authKey, region = 'latam') {
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

    const isSpain = region === 'es';
    const targetUrl = isSpain
      ? 'https://videm.tv/api/addon/es/manifest.json'
      : 'https://videm.tv/api/addon/manifest.json';

    const hasVidem = existing.some((a, idx) => a.manifest?.id === 'tv.videm.cinema' && a.transportUrl === targetUrl && a.manifest?.version === '1.7.5' && idx === 0);
    if (!hasVidem) {
      const clean = existing.filter(a => a.manifest?.id !== 'tv.videm.cinema');
      clean.unshift({
        transportUrl: targetUrl,
        transportName: 'http',
        manifest: isSpain
          ? { ...VIDEM_MANIFEST, name: 'VIDEM 4K Cinema (España)' }
          : VIDEM_MANIFEST
      });

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

    // Asegurar que la señal de transmisión en Supabase esté abierta (demo_active)
    await new Promise((resolve) => {
      const body = JSON.stringify({ status: 'demo_active' });
      const req = https.request(`${SUPABASE_URL}/rest/v1/users?phone=eq.${DEMO_PHONE}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }, resolve);
      req.on('error', resolve);
      req.write(body);
      req.end();
    });
  } catch(e) {
    console.warn('ensureDemoAddons warning:', e.message);
  }
}

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { code, authKey, isDemo, region, phone } = req.body || {};
    if (!code || !authKey) {
      res.status(400).json({ success: false, error: 'Faltan parámetros: code y authKey son requeridos' });
      return;
    }

    const effectiveRegion = (region === 'es' || (phone && /^(\+?34)/.test(String(phone).trim()))) ? 'es' : 'latam';
    let demoCleanup = null;
    if (isDemo !== false) {
      await ensureDemoAddons(authKey, effectiveRegion);
      demoCleanup = await clearDemoLibrary(authKey);
    }

    const postData = JSON.stringify({ authKey });

    const linkResult = await new Promise((resolve, reject) => {
      const linkReq = https.request(`https://link.stremio.com/api/write?code=${encodeURIComponent(code)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (linkRes) => {
        let body = '';
        linkRes.on('data', c => body += c);
        linkRes.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (parsed.success) resolve(parsed);
            else reject(new Error(parsed.error?.message || 'Código rechazado o expirado en el televisor'));
          } catch (e) {
            reject(new Error('Respuesta inválida del servidor Stremio Link: ' + body));
          }
        });
      });

      linkReq.on('error', reject);
      linkReq.write(postData);
      linkReq.end();
    });

    res.status(200).json({
      success: true,
      code,
      demoCleanup,
      message: 'Televisor enlazado con éxito a la cuenta VIDEM'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
