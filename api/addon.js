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
  version: "1.1.0",
  name: "VIDEM 4K Cinema",
  description: "Infraestructura privada VIDEM en ultra alta definición 4K Remux Dolby Atmos (Multi-Engine Latino & Asian Cinema)",
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

function queryJsonUrl(url, timeoutMs = 5500) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed && Array.isArray(parsed.streams) ? parsed : { streams: [] });
        } catch (e) {
          resolve({ streams: [] });
        }
      });
    });
    req.on('error', () => resolve({ streams: [] }));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve({ streams: [] });
    });
  });
}

function buildCometConfigBase64(token) {
  const cometConfigObj = {
    maxResultsPerResolution: 0,
    maxSize: 0,
    cachedOnly: true,
    removeTrash: true,
    resultFormat: ["all"],
    debridService: "realdebrid",
    debridApiKey: token,
    debridStreamProxyPassword: "",
    languages: {
      required: [],
      exclude: [],
      preferred: ["es", "es-419", "la", "multi"]
    },
    resolutions: {
      r2160p: true,
      r1080p: true,
      r720p: true,
      r480p: false,
      r360p: false,
      unknown: true
    },
    options: {
      remove_ranks_under: -10000000000,
      allow_english_in_languages: true,
      remove_unknown_languages: false
    }
  };
  return Buffer.from(JSON.stringify(cometConfigObj)).toString('base64');
}

