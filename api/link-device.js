const https = require('https');

const SUPABASE_URL = 'https://crkkakwpiggnbuwqopsc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNya2tha3dwaWdnbmJ1d3FvcHNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzQzNTg3MSwiZXhwIjoyMTA5MDExODcxfQ.n4yTSUUIC4QL-_UKPJSs2qvPwCNJVoFcf-kbZqEpRo4';
const DEMO_PHONE = '573015568904';

const VIDEM_MANIFEST = {
  id: 'tv.videm.cinema',
  version: '1.3.0',
  name: 'VIDEM 4K Cinema',
  description: 'Infraestructura privada VIDEM en ultra alta definición 4K Remux Dolby Atmos (Multi-Engine Latino, Turcas, K-Dramas & Global)',
  resources: ['stream'],
  types: ['movie', 'series', 'anime'],
  idPrefixes: ['tt', 'kitsu', 'tmdb:'],
  catalogs: [],
  background: 'https://videm.tv/assets/images/plan_lluvia_bogota_cine.jpg',
  logo: 'https://videm.tv/assets/icons/icon-192.png',
  behaviorHints: { configurable: false, configurationRequired: false }
};

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

    const hasVidem = existing.some(a => a.manifest?.id === 'tv.videm.cinema' && a.transportUrl === targetUrl);
    if (!hasVidem) {
      const clean = existing.filter(a => a.manifest?.id !== 'tv.videm.cinema');
      clean.push({
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
    if (isDemo !== false) {
      await ensureDemoAddons(authKey, effectiveRegion);
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
      message: 'Televisor enlazado con éxito a la cuenta VIDEM'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
