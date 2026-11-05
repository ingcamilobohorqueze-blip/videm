/**
 * MOTOR CURADOR DE PARRILLA M3U - TREX IPTV (90 DÍAS)
 * Lee directamente iptv/PARRILLA-CANALES.md como fuente de verdad:
 * - Incluye únicamente los canales marcados con [x] o [X]
 * - Soporta diales exactos (ej. 130, 601) y diales automáticos terminados en XX (ej. 3XX, 7XX)
 * - Incluye sección 24/7 (COPS en Español, Just For Laughs Gags, Impractical Jokers, etc.)
 * - Incluye sección 900 PPV Dinámica (filtra canales vacíos "- NO EVENT STREAMING -")
 * - Transporte HLS (.m3u8) anti-congelamiento + Logos Oficiales + Guía EDT/EPG Colombia/LatAm
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const config = require('./config');

const { host: TREX_HOST, port: TREX_PORT, username: TREX_USER, password: TREX_PASS } = config.credentials;

let cachedM3UByFormat = {};
let lastFetchTime = 0;
let lastMdMtime = 0;

function fetchTrexStreams() {
  return new Promise((resolve, reject) => {
    const apiPath = `/player_api.php?username=${TREX_USER}&password=${TREX_PASS}&action=get_live_streams`;
    const req = http.get({
      host: TREX_HOST,
      port: TREX_PORT,
      path: apiPath,
      headers: { 'User-Agent': config.userAgent },
      timeout: 25000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve([]);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); resolve([]); });
  });
}

function resolveEpgAndLogo(stream, customTitle = '') {
  const targetText = `${customTitle} ${stream.name || ''}`;
  let epgId = (stream.epg_channel_id || '').trim();
  let logo = (stream.stream_icon || '').trim();

  for (const rule of (config.channelCatalog || [])) {
    if (rule.match.test(targetText)) {
      if (rule.epgId) epgId = rule.epgId;
      if (rule.logo) logo = rule.logo;
      break;
    }
  }

  return { epgId, logo };
}

function parseParrillaMarkdown() {
  const mdPath = path.join(__dirname, 'PARRILLA-CANALES.md');
  const content = fs.readFileSync(mdPath, 'utf8');
  const lines = content.split(/\r?\n/);

  let currentGroup = '📺 Parrilla Principal';
  const entries = [];
  const usedDials = new Set();

  for (const line of lines) {
    const h2Match = line.match(/^##\s+\d+\.\s+(.+?)(?:\s*\(Dial.*\))?$/);
    if (h2Match) {
      currentGroup = h2Match[1].trim();
      continue;
    }

    const itemMatch = line.match(/^\s*-\s*\[([xX])\]\s*\*\*([0-9xX]+)\*\*\s*—\s*(.+)$/);
    if (!itemMatch) continue;

    let rawDial = itemMatch[2].trim();
    const rest = itemMatch[3].trim();

    const titleMatch = rest.match(/^\*\*([^*]+)\*\*/);
    const title = titleMatch ? titleMatch[1].trim() : rest.replace(/\*.*$/, '').trim();

    // Resolver diales con XX automáticamente (ej. 3XX -> 341, 7XX -> 739)
    let dialNum = parseInt(rawDial, 10);
    if (/[xX]/.test(rawDial) || isNaN(dialNum)) {
      const prefixDigits = rawDial.replace(/[xX]+/g, '');
      let base = (parseInt(prefixDigits || '8', 10) * 100) + 1;
      while (usedDials.has(base)) base++;
      dialNum = base;
    }
    usedDials.add(dialNum);

    // Extraer IDs explícitos de TREX entre backticks `12345` si están documentados en la línea
    const idMatches = [];
    const idSectionMatch = rest.match(/IDs?\s+TREX:([^)]+)/i);
    if (idSectionMatch) {
      const tickRegex = /`(\d+)`/g;
      let m;
      while ((m = tickRegex.exec(idSectionMatch[1])) !== null) {
        idMatches.push(Number(m[1]));
      }
    }

    entries.push({
      dial: dialNum,
      title,
      group: currentGroup,
      streamIds: idMatches,
      rawLine: rest
    });
  }

  return entries;
}

