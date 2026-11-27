const https = require('https');

const SUPABASE_URL = 'https://crkkakwpiggnbuwqopsc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNya2tha3dwaWdnbmJ1d3FvcHNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzQzNTg3MSwiZXhwIjoyMTA5MDExODcxfQ.n4yTSUUIC4QL-_UKPJSs2qvPwCNJVoFcf-kbZqEpRo4';
const DEMO_RD_TOKEN = '76N4SFYLKTKDADDLDIAGR6MDKCG7VQT2FMEGTQDQM3X5U2PFU6QQ';
const DEMO_PHONE = '573015568904';
const ADDON_LATAM_BASE = 'https://addonlatam.duckdns.org/FaIqffOcY0y_S5WfVLrsXq6s';

// Caché en memoria para respuesta ultra rápida (<20ms)
let cachedStatus = 'demo_active';
let lastCheckTime = 0;
const latamCache = new Map(); // Caché de 20 min para Addon Latam (evita timeouts repetidos de duckdns)
const LATAM_CACHE_TTL = 20 * 60 * 1000;
const movieMetaCache = new Map(); // Caché de 24h para año/título oficial de películas (evita infiltrados de remakes como Batman 1989 en 2022)
const MOVIE_META_CACHE_TTL = 24 * 60 * 60 * 1000;