async function fetchMultiEngineStreams(type, id, rdToken) {
  const token = rdToken || DEMO_RD_TOKEN;
  const cometB64 = buildCometConfigBase64(token);

  // 1. Torrentio Prioritario Latino
  const urlTorrentioLatino = `https://torrentio.strem.fun/language=latino%7Cqualityfilter=cam,scr%7Cdebridoptions=nodownloadlinks%7Crealdebrid=${token}/stream/${type}/${id}`;
  // 2. Torrentio Español + Latino + Global (incluye Castellano, Dual, Multi y Remux 4K)
  const urlTorrentioEsGlobal = `https://torrentio.strem.fun/language=latino,spanish%7Cqualityfilter=cam,scr%7Cdebridoptions=nodownloadlinks%7Crealdebrid=${token}/stream/${type}/${id}`;
  // 3. Peerflix RD (Trackers hispanos/latinos dedicados: Sinsitio, Zonapelis, GranTorrent, Peerflix)
  const urlPeerflixEs = `https://addon.peerflix.mov/language=es-419,es-ES%7Crealdebrid=${token}/stream/${type}/${id}`;
  // 4. Comet RD / DMM (Debrid Media Manager & StremThru: ideal para K-Dramas Netflix Multi-Audio y Remux Asiático)
  const urlCometDmm = `https://comet.elfhosted.com/${cometB64}/stream/${type}/${id}`;
  // 5. TorrentsDB RD (Trackers asiáticos 1lou, Knaben, ilCorSaRoNeRo, EZTV)
  const urlTorrentsDb = `https://torrentsdb.com/realdebrid=${token}/stream/${type}/${id}`;

  const [resTLat, resTEs, resPeerflix, resComet, resTdb] = await Promise.all([
    queryJsonUrl(urlTorrentioLatino, 5000),
    queryJsonUrl(urlTorrentioEsGlobal, 5500),
    queryJsonUrl(urlPeerflixEs, 5000),
    queryJsonUrl(urlCometDmm, 5500),
    queryJsonUrl(urlTorrentsDb, 5000)
  ]);

  let combined = [
    ...(resTLat.streams || []),
    ...(resTEs.streams || []),
    ...(resPeerflix.streams || []),
    ...(resComet.streams || []),
    ...(resTdb.streams || [])
  ];

  // Fallback si por alguna razón todos los filtros devolvieron vacío
  if (combined.length === 0) {
    const urlGlobal = `https://torrentio.strem.fun/qualityfilter=cam,scr%7Cdebridoptions=nodownloadlinks%7Crealdebrid=${token}/stream/${type}/${id}`;
    const resGlobal = await queryJsonUrl(urlGlobal, 5500);
    combined = resGlobal.streams || [];
  }

  // Deduplicar enlaces equivalentes preservando el primero (prioridad Torrentio/RD+/DMM)
  const seenKeys = new Set();
  const uniqueStreams = [];

  for (const s of combined) {
    if (!s || (!s.url && !s.infoHash)) continue;

    // Extraer hash de la URL de Real-Debrid/Torrentio/Peerflix/Comet si existe (40 hex chars)
    const hashMatch = (s.url || '').match(/\/([a-fA-F0-9]{40})\//);
    const fileHint = (s.behaviorHints?.filename || '').toLowerCase().trim();
    const dedupKey = hashMatch
      ? `${hashMatch[1].toLowerCase()}_${fileHint}`
      : (s.url || s.infoHash);

    if (seenKeys.has(dedupKey)) continue;
    seenKeys.add(dedupKey);
    uniqueStreams.push(s);
  }

  return uniqueStreams;
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

    // SI ES CLIENTE VIP O DEMO ACTIVA: Resolver en Multi-Engine (Torrentio + Peerflix + Comet DMM + TorrentsDB)
    try {
      const rawStreams = await fetchMultiEngineStreams(type, id, clientToken);

      function detectLanguageAndBadge(stream) {
        const displayTitle = stream.title || stream.description || '';
        const text = `${stream.name || ''} ${displayTitle} ${stream.behaviorHints?.filename || ''}`;
        const lower = text.toLowerCase();

        // 1. Detección de Audio Latino (incluye banderas LATAM, emoji 💃 de Comet y trackers latinos)
        const hasLatinoFlag = displayTitle.includes('🇲🇽') || displayTitle.includes('🇨🇴') || displayTitle.includes('🇦🇷') || displayTitle.includes('🇨🇱') || displayTitle.includes('🇵🇪') || displayTitle.includes('💃');
        const isLatino = hasLatinoFlag || /latino|audio[\s.-]*lat|dual[\s.-]*lat|es-419|es-la|latin[\s.-]*america|\blat\b|cinecalidad|pelisenhd|hackstore/i.test(lower);

        // 2. Detección de Español / Castellano / Dual Hispano
        const hasSpainFlag = displayTitle.includes('🇪🇸');
        const isCastellano = hasSpainFlag || /castellano|\bcast\b|spanish|español|es-es|\bspa\b|\[es\]|mejortorrent|estrenosdtl|wolfmax|newpct|dontorrent|grantorrent|elitetorrent|sinsitio|zonapelis|maxitorrent/i.test(lower);

        // 3. Detección de idiomas extranjeros de doblaje o hardsubs (para relegarlos al final si no incluyen español)
        const hasRussian = /[а-яА-ЯёЁ]|rutracker|rutor|\brus\b|softbox|dublik/i.test(text) || displayTitle.includes('🇷🇺');
        const hasFrench = /french|français|\bfr\b|\bvfi\b|\bvfq\b|\bvff\b|torrent9|vostfr/i.test(lower) || displayTitle.includes('🇫🇷');
        const hasPolish = /polish|lektor|polski|\bpl\b|besttorrents|\bcz\b|sktorrent/i.test(lower) || displayTitle.includes('🇵🇱');
        const hasItalian = /italian|\bita\b|mircrew|corsarone|avvocata|\bdlmux\b/i.test(lower) || displayTitle.includes('🇮🇹');
        const hasHindi = /hindi|tamil|telugu/i.test(lower) || displayTitle.includes('🇮🇳');
        const hasChineseHardsub = /中字|dygangs|1lou|qqhdtv|国英韩/i.test(text);

        // 4. Detección de Multi-Audio / Dual-Audio / Multi-Subs (muy común en K-Dramas de Netflix y Remuxes de DMM)
        const isMultiOrDual = /multi[\s.-]*audio|dual[\s.-]*audio|\bmulti\b|\bdual\b|multi[\s.-]*sub|\bmsub\b/i.test(lower) || displayTitle.includes('🌎');
        const isAsianOriginal = displayTitle.includes('🇰🇷') || displayTitle.includes('🇯🇵') || displayTitle.includes('🇨🇳') || /\bkorean\b|\bkor\b|\bjapanese\b|\bchinese\b/i.test(lower);
        const isOfficialNfOrRemux = /\bnf\b|netflix|web-dl|remux/i.test(lower);

        let langTag = '';
        let priority = 0;

        if (isLatino) {
          langTag = '🇲🇽 LATINO';
          priority = 100;
        } else if (isCastellano) {
          langTag = '🇪🇸 ESPAÑOL';
          priority = 88;
          // Penalizar spin-offs o títulos homónimos erróneos dentro de packs
          if (/the grandmaster/i.test(lower)) {
            langTag = '🇪🇸 THE GRANDMASTER (2013)';
            priority = 72;
          } else if (/el juego del asesino|squid game[\s.-]*the challenge|el desafio/i.test(lower)) {
            langTag = '🇪🇸 SPIN-OFF / ALT';
            priority = 65;
          }
        } else if (isMultiOrDual && !hasRussian && !hasPolish && !hasChineseHardsub && !(hasFrench && !displayTitle.includes('🇬🇧') && !isAsianOriginal)) {
          langTag = '🌐 MULTI-AUDIO / SUBS';
          priority = 78;
        } else if (!hasRussian && !hasFrench && !hasPolish && !hasItalian && !hasHindi && !hasChineseHardsub) {
          if (displayTitle.includes('🇰🇷') || /\bkorean\b|\bkor\b/i.test(lower)) {
            langTag = '🇰🇷 ORIGINAL + SUBS';
            priority = 54;
          } else if (displayTitle.includes('🇯🇵') || /\bjapanese\b|\bjpn\b/i.test(lower)) {
            langTag = '🇯🇵 ORIGINAL + SUBS';
            priority = 54;
          } else if (displayTitle.includes('🇨🇳') || /\bchinese\b|\bchi\b/i.test(lower)) {
            langTag = '🇨🇳 ORIGINAL + SUBS';
            priority = 54;
          } else {
            langTag = '🇺🇸 ORIGINAL / VOSE';
            priority = 50;
          }
          if (isOfficialNfOrRemux) priority += 3;
        } else if (hasChineseHardsub) {
          langTag = '🇨🇳 SUB ASIÁTICO';
          priority = 26;
        } else if (hasItalian) {
          langTag = '🇮🇹 ITALIANO';
          priority = 25;
        } else if (hasFrench) {
          langTag = '🇫🇷 FRANCÉS';
          priority = 25;
        } else if (hasHindi) {
          langTag = '🇮🇳 HINDI / MULTI';
          priority = 24;
        } else if (hasPolish) {
          langTag = '🇵🇱 POLACO / EU';
          priority = 22;
        } else if (hasRussian) {
          langTag = '🇷🇺 RUSO';
          priority = 20;
        } else {
          langTag = '🇺🇸 ORIGINAL / VOSE';
          priority = 40;
        }

        // Detección precisa de resolución (evitando falso 4K por el nombre del tracker 'Wolfmax4k')
        const lowerWithoutTracker = lower.replace(/wolfmax4k/g, '');
        let resBadge = '1080p';
        if (/\b4k\b|2160p|\buhd\b|uhdremux/i.test(lowerWithoutTracker)) resBadge = '4K';
        else if (/720p/i.test(lowerWithoutTracker)) resBadge = '720p';
        else if (/480p/i.test(lowerWithoutTracker)) resBadge = '480p';

        // Bono de calidad y caché instantáneo dentro de la misma categoría de idioma
        if (resBadge === '4K') priority += 5;
        else if (resBadge === '1080p') priority += 2;
        else if (resBadge === '480p') priority -= 4;

        const isInstantCached = /\[rd\+\]|\[rd⚡\]/i.test(stream.name || '');
        if (isInstantCached) priority += 3;

        return {
          ...stream,
          name: `✦ VIDEM ${resBadge} • ${langTag}`,
          title: displayTitle,
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
