const https = require('https');

const SUPABASE_URL = 'https://crkkakwpiggnbuwqopsc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNya2tha3dwaWdnbmJ1d3FvcHNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzQzNTg3MSwiZXhwIjoyMTA5MDExODcxfQ.n4yTSUUIC4QL-_UKPJSs2qvPwCNJVoFcf-kbZqEpRo4';
const DEMO_RD_TOKEN = '76N4SFYLKTKDADDLDIAGR6MDKCG7VQT2FMEGTQDQM3X5U2PFU6QQ';
const DEMO_PHONE = '573015568904';
const ADDON_LATAM_BASE = 'https://addonlatam.duckdns.org/FaIqffOcY0y_S5WfVLrsXq6s';

// Caché en memoria para respuesta ultra rápida (<20ms)
let cachedStatus = 'demo_active';
let lastCheckTime = 0;

const MANIFEST = {
  id: "tv.videm.cinema",
  version: "1.6.0",
  name: "VIDEM 4K Cinema",
  description: "Infraestructura privada VIDEM en ultra alta definición 4K Remux Dolby Atmos (Curaduría VIP Latino, K-Dramas, Smart TV Friendly & Metadatos Actualizados)",
  resources: [
    "stream",
    {
      name: "meta",
      types: ["series", "movie"],
      idPrefixes: ["tt"]
    }
  ],
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

function fetchRawJson(url, timeoutMs = 4500) {
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
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(null);
    });
  });
}

function queryJsonUrl(url, timeoutMs = 5500) {
  return fetchRawJson(url, timeoutMs).then(parsed =>
    parsed && Array.isArray(parsed.streams) ? parsed : { streams: [] }
  );
}

// Traducir IDs "tmdb:12345" o "tmdb:12345:1:1" a su "tt..." (IMDb ID) para que Torrentio/Peerflix encuentren todos los enlaces
async function resolveImdbIdIfNeeded(type, rawId) {
  const cleanId = rawId.replace(/\.json$/i, '');
  if (!cleanId.startsWith('tmdb:')) return rawId;

  const parts = cleanId.split(':'); // ["tmdb", "12345", "1", "1"]
  const baseTmdbId = `${parts[0]}:${parts[1]}`;
  const suffix = parts.length > 2 ? `:${parts.slice(2).join(':')}` : '';

  try {
    const tmdbMetaUrl = `https://tmdb.elfhosted.com/%7B%22language%22%3A%22es-MX%22%7D/meta/${type}/${baseTmdbId}.json`;
    const data = await fetchRawJson(tmdbMetaUrl, 3500);
    const imdbId = data?.meta?.imdb_id || data?.meta?.links?.find(l => /imdb\.com\/title\/(tt\d+)/i.test(l.url || ''))?.url?.match(/(tt\d+)/i)?.[1];
    if (imdbId && imdbId.startsWith('tt')) {
      return `${imdbId}${suffix}.json`;
    }
  } catch (e) {}
  return rawId;
}