const MANIFEST = {
  id: "tv.videm.cinema",
  version: "1.7.5",
  name: "VIDEM 4K Cinema",
  description: "Infraestructura privada VIDEM en ultra alta definición 4K Remux Dolby Atmos (Audio Latino, Subtítulos Sincronizados, Smart TV Friendly & Metadatos Actualizados)",
  resources: [
    "stream",
    "subtitles",
    {
      name: "meta",
      types: ["series", "movie"],
      idPrefixes: ["tt"]
    }
  ],
  types: ["movie", "series", "anime"],
  idPrefixes: ["tt", "kitsu", "tmdb:"],
  catalogs: [],
  background: "https://videm.tv/assets/images/hero-home-theater.jpeg",
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
  // Configuración compacta para mantener URLs de Comet cortas (<900 chars) y 100% compatibles con Stremio Android TV / Desktop
  const cometConfigObj = {
    debridService: "realdebrid",
    debridApiKey: token,
    cachedOnly: true,
    removeTrash: true
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
  // 6. Addon Latam (caché 20 min + timeout estricto de 3.5s para no colgar Stremio ni Vercel cuando duckdns está lento)
  const urlAddonLatam = `${ADDON_LATAM_BASE}/stream/${type}/${id}`;
  const queryAddonLatamCached = async () => {
    const cacheKey = `${type}:${id}`;
    const hit = latamCache.get(cacheKey);
    if (hit && Date.now() - hit.ts < LATAM_CACHE_TTL) return hit.data;
    const data = await queryJsonUrl(urlAddonLatam, 3500);
    if (data && Array.isArray(data.streams) && data.streams.length > 0) {
      latamCache.set(cacheKey, { ts: Date.now(), data });
      if (latamCache.size > 200) {
        const firstKey = latamCache.keys().next().value;
        latamCache.delete(firstKey);
      }
    }
    return data;
  };

  // 7. Torrentio Global en paralelo (0ms de espera extra; garantiza siempre copias 4K/1080p Real-Debrid sin riesgo de timeout)
  const urlTorrentioGlobal = `https://torrentio.strem.fun/qualityfilter=cam,scr%7Cdebridoptions=nodownloadlinks%7Crealdebrid=${token}/stream/${type}/${id}`;

  // 8. Metadatos oficiales de película en paralelo (para filtrar infiltrados de remakes/otros años, ej. Batman 1989 en The Batman 2022)
  const queryMovieMetaCached = async () => {
    if (type !== 'movie') return null;
    const cleanMovieId = id.replace(/\.json$/i, '');
    if (!cleanMovieId.startsWith('tt')) return null;
    const hit = movieMetaCache.get(cleanMovieId);
    if (hit && Date.now() - hit.ts < MOVIE_META_CACHE_TTL) return hit.data;
    const data = await fetchRawJson(`https://v3-cinemeta.strem.io/meta/movie/${cleanMovieId}.json`, 2500);
    const meta = data?.meta;
    if (meta) {
      const yearMatch = String(meta.year || meta.releaseInfo || '').match(/(19\d{2}|20[0-3]\d)/);
      const parsed = {
        name: String(meta.name || ''),
        year: yearMatch ? parseInt(yearMatch[1], 10) : null
      };
      movieMetaCache.set(cleanMovieId, { ts: Date.now(), data: parsed });
      if (movieMetaCache.size > 500) {
        const firstKey = movieMetaCache.keys().next().value;
        movieMetaCache.delete(firstKey);
      }
      return parsed;
    }
    return null;
  };

  const [resTPrimary, resTSecondary, resPeerflix, resComet, resTdb, resLatam, resTGlobal, movieMeta] = await Promise.all([
    queryJsonUrl(urlTorrentioPrimary, 4000),
    queryJsonUrl(urlTorrentioSecondary, 4000),
    queryJsonUrl(urlPeerflix, 4000),
    queryJsonUrl(urlCometDmm, 4500),
    queryJsonUrl(urlTorrentsDb, 3800),
    region === 'latam' ? queryAddonLatamCached() : Promise.resolve({ streams: [] }),
    region === 'latam' ? queryJsonUrl(urlTorrentioGlobal, 4000) : Promise.resolve({ streams: [] }),
    queryMovieMetaCached()
  ]);

  // Extraer hashes confirmados en caché Real-Debrid desde Comet (cachedOnly: true)
  // CRÍTICO: Nunca devolvemos URLs crudas de comet.elfhosted.com/playback/... porque ElfHosted bloquea por IP
  // ("Opened on a different connection: Expected IP = IP de Vercel"). Usamos Comet solo como verificador de caché RD para Peerflix.
  const cometCachedHashes = new Set();
  for (const cs of (resComet.streams || [])) {
    const bgMatch = String(cs?.behaviorHints?.bingeGroup || '').match(/([a-fA-F0-9]{40})/);
    if (bgMatch) {
      cometCachedHashes.add(bgMatch[1].toLowerCase());
    }
  }

  // Enriquecer Peerflix: Peerflix etiqueta todo como "[RD download]" desde que RD quitó instantAvailability,
  // aunque el torrent esté 100% cacheado (y resuelve directo a *.download.real-debrid.com sin bloqueo de IP).
  const normalizedPeerflixStreams = (resPeerflix.streams || []).map(ps => {
    const hashMatch = String(ps?.url || '').match(/\/([a-fA-F0-9]{40})\//);
    const isCachedInComet = hashMatch && cometCachedHashes.has(hashMatch[1].toLowerCase());
    if (isCachedInComet && /\[rd\s*download\]/i.test(ps.name || '')) {
      return {
        ...ps,
        name: ps.name.replace(/\[rd\s*download\]/i, '[RD+]')
      };
    }
    return ps;
  });

  let combined = [
    ...(resTPrimary.streams || []),
    ...(normalizedPeerflixStreams),
    ...(resLatam.streams || []),
    ...(resTSecondary.streams || []),
    ...(resTdb.streams || []),
    ...(resTGlobal.streams || [])
  ];

  // Deduplicar enlaces equivalentes y filtrar contaminación de packs de series cuando se consulta una película
  const seenKeys = new Set();
  const uniqueStreams = [];

  for (const s of combined) {
    // Exigir URL HTTP directa en caché CDN (descartar torrents P2P crudos, enlaces IP-locked de ElfHosted Comet,
    // y [RD download] de Torrentio sin caché, pero permitir Peerflix /realdebrid/ ya que Peerflix etiqueta todos sus enlaces RD como [RD download])
    const isPeerflixRd = /addon\.peerflix\.mov\/realdebrid\//i.test(s?.url || '');
    if (!s || !s.url || /comet\.elfhosted\.com\/playback\//i.test(s.url) || (!isPeerflixRd && /\[rd\s*download\]/i.test(s.name || ''))) continue;

    // Limpiar colas HTML malformadas en enlaces directos y descartar mirrors rotos (okcdn.ru atados a IP y Rumble con audio mutilado/mudo)
    s.url = String(s.url).split(/&quot;|"|'/)[0].trim();
    if (/okcdn\.ru\/.*\/srcIp\/|cdn\.rumble\.cloud|1a-1791\.com/i.test(s.url)) continue;

    const fullText = `${s.name || ''} ${s.title || ''} ${s.description || ''} ${s.behaviorHints?.filename || ''}`;
    // Si estamos consultando una película, descartar packs de series infiltrados por palabra clave (ej. "DRAGON BALL Z: Complete 1989-2019 Series" en "Red Dragon")
    if (type === 'movie' && /complete\s+\d{4}-\d{4}\s+series|dragon\s*ball\s*z|\bs\d{2}e\d{2}\b/i.test(fullText)) {
      continue;
    }
    // Si estamos consultando una película con año oficial conocido, descartar remakes/versiones de otro año (ej. Batman 1989 infiltrado en The Batman 2022)
    if (type === 'movie' && movieMeta?.year) {
      const releaseHeader = `${(s.title || s.description || '').split('\n')[0] || ''} ${s.behaviorHints?.filename || ''}`;
      const yearMatches = releaseHeader.match(/\b(19\d{2}|20[0-3]\d)\b/g);
      if (yearMatches && yearMatches.length > 0) {
        const titleYears = new Set((movieMeta.name.match(/\b(19\d{2}|20[0-3]\d)\b/g) || []).map(Number));
        const candidateYears = yearMatches.map(Number).filter(y => !titleYears.has(y));
        if (candidateYears.length > 0) {
          const hasMatchingYear = candidateYears.some(y => Math.abs(y - movieMeta.year) <= 1);
          if (!hasMatchingYear) continue;
        }
      }
    }
    // Descartar enlaces de aviso o "Idioma sin confirmar" de baja confianza si ya hay opciones confirmadas
    if (/acceso no es válido|acceso no autorizado|solicitar contenido/i.test(fullText)) {
      continue;
    }

    const isFromLatamWeb = (s.name || '') === 'Addon Latam';
    const hashMatch = (s.url || '').match(/\/([a-fA-F0-9]{40})(?:\/|\?|$)/);
    const effectiveHash = s._cometHash || (hashMatch ? hashMatch[1].toLowerCase() : null);
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
      : (effectiveHash || fileHint || s.url || s.infoHash);

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

  // 1.8. Endpoint de Subtítulos Sincronizados (/subtitles/:type/:id/:extra?.json)
  // Garantiza subtítulos en Español (priorizando coincidencia exacta por videoHash/videoSize) en TODAS las pantallas
  const subMatch = urlPath.match(/subtitles\/([^\/]+)\/([^\/]+)(?:\/(.+))?/) || rawUrl.match(/subtitles\/([^\/]+)\/([^\/]+)(?:\/(.+))?/);
  if (subMatch) {
    const type = subMatch[1];
    const rawSubId = subMatch[2].replace(/\.json$/i, '');
    const rawExtra = subMatch[3] ? subMatch[3].replace(/\.json$/i, '') : '';
    try {
      const resolvedId = (await resolveImdbIdIfNeeded(type, rawSubId)).replace(/\.json$/i, '');
      const hashUrl = rawExtra
        ? `https://opensubtitles-v3.strem.io/subtitles/${type}/${resolvedId}/${rawExtra}.json`
        : `https://opensubtitles-v3.strem.io/subtitles/${type}/${resolvedId}.json`;
      const baseUrl = `https://opensubtitles-v3.strem.io/subtitles/${type}/${resolvedId}.json`;

      const [resHash, resBase] = await Promise.all([
        fetchRawJson(hashUrl, 4500),
        rawExtra ? fetchRawJson(baseUrl, 4500) : Promise.resolve(null)
      ]);

      const combinedSubs = [
        ...(resHash?.subtitles || []),
        ...(resBase?.subtitles || [])
      ];

      const seenSubUrls = new Set();
      const spanishSubs = [];
      const englishSubs = [];

      for (const sub of combinedSubs) {
        if (!sub || !sub.url || seenSubUrls.has(sub.url)) continue;
        seenSubUrls.add(sub.url);
        const lang = String(sub.lang || '').toLowerCase();
        if (lang === 'spa' || lang === 'es' || lang === 'es-419' || lang === 'es-es' || lang.includes('spanish')) {
          spanishSubs.push({ ...sub, lang: 'spa' });
        } else if (lang === 'eng' || lang === 'en') {
          englishSubs.push(sub);
        }
      }

      // Devolver primero hasta 12 subtítulos en Español (hash exacto primero) + 2 en Inglés de respaldo
      sendJson(200, { subtitles: [...spanishSubs.slice(0, 12), ...englishSubs.slice(0, 2)] });
    } catch (e) {
      sendJson(200, { subtitles: [] });
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

        const isOnlySubtitledCastellano = !hasFrench && !hasRussian && !hasGerman && !hasItalian && !hasPolish && (
          (/vose|sub[\s._-]*castellano|castellano[\s._-]*sub/i.test(lower) && !/dual|multi|audio[\s:._-]*castellano|doblaje[\s:._-]*castellano/i.test(lower)) ||
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
        if (isDirectRdResolver) priority += 12;
        if (isCometProxy) priority -= 50; // Nunca preferir proxy IP-locked de Comet
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
        if (isFromLatamWeb) {
          // Priorizar CDNs estables (Cloudflare Workers / Google Drive Index / cdn.vids.st) sobre /redirect/ que suelen cortarse
          if (/workers\.dev|cdn\.vids\.st/i.test(streamUrl)) priority += 35;
          else if (/addonlatam\.duckdns\.org\/px\/|pluto\.tv/i.test(streamUrl)) priority += 15;
        }
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
          // Si los únicos enlaces latinos son de servidores web externos (Addon Latam, no Real-Debrid),
          // mostrar máximo 1 opción web Latino (evitando llenar el Top 3 con mirrors piratas) + 3 opciones Real-Debrid limpias
          const debridLatino = latinoList.filter(s => (s.name || '').indexOf('(WEB)') === -1);
          if (debridLatino.length > 0) {
            curated = [
              ...pickDiverseResolutions(debridLatino, 3),
              ...pickDiverseResolutions(originalList, 2)
            ];
          } else {
            curated = [
              ...latinoList.slice(0, 2),
              ...pickDiverseResolutions(originalList, 2),
              ...spainList.slice(0, 1)
            ];
          }
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

      const brandedStreams = curated.map(({ _priority, _bucket, _res, _smartTvFriendly, _compatLight, _isRemuxOrHeavy, _cometHash, description, ...s }) => s);

      sendJson(200, { streams: brandedStreams });
    } catch (err) {
      sendJson(200, { streams: [] });
    }
    return;
  }

  // Ruta por defecto si entra al root del addon
  sendJson(200, MANIFEST);
};