function isLivePpvEvent(name) {
  if (!name) return false;
  const upper = name.toUpperCase().trim();
  if (
    upper.startsWith('END |') ||
    upper.startsWith('END:') ||
    upper.includes('| END |') ||
    upper.includes('NO EVENT') ||
    upper.includes('OFFLINE') ||
    upper.includes('#####') ||
    upper.includes('INFO ') ||
    upper.endsWith('INFO')
  ) {
    return false;
  }
  return (
    upper.includes('NEXT') ||
    upper.includes('LIVE') ||
    upper.includes(' VS ') ||
    upper.includes(' VS. ') ||
    upper.includes(' @ ')
  );
}

function buildCleanM3U(streams, format = config.streamOptions.defaultFormat) {
  const epgUrls = config.endpoints.epgXmltv;
  let m3u = `#EXTM3U url-tvg="${epgUrls}" x-tvg-url="${epgUrls}" name="${config.subscription.playlistName}"\n\n`;

  const streamById = new Map();
  streams.forEach(s => streamById.set(Number(s.stream_id), s));

  const entries = parseParrillaMarkdown();

  const appendChannel = (stream, displayTitle, group, dial) => {
    const { epgId, logo } = resolveEpgAndLogo(stream, displayTitle);
    const streamUrl = format === 'ts'
      ? `http://${TREX_HOST}:${TREX_PORT}/${TREX_USER}/${TREX_PASS}/${stream.stream_id}.ts`
      : `http://${TREX_HOST}:${TREX_PORT}/live/${TREX_USER}/${TREX_PASS}/${stream.stream_id}.m3u8`;

    const chnoAttr = dial ? ` tvg-chno="${dial}"` : '';
    const label = dial ? `${dial} - ${displayTitle}` : displayTitle;

    m3u += `#EXTINF:-1${chnoAttr} tvg-id="${epgId}" tvg-name="${label}" tvg-logo="${logo}" group-title="${group}" reconnect="true",${label}\n`;
    if (config.streamOptions.httpReconnect) {
      m3u += `#EXTVLCOPT:http-reconnect=true\n`;
    }
    if (config.streamOptions.networkCachingMs) {
      m3u += `#EXTVLCOPT:network-caching=${config.streamOptions.networkCachingMs}\n`;
    }
    m3u += `${streamUrl}\n\n`;
  };

  for (const entry of entries) {
    // Manejo especial para diales 901-904 (Eventos PPV Dinámicos)
    if (entry.dial >= 901 && entry.dial <= 904) {
      let ppvStreams = [];
      if (entry.dial === 901) {
        // Disney+ / ESPN+ / Conmebol Fanatiz
        ppvStreams = streams.filter(s => ['2460', '2028', '2202'].includes(String(s.category_id)) && isLivePpvEvent(s.name)).slice(0, 15);
      } else if (entry.dial === 902) {
        // Eventos DAZN (España & USA)
        ppvStreams = streams.filter(s => ['1520', '1521'].includes(String(s.category_id)) && isLivePpvEvent(s.name)).slice(0, 15);
      } else if (entry.dial === 903) {
        // Eventos TUDN / ViX Deportes & PPV LatAm
        const fixedVix = [1369550, 1369549, 1369548, 1369547, 543974, 543975, 543976, 543977, 543978]
          .map(id => streamById.get(id))
          .filter(Boolean);
        const liveVix = streams.filter(s => String(s.category_id) === '2368' && isLivePpvEvent(s.name)).slice(0, 12);
        ppvStreams = [...liveVix, ...fixedVix];
      } else if (entry.dial === 904) {
        // Otros PPV USA (UFC / Boxeo / Fite TV / MLS)
        const fite247 = streamById.get(437271) || streamById.get(1387198);
        const liveUsa = streams.filter(s => ['1592', '668', '2270'].includes(String(s.category_id)) && isLivePpvEvent(s.name)).slice(0, 15);
        ppvStreams = [...(fite247 ? [fite247] : []), ...liveUsa];
      }

      ppvStreams.forEach((s, idx) => {
        const cleanEventName = (s.name || '').replace(/\|\s*8K EXCLUSIVE/gi, '').trim();
        appendChannel(s, cleanEventName, entry.group, entry.dial);
      });
      continue;
    }

    // 1. Si el renglón tiene IDs explícitos de TREX
    if (entry.streamIds && entry.streamIds.length > 0) {
      const isMultiChannelLine = entry.dial === 602 || /[\/&]|(\b1\s+y\s+2\b)/i.test(entry.title);
      const idsToEmit = isMultiChannelLine ? entry.streamIds : [entry.streamIds[0]];

      idsToEmit.forEach((id, idx) => {
        const s = streamById.get(id);
        if (!s) return;
        let displayTitle = entry.title;
        if (idsToEmit.length > 1) {
          if (entry.dial === 602) {
            displayTitle = `Win Sports+ HD (Señal Alterna ${idx + 1})`;
          } else {
            const cleanRaw = (s.name || '').replace(/^(LAT|CO|MXC|ARG|US|VIX|PRIME|TV|YP)\|\s*/i, '').replace(/ᴿᴬᵂ/g, '').trim();
            displayTitle = cleanRaw || `${entry.title} (${idx + 1})`;
          }
        }
        appendChannel(s, displayTitle, entry.group, entry.dial);
      });
      continue;
    }

    // 2. Búsqueda automática en TREX para canales nuevos agregados con XX sin ID explícito
    const searchKey = entry.title
      .replace(/\(.*?\)/g, '')
      .replace(/\b(HD|FHD|4K|24\/7)\b/gi, '')
      .trim()
      .toUpperCase();

    if (searchKey.length >= 2) {
      const preferredCats = new Set(['154', '166', '151', '2171', '152', '2338', '1667', '2186', '1611']);
      const candidates = streams.filter(s => {
        const n = (s.name || '').toUpperCase();
        return n.includes(searchKey) && (preferredCats.has(String(s.category_id)) || /^(CO|LAT|MXC|ARG|VIX|US|PRIME)\|/i.test(n));
      });
      if (candidates.length > 0) {
        appendChannel(candidates[0], entry.title, entry.group, entry.dial);
      }
    }
  }

  return m3u;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=1800');

  const sendText = (status, text) => {
    if (res.status && res.send) return res.status(status).send(text);
    res.writeHead(status, { 'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8' });
    res.end(text);
  };

  const reqUrl = (req && req.url) ? req.url : '';
  const format = reqUrl.includes('output=ts') ? 'ts' : config.streamOptions.defaultFormat;

  let currentMdMtime = 0;
  try {
    currentMdMtime = fs.statSync(path.join(__dirname, 'PARRILLA-CANALES.md')).mtimeMs;
  } catch (e) {}

  const now = Date.now();
  if (
    cachedM3UByFormat[format] &&
    (now - lastFetchTime < config.cacheTtlMs) &&
    currentMdMtime === lastMdMtime
  ) {
    return sendText(200, cachedM3UByFormat[format]);
  }

  try {
    const streams = await fetchTrexStreams();
    if (!streams || streams.length === 0) {
      if (cachedM3UByFormat[format]) return sendText(200, cachedM3UByFormat[format]);
      return sendText(500, '#EXTM3U\n# Error al conectar con el servidor TREX');
    }

    cachedM3UByFormat = {
      hls: buildCleanM3U(streams, 'hls'),
      ts: buildCleanM3U(streams, 'ts')
    };
    lastFetchTime = now;
    lastMdMtime = currentMdMtime;
    return sendText(200, cachedM3UByFormat[format]);
  } catch (err) {
    if (cachedM3UByFormat[format]) return sendText(200, cachedM3UByFormat[format]);
    return sendText(500, '#EXTM3U\n# Error: ' + err.message);
  }
};
