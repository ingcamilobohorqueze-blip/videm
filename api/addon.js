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
  version: "1.0.1",
  name: "VIDEM 4K Cinema",
  description: "Infraestructura privada VIDEM en ultra alta definición 4K Remux Dolby Atmos",
  resources: ["stream"],
  types: ["movie", "series", "anime"],
  idPrefixes: ["tt", "kitsu", "tmdb:"],
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

function queryTorrentioUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve({ streams: [] }); }
      });
    }).on('error', () => resolve({ streams: [] }));
  });
}

async function fetchTorrentio(type, id, rdToken) {
  const token = rdToken || DEMO_RD_TOKEN;

  // 1. Intento prioritario: Pistas etiquetadas como Latino
  const urlLatino = `https://torrentio.strem.fun/language=latino%7Cqualityfilter=cam,scr%7Cdebridoptions=nodownloadlinks%7Crealdebrid=${token}/stream/${type}/${id}`;
  const resLatino = await queryTorrentioUrl(urlLatino);

  if (resLatino && Array.isArray(resLatino.streams) && resLatino.streams.length > 0) {
    return resLatino;
  }

  // 2. Fallback inteligente: Si no hay 'latino' explícito en el nombre del torrent (común en series de Netflix, Disney+, novelas),
  // consultar fuentes globales sin filtro de idioma para capturar versiones Dual Audio, Multi-Audio o Español
  const urlGlobal = `https://torrentio.strem.fun/qualityfilter=cam,scr%7Cdebridoptions=nodownloadlinks%7Crealdebrid=${token}/stream/${type}/${id}`;
  const resGlobal = await queryTorrentioUrl(urlGlobal);

  return resGlobal || { streams: [] };
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

      function detectLanguageAndBadge(stream) {
        const text = `${stream.name || ''} ${stream.title || ''} ${stream.behaviorHints?.filename || ''}`;
        const lower = text.toLowerCase();

        const isLatino = /latino|audio[\s.-]*latino|es-la|latin[\s.-]*america|\blat\b/i.test(lower);
        const isCastellano = /castellano|cast\b|spanish|español|es-es|mejortorrent|estrenosdtl/i.test(lower);
        const hasSpanishFlag = (stream.title || '').includes('🇪🇸') || (stream.title || '').includes('🇲🇽') || (stream.title || '').includes('🇨🇴');

        const hasFrench = /french|français|\bfr\b|torrent9|vostfr/i.test(lower) || (stream.title || '').includes('🇫🇷');
        const hasPolish = /polish|lektor|polski|\bpl\b|besttorrents/i.test(lower) || (stream.title || '').includes('🇵🇱');
        const hasItalian = /italian|ita\b|mircrew|corsarone/i.test(lower) || (stream.title || '').includes('🇮🇹');
        const hasRussian = /селезень|rutracker|rutor|\brus\b/i.test(lower) || (stream.title || '').includes('🇷🇺');
        const hasHindi = /hindi/i.test(lower) || (stream.title || '').includes('🇮🇳');

        let langTag = '';
        let priority = 0;

        if (isLatino || (stream.title || '').includes('🇲🇽') || (stream.title || '').includes('🇨🇴')) {
          langTag = '🇲🇽 LATINO';
          priority = 100;
        } else if (isCastellano || hasSpanishFlag) {
          langTag = '🇪🇸 CASTELLANO';
          priority = 85;
          // Si es un archivo secundario o spin-off como 'The Grandmaster', dar menor prioridad que la película principal
          if (/the grandmaster/i.test(lower)) {
            langTag = '🇪🇸 THE GRANDMASTER (2013)';
            priority = 75;
          }
        } else if (/multi|dual/i.test(lower) && (isLatino || isCastellano || hasSpanishFlag)) {
          langTag = '🌐 DUAL ESPAÑOL';
          priority = 80;
        } else if (hasFrench) {
          langTag = '🇫🇷 FRANCÉS';
          priority = 25;
        } else if (hasPolish) {
          langTag = '🇵🇱 POLACO';
          priority = 25;
        } else if (hasItalian) {
          langTag = '🇮🇹 ITALIANO';
          priority = 25;
        } else if (hasRussian) {
          langTag = '🇷🇺 RUSO';
          priority = 25;
        } else if (hasHindi) {
          langTag = '🇮🇳 HINDI';
          priority = 25;
        } else {
          langTag = '🇺🇸 ORIGINAL / VOSE';
          priority = 35;
        }

        // Detección de resolución
        let resBadge = '1080p';
        if (/4k|2160p|uhd|remux/i.test(lower)) resBadge = '4K';
        else if (/720p/i.test(lower)) resBadge = '720p';

        // Bono de calidad dentro de la misma categoría de idioma
        if (resBadge === '4K') priority += 5;

        return {
          ...stream,
          name: `✦ VIDEM ${resBadge} • ${langTag}`,
          _priority: priority
        };
      }

      const brandedStreams = rawStreams
        .map(detectLanguageAndBadge)
        .sort((a, b) => b._priority - a._priority)
        .map(({ _priority, ...s }) => s);

      sendJson(200, { streams: brandedStreams });
    } catch (err) {
      sendJson(200, { streams: [] });
    }
    return;
  }

  // Ruta por defecto si entra al root del addon
  sendJson(200, MANIFEST);
};