function buildCometConfigBase64(token, region = 'latam') {
  const preferredLangs = region === 'es'
    ? ["es", "multi", "es-419", "en"]
    : ["es-419", "la", "multi", "en", "pt", "ko", "ja"];

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

async function fetchMultiEngineStreams(type, rawId, rdToken, region = 'latam') {
  const token = rdToken || DEMO_RD_TOKEN;
  const id = await resolveImdbIdIfNeeded(type, rawId);
  const cometB64 = buildCometConfigBase64(token, region);

  // 1. Torrentio Prioritario según región (Solo enlaces 100% en caché instantáneo RD+ para evitar enlaces que no cargan)
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
  // 6. Addon Latam (34 sitios web hispanos en Español Latino para películas clásicas, novelas, doramas y anime)
  const urlAddonLatam = `${ADDON_LATAM_BASE}/stream/${type}/${id}`;

  const [resTPrimary, resTSecondary, resPeerflix, resComet, resTdb, resLatam] = await Promise.all([
    queryJsonUrl(urlTorrentioPrimary, 5000),
    queryJsonUrl(urlTorrentioSecondary, 5500),
    queryJsonUrl(urlPeerflix, 5000),
    queryJsonUrl(urlCometDmm, 5500),
    queryJsonUrl(urlTorrentsDb, 5000),
    region === 'latam' ? queryJsonUrl(urlAddonLatam, 8000) : Promise.resolve({ streams: [] })
  ]);

  let combined = [
    ...(resTPrimary.streams || []),
    ...(resLatam.streams || []),
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
    // Exigir URL HTTP directa en caché CDN (descartar torrents P2P crudos o [RD download] sin semillas que no cargan)
    if (!s || !s.url || /\[rd\s*download\]/i.test(s.name || '')) continue;

    // Limpiar colas HTML malformadas en enlaces directos y descartar enlaces okcdn.ru atados a IP de servidor
    s.url = String(s.url).split(/&quot;|"|'/)[0].trim();
    if (/okcdn\.ru\/.*\/srcIp\//i.test(s.url)) continue;

    const fullText = `${s.name || ''} ${s.title || ''} ${s.description || ''} ${s.behaviorHints?.filename || ''}`;
    // Si estamos consultando una película, descartar packs de series infiltrados por palabra clave (ej. "DRAGON BALL Z: Complete 1989-2019 Series" en "Red Dragon")
    if (type === 'movie' && /complete\s+\d{4}-\d{4}\s+series|dragon\s*ball\s*z|\bs\d{2}e\d{2}\b/i.test(fullText)) {
      continue;
    }
    // Descartar enlaces de aviso o "Idioma sin confirmar" de baja confianza si ya hay opciones confirmadas
    if (/acceso no es válido|acceso no autorizado|solicitar contenido/i.test(fullText)) {
      continue;
    }

    const isFromLatamWeb = (s.name || '') === 'Addon Latam';
    const hashMatch = (s.url || '').match(/\/([a-fA-F0-9]{40})\//);
    const rawFirstLine = ((s.title || s.description || '').split('\n')[0] || '').replace(/^📄\s*/, '').trim();
    const normalizeReleaseKey = (str) => String(str || '')
      .toLowerCase()
      .replace(/\.(mkv|mp4|avi|mov|m4v|ts)$/i, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    const firstLineTitle = normalizeReleaseKey(rawFirstLine);
    const fileHint = normalizeReleaseKey(s.behaviorHints?.filename || rawFirstLine);
    const dedupKey = isFromLatamWeb
      ? s.url
      : (hashMatch ? `${hashMatch[1].toLowerCase()}` : (fileHint || s.url || s.infoHash));

    if (seenKeys.has(dedupKey) || (!isFromLatamWeb && firstLineTitle.length > 12 && seenKeys.has(firstLineTitle)) || (!isFromLatamWeb && fileHint.length > 12 && seenKeys.has(fileHint))) continue;
    seenKeys.add(dedupKey);
    if (!isFromLatamWeb && firstLineTitle.length > 12) seenKeys.add(firstLineTitle);
    if (!isFromLatamWeb && fileHint.length > 12) seenKeys.add(fileHint);
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

  // 1.5. Endpoint de Metadatos Actualizados (/meta/:type/:id) para corregir carátulas congeladas y series antológicas (ej. Monster)
  const metaMatch = urlPath.match(/meta\/([^\/]+)\/([^\/]+)/) || rawUrl.match(/meta\/([^\/]+)\/([^\/]+)/);
  if (metaMatch) {
    const type = metaMatch[1];
    let id = metaMatch[2];
    if (!id.endsWith('.json')) id += '.json';
    const cleanId = id.replace(/\.json$/i, '');

    try {
      const cinemetaData = await fetchRawJson(`https://v3-cinemeta.strem.io/meta/${type}/${id}`, 4000);
      const meta = cinemetaData?.meta;
      if (!meta) {
        sendJson(200, { meta: {} });
        return;
      }

      // Curaduría especial para series antológicas donde cada temporada cambia de historia/protagonista (ej. Monster: tt13207736)
      if (cleanId === 'tt13207736') {
        const monsterSeasonMap = {
          1: 'T1: Jeffrey Dahmer',
          2: 'T2: Hnos. Menéndez',
          3: 'T3: Ed Gein',
          4: 'T4: Lizzie Borden'
        };
        meta.name = 'Monstruos (Antología: Dahmer • Menéndez • Ed Gein • Lizzie Borden)';
        meta.poster = 'https://image.tmdb.org/t/p/w500/fBshLiEJcjdfrU3qQBIINcePSsm.jpg';
        meta.description = 'Serie antológica de crímenes reales creada por Ryan Murphy:\n• Temporada 1: La historia de Jeffrey Dahmer (2022)\n• Temporada 2: La historia de Lyle y Erik Menéndez (2024)\n• Temporada 3: La historia de Ed Gein (2025)\n• Temporada 4: La historia de Lizzie Borden (2026)';
        if (Array.isArray(meta.videos)) {
          meta.videos = meta.videos.map(v => {
            const sLabel = monsterSeasonMap[v.season] || `Temporada ${v.season}`;
            const epTitle = v.name || v.title || `Episodio ${v.number || v.episode || ''}`;
            return {
              ...v,
              name: `[${sLabel}] ${epTitle}`,
              title: `[${sLabel}] ${epTitle}`
            };
          });
        }
      }

      sendJson(200, { meta });
    } catch (e) {
      sendJson(200, { meta: {} });
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
        const filenameRaw = stream.behaviorHints?.filename || '';
        const streamUrl = stream.url || '';
        const text = `${stream.name || ''} ${displayTitle} ${filenameRaw}`;
        const lower = text.toLowerCase();
        const filenameLower = `${filenameRaw} ${(displayTitle.split('\n')[0] || '')}`.toLowerCase();

        // 0. Detectar idiomas extranjeros específicos, grupos rusos/asiáticos, hardsubs y enlaces web HLS dudosos
        const hasCyrillicOrRusStudio = /[а-яА-ЯёЁ]|rutracker|rutor|softbox|dublik|gears\s*media|ideafilm|newstudio|baibako|lostfilm|hdrezka|coldfilm/i.test(text);
        const hasRussian = hasCyrillicOrRusStudio || /\brus\b/i.test(text) || displayTitle.includes('🇷🇺');
        const hasChineseHardsub = /中字|dygangs|1lou|qqhdtv|国英韩/i.test(text);
        const hasHardsubs = hasChineseHardsub || /(?:\bhc\b|hardsub|korsub|engsub|burned[\s._-]*sub)/i.test(lower);

        const isFromLatamWeb = (stream.name || '') === 'Addon Latam';
        const isWebHlsM3u8 = /\.m3u8(\?|$)|vimeos\.net\/hls/i.test(streamUrl);
        const isUnreliableWebMirror = isFromLatamWeb && isWebHlsM3u8;
        const isLatamWebCastellanoUrl = isFromLatamWeb && /[-_.]cast[-_.]/i.test(streamUrl);

        // 1. Detección previa de idiomas extranjeros para evitar falsos positivos
        const hasFrench = /french|français|\bfr\b|\bvfi\b|\bvfq\b|\bvff\b|torrent9|vostfr|truefrench/i.test(lower) || displayTitle.includes('🇫🇷');
        const hasPolish = /polish|lektor|polski|\bpl\b|besttorrents|\bcz\b|sktorrent|-colo\b/i.test(lower) || displayTitle.includes('🇵🇱');
        const hasItalian = /italian|\bita\b|mircrew|corsarone|avvocata|\bdlmux\b|licdom/i.test(lower) || displayTitle.includes('🇮🇹');
        const hasPortuguese = /portugu|dublado|dual[\s.-]*pt|\bpt-br\b|\bpor\b|o\.grande\.mestre|bludv|comandotorrents|guyzo|ricksz/i.test(lower) || displayTitle.includes('🇧🇷') || displayTitle.includes('🇵🇹');
        const hasTurkish = /\bturkish\b|\btur\b/i.test(lower) || displayTitle.includes('🇹🇷');
        const hasHindi = /hindi|tamil|telugu/i.test(lower) || displayTitle.includes('🇮🇳');
        const hasGerman = /german|deutsch|\bger\b/i.test(lower) || displayTitle.includes('🇩🇪');

        // 2. Detección estricta de Audio Español Latino vs Falsos Latinos (Solo subtítulos o Multi-Audio extranjero)
        const isLatamWebSubtitled = isFromLatamWeb && /\bsubtitulado\b/i.test(displayTitle);
        const isLatamWebUnconfirmed = isFromLatamWeb && /idioma sin confirmar/i.test(displayTitle);

        // Tags explícitos de audio latino real / confirmado (Doblaje, Dual Lat, DDP Latino, trackers especializados)
        // OJO: multi-audio o dual-audio sin 'lat' NO es latino; y los filenames sintéticos de Addon Latam (.m3u8) NO cuentan como Debrid confirmado
        const hasExplicitAudioLatinoTrack = !isFromLatamWeb && (
          /audio[\s:._-]*lat|latino[\s:._-]*audio|dual[\s:._-]*(?:audio[\s:._-]*)?lat|multi[\s:._-]*(?:audio[\s:._-]*)?lat|doblaje[\s:._-]*lat|latino[\s:._-]*ddp|latino[\s:._-]*ac3|latino[\s:._-]*5\.1|latino[\s:._-]*eac3|cinecalidad|pelisenhd|hackstore|mega1080p|compucalitv|yaske|pedrop/i.test(lower) ||
          (/dual[\s:._-]*lat/i.test(lower) && !/sub/i.test(lower))
        );

        // Detección de Falso Latino: cuando el release tiene 'latino' pero solo en los subtítulos
        const isOnlySubtitledLatino = (
          /(?:sub(?:s|title|titles|titul(?:o|os|ado|ada))?(?:[\s._-]|al)*latino|latino(?:[\s._-]|al)*sub(?:s|title|titles|titul(?:o|os|ado))?|sub(?:s|title|titles)?[\s:._-]*es-?419|vose[\s._-]*latino|softsub[\s._-]*lat|sub[\s._-]*spa|\[sub[\s._-]*lat\]|\.lat\.sub|\blat[\s._-]*sub\b|lat-eng\s*sub)/i.test(lower) ||
          (lower.includes('subtitul') && lower.includes('latino') && !hasExplicitAudioLatinoTrack) ||
          (lower.includes('softsub') && lower.includes('latino') && !hasExplicitAudioLatinoTrack) ||
          lower.includes('latino.sub') ||
          lower.includes('latino-sub') ||
          isLatamWebSubtitled
        ) && !hasExplicitAudioLatinoTrack;

        const hasLatinoFlag = displayTitle.includes('🇲🇽') || displayTitle.includes('🇨🇴') || displayTitle.includes('🇦🇷') || displayTitle.includes('🇨🇱') || displayTitle.includes('🇵🇪') || displayTitle.includes('💃');
        const hasExplicitLatinoWord = /latino|audio[\s.-]*lat|dual[\s.-]*lat|es-419|es-la|latin[\s.-]*america|\blat\b|cinecalidad|pelisenhd|hackstore|latinoamerica|mega1080p/i.test(lower);
        const hasForeignAudioConflict = (hasFrench || hasItalian || hasGerman || hasPortuguese || hasRussian || hasPolish || hasHindi) && !hasExplicitAudioLatinoTrack;

        // Solo es audio latino si NO es subtitulado, NO tiene conflicto extranjero, NO es una URL castellana disfrazada y está confirmado
        const isLatinoAny = !hasCyrillicOrRusStudio && !isOnlySubtitledLatino && !hasForeignAudioConflict && !isLatamWebCastellanoUrl && (hasExplicitAudioLatinoTrack || hasLatinoFlag || hasExplicitLatinoWord);

        const isNativeLatino = isLatinoAny && !hasRussian && !hasPolish && !hasItalian && !hasGerman && !hasFrench && !hasPortuguese;
        const isMultiTrackLatino = isLatinoAny && !isNativeLatino;

        // 3. Detección de Español de España / Castellano
        // Evitar falso positivo en Remux internacionales (ej. Criterion, CiNEPHiLES, FraMeSToR) donde Torrentio pone bandera 🇪🇸 solo por subtítulos
        const hasSpainFlag = displayTitle.includes('🇪🇸');
        const hasSpainTrackerOrTag = /castellano|\bcast\b|es-es|\bspa\b|\besp\b|\[es\]|mejortorrent|estrenosdtl|wolfmax|newpct|dontorrent|grantorrent|elitetorrent|sinsitio|zonapelis|maxitorrent|atomohd|atomixhq|pctmix|descargas2020|\bbddr\b|-ddr\b/i.test(lower);
        const hasSpanishWordInFilename = /castellano|\bcast\b|spanish|español|\besp\b|\bspa\b|es-es|dual|multi/i.test(filenameLower);
        const isInternationalSceneRemux = /criterion|cinephiles|framestor|epsilon|bluranium|playbd|wildcat|sm737|sphd/i.test(filenameLower);
        const isLikelySubOnlySpainFlag = hasSpainFlag && !hasSpainTrackerOrTag && !hasSpanishWordInFilename && (isInternationalSceneRemux || /remux|uhd[\s._-]*bluray/i.test(filenameLower));

        const isOnlySubtitledCastellano = (
          (/vose|vostfr|sub[\s._-]*castellano|castellano[\s._-]*sub/i.test(lower) && !/dual|multi|audio[\s:._-]*castellano|doblaje[\s:._-]*castellano/i.test(lower)) ||
          isLikelySubOnlySpainFlag
        );
        const isCastellano = !hasCyrillicOrRusStudio && !isLatinoAny && !isOnlySubtitledLatino && !isOnlySubtitledCastellano && (
          isLatamWebCastellanoUrl || hasSpainFlag || hasSpainTrackerOrTag || /spanish|español/i.test(lower)
        );

        // 4. Detección de Multi-Audio de plataformas de streaming (Netflix / Amazon WEB-DL)
        const isStreamingMulti = /nf\.web|amzn\.web|atvp\.web|dsnp\.web/i.test(lower) && (/multi|dual/i.test(lower) || displayTitle.includes('🌎')) && !isLatinoAny && !isCastellano && !hasRussian && !hasPolish && !hasItalian && !hasFrench && !hasGerman && !hasPortuguese && !hasHindi && !hasChineseHardsub;

        let langTag = '';
        let priority = 0;
        let bucket = 'other';
        let customNote = '';

        if (isUnreliableWebMirror) {
          // Enlaces HLS .m3u8 de servidores web (ej. vimeos.net): alta probabilidad de película distinta o baja calidad.
          // Nunca desplazan a Real-Debrid; solo quedan como alternativa de respaldo claramente advertida.
          langTag = '⚡ CALIDAD MEDIA (WEB)';
          priority = 60;
          bucket = 'fallback_web';
          customNote = '⚠️ Alternativa Web de Calidad Media • Usar solo si las opciones VIDEM principales no están dobladas';
        } else if (isNativeLatino) {
          if (hasExplicitAudioLatinoTrack) {
            langTag = '🇲🇽 AUDIO LATINO';
            priority = region === 'es' ? 100 : 380;
            bucket = 'latino';
            customNote = '🇲🇽 Audio en Español Latino Confirmado (Reproducción Directa)';
          } else if (isFromLatamWeb) {
            langTag = '🇲🇽 AUDIO LATINO (WEB)';
            priority = region === 'es' ? 85 : 220;
            bucket = 'latino';
            customNote = '🇲🇽 Audio en Español Latino (Servidor Web Alternativo • Calidad Media)';
          } else {
            langTag = '🇲🇽 AUDIO LATINO';
            priority = region === 'es' ? 95 : 300;
            bucket = 'latino';
            customNote = '🇲🇽 Audio en Español Latino';
          }
          if (/la\.casa\.de\.la\.pradera/i.test(lower)) {
            langTag = '🇲🇽 OTRO TÍTULO';
            priority = 20;
            bucket = 'other';
          }
        } else if (isMultiTrackLatino) {
          langTag = '🇲🇽 LATINO (MULTI-PISTA)';
          priority = region === 'es' ? 90 : 255;
          bucket = 'latino';
          customNote = '🔊 Incluye Español Latino (Si inicia en inglés, elige Español Latino en el ícono de audio)';
        } else if (isOnlySubtitledLatino) {
          langTag = '🇺🇸 ORIGINAL (SUBTITULADA LATINO)';
          priority = 160;
          bucket = 'original';
          customNote = '💬 Audio Original • Incluye Subtítulos en Español Latino';
        } else if (isOnlySubtitledCastellano) {
          langTag = '🇪🇸 VOSE (SUBTITULADA)';
          priority = region === 'es' ? 220 : 155;
          bucket = 'original';
          customNote = '💬 Versión Original con Subtítulos en Español (VOSE)';
        } else if (isCastellano) {
          langTag = region === 'es' ? '🇪🇸 CASTELLANO' : '⚠️ AUDIO ESPAÑA';
          priority = region === 'es' ? 300 : 75;
          bucket = 'spain';
          customNote = region === 'es'
            ? '🇪🇸 Audio en Castellano (España)'
            : '⚠️ Doblaje Español de España (Castellano Ibérico)';
          if (/the grandmaster/i.test(lower)) {
            langTag = '🇪🇸 THE GRANDMASTER (2013)';
            priority = 30;
            bucket = 'other';
          } else if (/el juego del asesino|squid game[\s.-]*the challenge|el desafio/i.test(lower)) {
            langTag = '🇪🇸 SPIN-OFF / ALT';
            priority = 25;
            bucket = 'other';
          }
        } else if (isStreamingMulti) {
          langTag = '🌎 MULTI-AUDIO (STREAMING)';
          priority = 210;
          bucket = 'original';
          customNote = '🌎 Multi-Audio Oficial + Subtítulos';
        } else if (!hasRussian && !hasFrench && !hasPolish && !hasItalian && !hasGerman && !hasHindi && !hasChineseHardsub) {
          bucket = 'original';
          customNote = '💬 Audio Original • Activa Subtítulos en Español en el reproductor';
          if (displayTitle.includes('🇰🇷') || /\bkorean\b|\bkor\b|k-drama|boys[\s.-]*over[\s.-]*flowers/i.test(lower)) {
            langTag = '🇰🇷 ORIGINAL (SUBTITULADA)';
            priority = 150;
          } else if (displayTitle.includes('🇯🇵') || /\bjapanese\b|\bjpn\b/i.test(lower)) {
            langTag = '🇯🇵 ORIGINAL (SUBTITULADA)';
            priority = 150;
          } else if (displayTitle.includes('🇨🇳') || /\bchinese\b|\bchi\b/i.test(lower)) {
            langTag = '🇨🇳 ORIGINAL (SUBTITULADA)';
            priority = 150;
          } else if (hasTurkish) {
            langTag = '🇹🇷 ORIGINAL (SUBTITULADA)';
            priority = 148;
          } else if (hasPortuguese) {
            langTag = '🇧🇷 PORTUGUÉS (ORIGINAL)';
            priority = 138;
          } else {
            langTag = region === 'es' ? '🇺🇸 VOSE (SUBTITULADA)' : '🇺🇸 ORIGINAL (SUBTITULADA)';
            priority = 145;
          }
        } else {
          langTag = '🌐 OTRO IDIOMA';
          priority = 20;
          bucket = 'other';
        }

        // 5. Detección precisa de Resolución (corrigiendo falso 4K en "UHD BluRay 1080p" y tracker 'Wolfmax4k')
        const lowerClean = lower.replace(/wolfmax4k/g, '');
        let resBadge = '1080p';
        if (/2160p|uhdremux/i.test(lowerClean)) resBadge = '4K';
        else if (/1080p/i.test(lowerClean)) resBadge = '1080p';
        else if (/\b4k\b|\buhd\b/i.test(lowerClean)) resBadge = '4K';
        else if (/720p/i.test(lowerClean)) resBadge = '720p';
        else if (/480p|\bxvid\b|\bavi\b|\bsd\b/i.test(lowerClean)) resBadge = 'SD/720p';

        if (resBadge === '4K') priority += 10;
        else if (resBadge === '1080p') priority += 8;
        else if (resBadge === '720p') priority += 2;
        else priority -= 5;

        // 6. Análisis de Compatibilidad Smart TV (LG webOS / Samsung Tizen) vs Cine Puro (Remux)
        const videoSizeBytes = Number(stream.behaviorHints?.videoSize || 0);
        const isRemux = /remux/i.test(lowerClean);
        const isHeavyFile = videoSizeBytes > 32 * 1024 * 1024 * 1024; // >32 GB
        const hasDolbyVision = /\bdv\b|dovi|dolby[\s._-]*vision/i.test(lowerClean);
        const hasHdr10Fallback = /hdr10|hdr\b/i.test(lowerClean);
        const isDolbyVisionMkvOnly = hasDolbyVision && !/\.mp4\b/i.test(lowerClean) && !hasHdr10Fallback;
        const isDtsOrTrueHdOnly = /dts-hd|dts\.hd|dts:x|\bdts\b|truehd/i.test(lowerClean) && !/ddp|eac3|ac3|aac|dd5\.1|dd\+5\.1/i.test(lowerClean);
        const isAv1 = /\bav1\b|svt-av1/i.test(lowerClean);
        const isCometProxy = /comet\.elfhosted\.com\/playback\//i.test(streamUrl);
        const isDirectRdResolver = /torrentio\.strem\.fun\/resolve\/realdebrid|torrentsdb\.com|peerflix\.mov/i.test(streamUrl);
        const isWebDlOrBluray = /web-dl|webdl|bluray|blu-ray|bdremux|nf\.web|amzn\.web/i.test(lowerClean);

        const isAviLegacy = /\.avi\b|\bxvid\b|\bdivx\b/i.test(lowerClean);
        const isSmartTvFriendly = !isRemux && !isHeavyFile && !isDtsOrTrueHdOnly && !isDolbyVisionMkvOnly && !isAv1 && !isAviLegacy && !hasHardsubs && !isWebHlsM3u8;
        const isCompatLight = (resBadge === '1080p' || resBadge === '720p' || resBadge === 'SD/720p') && isSmartTvFriendly && (!videoSizeBytes || videoSizeBytes <= 8 * 1024 * 1024 * 1024);

        if (isSmartTvFriendly) priority += 18;
        if (isDirectRdResolver) priority += 10;
        if (isCometProxy) priority -= 6; // Comet proxy puede perder seeking/memoria en LG webOS frente a enlace directo RD
        if (isWebDlOrBluray) priority += 4;

        // Penalizar códecs que bloquean LG webOS para que no queden solos en Opción #1
        if (isDtsOrTrueHdOnly) priority -= 12;
        if (isDolbyVisionMkvOnly) priority -= 10;
        if (isAv1) priority -= 18;
        if (hasHardsubs) {
          priority -= 85;
          customNote = `${customNote ? customNote + ' • ' : ''}⚠️ Puede incluir subtítulos incrustados en el video`;
        }

        const hasAtmosOrLossless = /atmos|truehd|dts-hd|dts:x|flac/i.test(lowerClean);
        const hasSurround51 = /ddp\s*5\.1|dd\+\s*5\.1|eac3\s*5\.1|ac3\s*5\.1|\b5\.1\b|\b7\.1\b/i.test(lowerClean);
        let audioBadge = '';

        if (hasAtmosOrLossless) {
          priority += 2;
          audioBadge = ' • ATMOS';
        } else if (hasSurround51) {
          priority += 4;
          audioBadge = ' • 5.1';
        }

        const isInstantCached = /\[rd\+\]|\[rd⚡\]/i.test(stream.name || '');
        if (isInstantCached) priority += 15;
        if (isLatamWebUnconfirmed) priority -= 25;

        // Añadir indicador transparente cuando el archivo es Remux/exigente o cuando es alta compatibilidad
        let compatTag = '';
        if (isRemux || isDtsOrTrueHdOnly || isHeavyFile) {
          compatTag = ' • CINE PURO';
          customNote = `${customNote ? customNote + '\n' : ''}💎 Alto Bitrate / Remux (Ideal para Fire TV 4K, TV Box, Apple TV o PC; en Smart TVs LG/Samsung prueba la opción Calidad Media si no abre)`;
        } else if (isAv1) {
          customNote = `${customNote ? customNote + '\n' : ''}ℹ️ Códec AV1 (Requiere TV moderno o TV Box/PC)`;
        } else if (isCompatLight && bucket !== 'fallback_web') {
          compatTag = ' • COMPATIBLE';
        }

        const lines = displayTitle.split('\n').map(l => l.trim()).filter(Boolean);
        const cleanFirstLine = isFromLatamWeb
          ? `${lines[1] || lines[0] || ''} (${lines[0] || 'Servidor Web'})`
          : (lines[0] || '').replace(/^📄\s*/, '').trim();
        const enhancedTitle = customNote
          ? `${customNote}\n🎬 ${cleanFirstLine}`
          : displayTitle;

        return {
          ...stream,
          name: `✦ VIDEM ${resBadge} • ${langTag}${audioBadge}${compatTag}`,
          title: enhancedTitle,
          _priority: priority,
          _bucket: bucket,
          _res: resBadge,
          _smartTvFriendly: isSmartTvFriendly,
          _compatLight: isCompatLight,
          _isRemuxOrHeavy: isRemux || isHeavyFile || isDtsOrTrueHdOnly
        };
      }

      const scoredStreams = rawStreams
        .map(detectLanguageAndBadge)
        .filter(s => s._bucket !== 'other')
        .sort((a, b) => b._priority - a._priority);

      // =========================================================================
      // CURADURÍA CONCIERGE VIP: Máximo 5 opciones balanceadas (Smart TV + Cine Puro + Calidad Media)
      // =========================================================================
      const latinoList = scoredStreams.filter(s => s._bucket === 'latino');
      const spainList = scoredStreams.filter(s => s._bucket === 'spain');
      const originalList = scoredStreams.filter(s => s._bucket === 'original');
      const fallbackWebList = scoredStreams.filter(s => s._bucket === 'fallback_web');

      // Seleccionar balance óptimo:
      // 1) Mejor opción Smart TV Friendly (4K o 1080p limpio para LG/Samsung)
      // 2) Alternativa Calidad Media / Alta Compatibilidad (1080p/720p ligero con disclaimer)
      // 3) Opción 4K Remux / Cine Puro si existe (para Fire TV / TV Box / PC)
      function pickDiverseResolutions(list, maxCount) {
        if (list.length <= maxCount) return list;
        const picked = [];
        const bestSmartTv = list.find(s => s._smartTvFriendly);
        const bestCompatLight = list.find(s => s._compatLight && s !== bestSmartTv);
        const best4k = list.find(s => s._res === '4K' && s !== bestSmartTv && s !== bestCompatLight);

        if (bestSmartTv) picked.push(bestSmartTv);
        if (bestCompatLight && picked.length < maxCount) picked.push(bestCompatLight);
        if (best4k && picked.length < maxCount) picked.push(best4k);

        for (const item of list) {
          if (picked.length >= maxCount) break;
          if (!picked.includes(item)) picked.push(item);
        }
        return picked;
      }

      let curated = [];
      if (region === 'es') {
        // Perfil España: Hasta 3 en Castellano + 2 en VOSE Original
        curated = [
          ...pickDiverseResolutions(spainList, 3),
          ...pickDiverseResolutions(originalList, 2),
          ...(spainList.length === 0 ? latinoList.slice(0, 1) : [])
        ];
      } else {
        // Perfil Latinoamérica:
        // Si hay Español Latino verificado (Debrid o MKV directo): Hasta 3 en Latino + 2 en Original
        // Si NO hay Latino verificado: 3 en Original (Smart TV + Calidad Media + 4K) + máximo 1 en Castellano advertido + máximo 1 fallback web si existe
        if (latinoList.length > 0) {
          curated = [
            ...pickDiverseResolutions(latinoList, 3),
            ...pickDiverseResolutions(originalList, 2)
          ];
        } else {
          curated = [
            ...pickDiverseResolutions(originalList, 3),
            ...spainList.slice(0, 1),
            ...(originalList.length === 0 ? fallbackWebList.slice(0, 1) : [])
          ];
        }
      }

      // Etiquetar explícitamente la opción de Calidad Media / Alta Compatibilidad cuando convive con opciones 4K/Remux
      const hasHeavyOption = curated.some(s => s._isRemuxOrHeavy || s._res === '4K');
      if (hasHeavyOption) {
        const compatOption = curated.find(s => s._compatLight && !s._isRemuxOrHeavy && s._res !== '4K');
        if (compatOption && !/CALIDAD MEDIA/i.test(compatOption.title || '')) {
          compatOption.title = `⚡ Calidad Media / Alta Compatibilidad (Recomendada para Smart TVs LG/Samsung o Wi-Fi estable)\n${compatOption.title}`;
        }
      }

      // Si el título antiguo solo tenía enlaces en Ruso u otros idiomas bloqueados: Mostrar Tarjeta Concierge VIP Bajo Pedido (nunca enlaces rusos)
      if (curated.length === 0) {
        const waContact = region === 'es' ? '+34 746 05 77 76' : '+57 301 556 8904';
        sendJson(200, {
          streams: [
            {
              name: "✦ VIDEM CONCIERGE",
              title: `🎩 TÍTULO CLÁSICO BAJO PEDIDO\nEste título clásico no tiene copia pública verificada en Español/Original (se filtraron pistas en ruso).\n💬 Escríbenos a WhatsApp (${waContact}) y lo cargamos en tu Bóveda Privada VIDEM.`,
              behaviorHints: { notWebReady: true }
            }
          ]
        });
        return;
      }

      const brandedStreams = curated.map(({ _priority, _bucket, _res, _smartTvFriendly, _compatLight, _isRemuxOrHeavy, ...s }) => s);

      sendJson(200, { streams: brandedStreams });
    } catch (err) {
      sendJson(200, { streams: [] });
    }
    return;
  }

  // Ruta por defecto si entra al root del addon
  sendJson(200, MANIFEST);
};
