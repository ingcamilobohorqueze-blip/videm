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
  version: "1.3.0",
  name: "VIDEM 4K Cinema",
  description: "Infraestructura privada VIDEM en ultra alta definición 4K Remux Dolby Atmos (Multi-Engine Latino, Turcas, K-Dramas & Global)",
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

function buildCometConfigBase64(token, region = 'latam') {
  const preferredLangs = region === 'es'
    ? ["es", "multi", "es-419", "en"]
    : ["es-419", "la", "multi", "en", "ko", "ja"];

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
      preferred: preferredLangs
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

async function fetchMultiEngineStreams(type, id, rdToken, region = 'latam') {
  const token = rdToken || DEMO_RD_TOKEN;
  const cometB64 = buildCometConfigBase64(token, region);

  // 1. Torrentio Prioritario según región
  const urlTorrentioPrimary = region === 'es'
    ? `https://torrentio.strem.fun/language=spanish,latino%7Cqualityfilter=cam,scr%7Cdebridoptions=nodownloadlinks%7Crealdebrid=${token}/stream/${type}/${id}`
    : `https://torrentio.strem.fun/language=latino%7Cqualityfilter=cam,scr%7Cdebridoptions=nodownloadlinks%7Crealdebrid=${token}/stream/${type}/${id}`;

  // 2. Torrentio Global / Multi-Audio / Remux 4K + respaldo hispano
  const urlTorrentioSecondary = region === 'es'
    ? `https://torrentio.strem.fun/qualityfilter=cam,scr%7Cdebridoptions=nodownloadlinks%7Crealdebrid=${token}/stream/${type}/${id}`
    : `https://torrentio.strem.fun/language=latino,spanish%7Cqualityfilter=cam,scr%7Cdebridoptions=nodownloadlinks%7Crealdebrid=${token}/stream/${type}/${id}`;

  // 3. Peerflix RD: En LATAM solo consultamos es-419 (evita inundar con trackers españoles Sinsitio/Zonapelis); en España consultamos es-ES,es-419
  const urlPeerflix = region === 'es'
    ? `https://addon.peerflix.mov/language=es-ES,es-419%7Crealdebrid=${token}/stream/${type}/${id}`
    : `https://addon.peerflix.mov/language=es-419%7Crealdebrid=${token}/stream/${type}/${id}`;

  // 4. Comet RD / DMM (Debrid Media Manager & StremThru: ideal para K-Dramas Netflix Multi-Audio y Remux Asiático)
  const urlCometDmm = `https://comet.elfhosted.com/${cometB64}/stream/${type}/${id}`;
  // 5. TorrentsDB RD (Trackers asiáticos 1lou, Knaben, ilCorSaRoNeRo, EZTV)
  const urlTorrentsDb = `https://torrentsdb.com/realdebrid=${token}/stream/${type}/${id}`;

  const [resTPrimary, resTSecondary, resPeerflix, resComet, resTdb] = await Promise.all([
    queryJsonUrl(urlTorrentioPrimary, 5000),
    queryJsonUrl(urlTorrentioSecondary, 5500),
    queryJsonUrl(urlPeerflix, 5000),
    queryJsonUrl(urlCometDmm, 5500),
    queryJsonUrl(urlTorrentsDb, 5000)
  ]);

  let combined = [
    ...(resTPrimary.streams || []),
    ...(resTSecondary.streams || []),
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

  // Deduplicar enlaces equivalentes y filtrar contaminación de packs de series cuando se consulta una película
  const seenKeys = new Set();
  const uniqueStreams = [];

  for (const s of combined) {
    if (!s || (!s.url && !s.infoHash)) continue;

    const fullText = `${s.name || ''} ${s.title || ''} ${s.description || ''} ${s.behaviorHints?.filename || ''}`;
    // Si estamos consultando una película, descartar packs de series infiltrados por palabra clave (ej. "DRAGON BALL Z: Complete 1989-2019 Series" en "Red Dragon")
    if (type === 'movie' && /complete\s+\d{4}-\d{4}\s+series|dragon\s*ball\s*z|\bs\d{2}e\d{2}\b/i.test(fullText)) {
      continue;
    }

    // Extraer hash de la URL de Real-Debrid/Torrentio/Peerflix/Comet si existe (40 hex chars)
    const hashMatch = (s.url || '').match(/\/([a-fA-F0-9]{40})\//);
    const firstLineTitle = ((s.title || s.description || '').split('\n')[0] || '').replace(/^📄\s*/, '').toLowerCase().trim();
    const fileHint = (s.behaviorHints?.filename || firstLineTitle || '').toLowerCase().trim();
    const dedupKey = hashMatch
      ? `${hashMatch[1].toLowerCase()}`
      : (fileHint || s.url || s.infoHash);

    if (seenKeys.has(dedupKey) || (firstLineTitle.length > 12 && seenKeys.has(firstLineTitle))) continue;
    seenKeys.add(dedupKey);
    if (firstLineTitle.length > 12) seenKeys.add(firstLineTitle);
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
  let region = (req.query?.region || '').toLowerCase() === 'es' ? 'es' : 'latam';
  let isDemo = false;

  // Soporte de prefijo regional explícito: "/api/addon/es/..." o "/api/addon/es_:token/..."
  if (urlPath.startsWith('es/')) {
    region = 'es';
    urlPath = urlPath.slice(3);
  }

  // Si urlPath viene con token dedicado al inicio: ":token/manifest.json" o "es_:token/stream/..."
  const tokenPrefixMatch = urlPath.match(/^([a-zA-Z0-9_-]{20,})\/(.*)/);
  if (tokenPrefixMatch) {
    let rawToken = tokenPrefixMatch[1];
    if (rawToken.startsWith('es_')) {
      region = 'es';
      rawToken = rawToken.slice(3);
    } else if (rawToken.startsWith('latam_')) {
      region = 'latam';
      rawToken = rawToken.slice(6);
    }
    clientToken = rawToken;
    urlPath = tokenPrefixMatch[2];
  }

  if (!clientToken || clientToken === 'demo' || clientToken === DEMO_RD_TOKEN) {
    clientToken = DEMO_RD_TOKEN;
    isDemo = true;
  }

  // 1. Manifiesto Stremio (adaptado según región)
  if (urlPath === 'manifest.json' || urlPath.endsWith('/manifest.json')) {
    if (region === 'es') {
      sendJson(200, {
        ...MANIFEST,
        name: "VIDEM 4K Cinema (España)",
        description: "Infraestructura privada VIDEM en ultra alta definición 4K Remux Dolby Atmos (Castellano, VOSE, Multi-Audio & Global)"
      });
    } else {
      sendJson(200, MANIFEST);
    }
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
        const waContact = region === 'es' ? '+34 746 05 77 76' : '+57 301 556 8904';
        sendJson(200, {
          streams: [
            {
              name: "⛔ VIDEM 4K",
              title: `🔒 PASE DEMO FINALIZADO\nTu prueba de cortesía ha terminado.\n💬 Escríbenos a WhatsApp (${waContact}) para activar tu Membresía VIP 4K.`,
              behaviorHints: { notWebReady: true }
            }
          ]
        });
        return;
      }
    }

    // SI ES CLIENTE VIP O DEMO ACTIVA: Resolver en Multi-Engine con perfil regional (LATAM vs ESPAÑA)
    try {
      const rawStreams = await fetchMultiEngineStreams(type, id, clientToken, region);

      function detectLanguageAndBadge(stream) {
        const displayTitle = stream.title || stream.description || '';
        const text = `${stream.name || ''} ${displayTitle} ${stream.behaviorHints?.filename || ''}`;
        const lower = text.toLowerCase();

        // 0. Aislar estrictamente releases rusos (cirílico o estudios rusos) y hardsubs chinos
        const hasRussian = /[а-яА-ЯёЁ]|rutracker|rutor|\brus\b|softbox|dublik|gears\s*media|ideafilm|newstudio|baibako|lostfilm|hdrezka|coldfilm/i.test(text) || displayTitle.includes('🇷🇺');
        const hasChineseHardsub = /中字|dygangs|1lou|qqhdtv|国英韩/i.test(text);

        // 1. Detección de Audio Español Latino (incluye banderas LATAM, emoji 💃 de Comet y trackers latinos)
        const hasLatinoFlag = displayTitle.includes('🇲🇽') || displayTitle.includes('🇨🇴') || displayTitle.includes('🇦🇷') || displayTitle.includes('🇨🇱') || displayTitle.includes('🇵🇪') || displayTitle.includes('💃');
        const isLatino = !hasRussian && (hasLatinoFlag || /latino|audio[\s.-]*lat|dual[\s.-]*lat|es-419|es-la|latin[\s.-]*america|\blat\b|cinecalidad|pelisenhd|hackstore|latinoamerica|mega1080p/i.test(lower));

        // 2. Detección de Español de España / Castellano (trackers ibéricos y bandera 🇪🇸 sin bandera 🇲🇽)
        const hasSpainFlag = displayTitle.includes('🇪🇸');
        const hasSpainTrackerOrTag = /castellano|\bcast\b|es-es|\bspa\b|\besp\b|\[es\]|mejortorrent|estrenosdtl|wolfmax|newpct|dontorrent|grantorrent|elitetorrent|sinsitio|zonapelis|maxitorrent|atomohd|atomixhq|pctmix|descargas2020|\bbddr\b/i.test(lower);
        const isCastellano = !hasRussian && !isLatino && (hasSpainFlag || hasSpainTrackerOrTag || /spanish|español/i.test(lower));

        // 3. Detección de otros idiomas regionales europeos y extranjeros (para evitar falsos Multi-Audio)
        const hasFrench = /french|français|\bfr\b|\bvfi\b|\bvfq\b|\bvff\b|torrent9|vostfr|truefrench/i.test(lower) || displayTitle.includes('🇫🇷');
        const hasPolish = /polish|lektor|polski|\bpl\b|besttorrents|\bcz\b|sktorrent|-colo\b/i.test(lower) || displayTitle.includes('🇵🇱');
        const hasItalian = /italian|\bita\b|mircrew|corsarone|avvocata|\bdlmux\b|licdom/i.test(lower) || displayTitle.includes('🇮🇹');
        const hasPortuguese = /portugu|dublado|dual[\s.-]*pt|\bpt-br\b|\bpor\b|o\.grande\.mestre|bludv|comandotorrents|guyzo|ricksz/i.test(lower) || displayTitle.includes('🇧🇷') || displayTitle.includes('🇵🇹');
        const hasTurkish = /\bturkish\b|\btur\b/i.test(lower) || displayTitle.includes('🇹🇷');
        const hasHindi = /hindi|tamil|telugu/i.test(lower) || displayTitle.includes('🇮🇳');
        const hasGerman = /german|deutsch|\bger\b/i.test(lower) || displayTitle.includes('🇩🇪');

        // 4. Detección de Multi-Audio / Dual-Audio legítimo de Región A / Global (Blu-ray Norteamérica -DDR, Netflix WEB-DL Multi, etc.)
        const hasMultiKeyword = /multi[\s.-]*audio|dual[\s.-]*audio|\bmulti\b|\bdual\b|multi[\s.-]*sub|\bmsub\b/i.test(lower) || displayTitle.includes('🌎');
        const isCleanMultiOrDual = hasMultiKeyword && !isLatino && !isCastellano && !hasRussian && !hasPolish && !hasItalian && !hasFrench && !hasGerman && !hasPortuguese && !hasHindi && !hasChineseHardsub;

        const isAsianOriginal = displayTitle.includes('🇰🇷') || displayTitle.includes('🇯🇵') || displayTitle.includes('🇨🇳') || /\bkorean\b|\bkor\b|\bjapanese\b|\bchinese\b|k-drama|boys[\s.-]*over[\s.-]*flowers/i.test(lower);

        let langTag = '';
        let priority = 0;

        // =========================================================================
        // PERFIL REGIONAL A: LATINOAMÉRICA (Predomina Español Latino -> Multi-Audio Américas -> Original+Subs -> Castellano España al final)
        // PERFIL REGIONAL B: ESPAÑA / EUROPA (Predomina Castellano España -> Multi-Audio -> VOSE -> Latino)
        // Escalones separados por >= 45 puntos para que el bono de calidad (+1 a +34) NUNCA invierta la preferencia de idioma
        // =========================================================================
        if (isLatino) {
          langTag = '🇲🇽 LATINO';
          priority = region === 'es' ? 95 : 250;
          if (/la\.casa\.de\.la\.pradera/i.test(lower)) {
            langTag = '🇲🇽 OTRO TÍTULO';
            priority = 30;
          }
        } else if (isCastellano) {
          langTag = region === 'es' ? '🇪🇸 CASTELLANO' : '🇪🇸 ESPAÑOL (ESPAÑA)';
          priority = region === 'es' ? 250 : 75;
          // Penalizar spin-offs o títulos homónimos erróneos dentro de packs
          if (/the grandmaster/i.test(lower)) {
            langTag = '🇪🇸 THE GRANDMASTER (2013)';
            priority = 40;
          } else if (/el juego del asesino|squid game[\s.-]*the challenge|el desafio/i.test(lower)) {
            langTag = '🇪🇸 SPIN-OFF / ALT';
            priority = 35;
          }
        } else if (isCleanMultiOrDual) {
          langTag = region === 'es' ? '🌐 MULTI-AUDIO / SUBS' : '🌎 MULTI-AUDIO (ORIGINAL/LAT)';
          priority = 195;
        } else if (!hasRussian && !hasFrench && !hasPolish && !hasItalian && !hasGerman && !hasPortuguese && !hasHindi && !hasChineseHardsub) {
          // Idioma Original Puro (Inglés / Coreano / Japonés / Chino) para ver con Subtítulos Latinos en 4K/1080p sin doblaje ibérico
          if (displayTitle.includes('🇰🇷') || /\bkorean\b|\bkor\b|k-drama|boys[\s.-]*over[\s.-]*flowers/i.test(lower)) {
            langTag = '🇰🇷 COREANO + SUBS';
            priority = 145;
          } else if (displayTitle.includes('🇯🇵') || /\bjapanese\b|\bjpn\b/i.test(lower)) {
            langTag = '🇯🇵 JAPONÉS + SUBS';
            priority = 145;
          } else if (displayTitle.includes('🇨🇳') || /\bchinese\b|\bchi\b/i.test(lower)) {
            langTag = '🇨🇳 ORIGINAL + SUBS';
            priority = 145;
          } else if (hasTurkish) {
            langTag = '🇹🇷 TURCO + SUBS';
            priority = 142;
          } else if (hasPortuguese) {
            langTag = '🇧🇷 PORTUGUÉS + SUBS';
            priority = 135;
          } else {
            langTag = region === 'es' ? '🇺🇸 VOSE (ORIGINAL)' : '🇺🇸 INGLÉS + SUBS';
            priority = 140;
          }
        } else if (hasPortuguese && !hasRussian) {
          langTag = '🇧🇷 PORTUGUÉS';
          priority = 45;
        } else if (hasChineseHardsub) {
          langTag = '🇨🇳 SUB ASIÁTICO';
          priority = 26;
        } else if (hasItalian) {
          langTag = '🇮🇹 ITALIANO / ENG';
          priority = 25;
        } else if (hasFrench) {
          langTag = '🇫🇷 FRANCÉS';
          priority = 25;
        } else if (hasGerman) {
          langTag = '🇩🇪 ALEMÁN';
          priority = 24;
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
          langTag = region === 'es' ? '🇺🇸 VOSE (ORIGINAL)' : '🇺🇸 INGLÉS + SUBS';
          priority = 120;
        }

        // 5. Detección precisa de Resolución y Fidelidad de Video/Audio (evitando falso 4K por el tracker 'Wolfmax4k')
        const lowerClean = lower.replace(/wolfmax4k/g, '');
        let resBadge = '1080p';
        if (/\b4k\b|2160p|\buhd\b|uhdremux/i.test(lowerClean)) resBadge = '4K';
        else if (/720p/i.test(lowerClean)) resBadge = '720p';
        else if (/480p|\bxvid\b|\bavi\b|\bsd\b/i.test(lowerClean) && !/1080p|2160p/i.test(lowerClean)) resBadge = 'SD/720p';

        // Scoring de Fidelidad de Video (dentro del mismo escalón de idioma gana siempre la mayor calidad de imagen)
        if (resBadge === '4K') priority += 12;
        else if (resBadge === '1080p') priority += 5;
        else if (resBadge === '720p') priority += 1;
        else priority -= 5;

        const isRemux = /remux/i.test(lowerClean);
        const hasDolbyVisionOrHdr = /\bdv\b|dolby\s*vision|hdr10\+|hdr/i.test(lowerClean);
        const isWebDlOrBluray = /web-dl|webdl|bluray|blu-ray|bdremux|nf\.web|amzn\.web/i.test(lowerClean);

        if (isRemux) priority += 6;
        if (hasDolbyVisionOrHdr) priority += 4;
        if (isWebDlOrBluray) priority += 3;

        // Scoring de Fidelidad de Audio (Atmos / TrueHD / DTS-HD > DDP 5.1 / AC3 5.1 > AAC 2.0)
        const hasAtmosOrLossless = /atmos|truehd|dts-hd|dts:x|flac/i.test(lowerClean);
        const hasSurround51 = /ddp\s*5\.1|dd\+\s*5\.1|eac3\s*5\.1|ac3\s*5\.1|\b5\.1\b|\b7\.1\b/i.test(lowerClean);
        let audioBadge = '';

        if (hasAtmosOrLossless) {
          priority += 5;
          audioBadge = ' • ATMOS';
        } else if (hasSurround51) {
          priority += 3;
          audioBadge = ' • 5.1';
        }

        // Bono por caché instantáneo en el CDN de Real-Debrid ([RD+] o [RD⚡])
        const isInstantCached = /\[rd\+\]|\[rd⚡\]/i.test(stream.name || '');
        if (isInstantCached) priority += 4;

        return {
          ...stream,
          name: `✦ VIDEM ${resBadge} • ${langTag}${audioBadge}`,
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
