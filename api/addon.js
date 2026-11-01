const https = require('https');

const SUPABASE_URL = 'https://crkkakwpiggnbuwqopsc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNya2tha3dwaWdnbmJ1d3FvcHNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzQzNTg3MSwiZXhwIjoyMTA5MDExODcxfQ.n4yTSUUIC4QL-_UKPJSs2qvPwCNJVoFcf-kbZqEpRo4';
const DEMO_RD_TOKEN = '76N4SFYLKTKDADDLDIAGR6MDKCG7VQT2FMEGTQDQM3X5U2PFU6QQ';
const DEMO_PHONE = '573015568904';

// Caché en memoria para respuesta ultra rápida (<20ms)
let cachedStatus = 'demo_active';
let lastCheckTime = 0;

const MANIFEST = {
  id: "tv.videm.cinema",
  version: "1.0.0",
  name: "VIDEM 4K Cinema",
  description: "Infraestructura privada VIDEM en ultra alta definición 4K Remux Dolby Atmos",
  resources: ["stream"],
  types: ["movie", "series", "anime"],
  idPrefixes: ["tt", "kitsu"],
  catalogs: [],
  background: "https://videm.tv/assets/images/plan_lluvia_bogota_cine.jpg",
  logo: "https://videm.tv/assets/icons/icon-192.png",
  behaviorHints: {
    configurable: false,
    configurationRequired: false
  }
};

async function isDemoActive() {
  const now = Date.now();
  // Validar cada 3 segundos contra Supabase para no saturar y mantener corte en tiempo real
  if (now - lastCheckTime < 3000) {
    return cachedStatus === 'demo_active';
  }

  try {
    const res = await new Promise((resolve) => {
      const url = `${SUPABASE_URL}/rest/v1/users?phone=eq.${DEMO_PHONE}&select=status`;
      https.get(url, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY
        }
      }, (r) => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => {
          try {
            const parsed = JSON.parse(d);
            resolve(parsed[0]?.status || 'demo_active');
          } catch(e) { resolve('demo_active'); }
        });
      }).on('error', () => resolve(cachedStatus));
    });

    cachedStatus = res;
    lastCheckTime = now;
    return cachedStatus === 'demo_active';
  } catch (err) {
    return cachedStatus === 'demo_active';
  }
}

function fetchTorrentio(type, id, rdToken) {
  return new Promise((resolve, reject) => {
    const token = rdToken || DEMO_RD_TOKEN;
    const url = `https://torrentio.strem.fun/language=latino%7Cqualityfilter=cam,scr%7Cdebridoptions=nodownloadlinks%7Crealdebrid=${token}/stream/${type}/${id}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve({ streams: [] }); }
      });
    }).on('error', reject);
  });
}

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const sendJson = (status, payload) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    if (res.status && res.json) return res.status(status).json(payload);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
  };

  const rawUrl = req.url || '';
  let urlPath = req.query?.path || rawUrl.replace(/^\/api\/addon\/?/, '');
  urlPath = urlPath.split('?')[0];

  let clientToken = req.query?.token || null;
  let isDemo = false;

  // Si urlPath viene con token dedicado al inicio: ":token/manifest.json" o ":token/stream/..."
  const tokenPrefixMatch = urlPath.match(/^([a-zA-Z0-9_-]{20,})\/(.*)/);
  if (tokenPrefixMatch) {
    clientToken = tokenPrefixMatch[1];
    urlPath = tokenPrefixMatch[2];
  }

  if (!clientToken || clientToken === 'demo' || clientToken === DEMO_RD_TOKEN) {
    clientToken = DEMO_RD_TOKEN;
    isDemo = true;
  }

  // 1. Manifiesto Stremio
  if (urlPath === 'manifest.json' || urlPath.endsWith('/manifest.json')) {
    sendJson(200, MANIFEST);
    return;
  }

  // 2. Endpoint de Streams: /stream/:type/:id
  const streamMatch = urlPath.match(/stream\/([^\/]+)\/([^\/]+)/) || rawUrl.match(/stream\/([^\/]+)\/([^\/]+)/);

  if (streamMatch) {
    const type = streamMatch[1];
    let id = streamMatch[2];
    if (!id.endsWith('.json')) id += '.json';

    // SI ES LA CUENTA DEMO Y ESTÁ CORTADA: Retornar aviso de corte en 0.0s
    if (isDemo) {
      const active = await isDemoActive();
      if (!active) {
        sendJson(200, {
          streams: [
            {
              name: "⛔ VIDEM 4K",
              title: "🔒 PASE DEMO FINALIZADO\nTu prueba de cortesía ha terminado.\n💬 Escríbenos a WhatsApp (+57 301 556 8904) para activar tu Membresía VIP 4K.",
              behaviorHints: { notWebReady: true }
            }
          ]
        });
        return;
      }
    }

    // SI ES CLIENTE VIP O DEMO ACTIVA: Resolver en Torrentio y aplicar branding VIDEM
    try {
      const data = await fetchTorrentio(type, id, clientToken);
      const rawStreams = data.streams || [];

      const brandedStreams = rawStreams.map(s => ({
        ...s,
        name: (s.name || '').replace(/\[RD\+\]\s*Torrentio/gi, '✦ VIDEM 4K Remux')
      }));

      sendJson(200, { streams: brandedStreams });
    } catch (err) {
      sendJson(200, { streams: [] });
    }
    return;
  }

  // Ruta por defecto si entra al root del addon
  sendJson(200, MANIFEST);
};
