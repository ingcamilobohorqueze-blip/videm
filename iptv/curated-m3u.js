/**
 * MOTOR CURADOR DE PARRILLA M3U & SERVIDOR EPG XML - TREX IPTV (90 DÍAS)
 * Lee directamente iptv/PARRILLA-CANALES.md como fuente de verdad:
 * - Incluye únicamente los canales marcados con [x] o [X]
 * - Soporta ?epg=xml para entregar la Guía EPG descomprimida en XML puro (requerido por MyIPTV Player en Windows 11)
 * - Compatible 100% con MyIPTV Player (Windows 11), TiviMate, Televizo y OTT Navigator
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const zlib = require('zlib');
const config = require('./config');

const { host: TREX_HOST, port: TREX_PORT, username: TREX_USER, password: TREX_PASS } = config.credentials;

let cachedM3UByKey = {};
let lastFetchTime = 0;
let lastMdMtime = 0;

let cachedEpgXml = null;
let lastEpgFetchTime = 0;
const EPG_CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas

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

function fetchUncompressedColombiaEpg() {
  return new Promise((resolve, reject) => {
    const req = https.get(config.endpoints.epgColombiaUrl, { timeout: 20000 }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error('EPG upstream status ' + res.statusCode));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks);
          const xml = zlib.gunzipSync(buffer).toString('utf8');
          resolve(xml);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout descargando EPG')); });
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

    let dialNum = parseInt(rawDial, 10);
    if (/[xX]/.test(rawDial) || isNaN(dialNum)) {
      const prefixDigits = rawDial.replace(/[xX]+/g, '');
      let base = (parseInt(prefixDigits || '8', 10) * 100) + 1;
      while (usedDials.has(base)) base++;
      dialNum = base;
    }
    usedDials.add(dialNum);

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

function buildCleanM3U(streams, format = config.streamOptions.defaultFormat, includeVlcOpts = false) {
  const epgUrls = config.endpoints.epgXmltv;
  let m3u = `#EXTM3U url-tvg="${epgUrls}" x-tvg-url="${epgUrls}" name="${config.subscription.playlistName}"\n\n`;

  const streamById = new Map();
  streams.forEach(s => streamById.set(Number(s.stream_id), s));

  const entries = parseParrillaMarkdown();

  const appendChannel = (stream, displayTitle, group, dial) => {
    const { epgId, logo } = resolveEpgAndLogo(stream, displayTitle);
    const streamUrl = format === 'hls'
      ? `http://${TREX_HOST}:${TREX_PORT}/live/${TREX_USER}/${TREX_PASS}/${stream.stream_id}.m3u8`
      : `http://${TREX_HOST}:${TREX_PORT}/${TREX_USER}/${TREX_PASS}/${stream.stream_id}.ts`;

    const chnoAttr = dial ? ` tvg-chno="${dial}"` : '';
    const label = dial ? `${dial} - ${displayTitle}` : displayTitle;
    const tvgName = epgId || displayTitle;

    m3u += `#EXTINF:-1${chnoAttr} tvg-id="${epgId}" tvg-name="${tvgName}" tvg-logo="${logo}" group-title="${group}",${label}\n`;
    if (includeVlcOpts) {
      if (config.streamOptions.httpReconnect) {
        m3u += `#EXTVLCOPT:http-reconnect=true\n`;
      }
      if (config.streamOptions.networkCachingMs) {
        m3u += `#EXTVLCOPT:network-caching=${config.streamOptions.networkCachingMs}\n`;
      }
    }
    m3u += `${streamUrl}\n\n`;
  };

  for (const entry of entries) {
    if (entry.dial >= 901 && entry.dial <= 904) {
      let ppvStreams = [];
      if (entry.dial === 901) {
        ppvStreams = streams.filter(s => ['2460', '2028', '2202'].includes(String(s.category_id)) && isLivePpvEvent(s.name)).slice(0, 15);
      } else if (entry.dial === 902) {
        ppvStreams = streams.filter(s => ['1520', '1521'].includes(String(s.category_id)) && isLivePpvEvent(s.name)).slice(0, 15);
      } else if (entry.dial === 903) {
        const fixedVix = [1369550, 1369549, 1369548, 1369547, 543974, 543975, 543976, 543977, 543978]
          .map(id => streamById.get(id))
          .filter(Boolean);
        const liveVix = streams.filter(s => String(s.category_id) === '2368' && isLivePpvEvent(s.name)).slice(0, 12);
        ppvStreams = [...liveVix, ...fixedVix];
      } else if (entry.dial === 904) {
        const fite247 = streamById.get(437271) || streamById.get(1387198);
        const liveUsa = streams.filter(s => ['1592', '668', '2270'].includes(String(s.category_id)) && isLivePpvEvent(s.name)).slice(0, 15);
        ppvStreams = [...(fite247 ? [fite247] : []), ...liveUsa];
      }

      ppvStreams.forEach((s) => {
        const cleanEventName = (s.name || '').replace(/\|\s*8K EXCLUSIVE/gi, '').trim();
        appendChannel(s, cleanEventName, entry.group, entry.dial);
      });
      continue;
    }

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
            const cleanRaw = (s.name || '').replace(/^(LAT|CO|MXC|ARG|US|VIX|PRIME|TV|YP|CAR-AMP)\|\s*/i, '').replace(/ᴿᴬᵂ/g, '').trim();
            displayTitle = cleanRaw || `${entry.title} (${idx + 1})`;
          }
        }
        appendChannel(s, displayTitle, entry.group, entry.dial);
      });
      continue;
    }

    const searchKey = entry.title
      .replace(/\(.*?\)/g, '')
      .replace(/\b(HD|FHD|4K|24\/7)\b/gi, '')
      .trim()
      .toUpperCase();

    if (searchKey.length >= 2) {
      const preferredCats = new Set(['154', '2171', '151', '166', '152', '2338', '1667', '2186', '1611']);
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

  const reqUrl = (req && req.url) ? req.url : '';

  // Endpoint EPG XML descomprimido para MyIPTV Player (Windows 11) y Smart TVs: /api/trex?epg=xml
  if (reqUrl.includes('epg=xml') || reqUrl.includes('epg=1')) {
    const sendXml = (status, xml) => {
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      if (res.status && res.send) return res.status(status).send(xml);
      res.writeHead(status, { 'Content-Type': 'application/xml; charset=utf-8' });
      res.end(xml);
    };

    const now = Date.now();
    if (cachedEpgXml && (now - lastEpgFetchTime < EPG_CACHE_TTL_MS)) {
      return sendXml(200, cachedEpgXml);
    }

    try {
      cachedEpgXml = await fetchUncompressedColombiaEpg();
      lastEpgFetchTime = now;
      return sendXml(200, cachedEpgXml);
    } catch (e) {
      if (cachedEpgXml) return sendXml(200, cachedEpgXml);
      return sendXml(500, '<?xml version="1.0" encoding="UTF-8"?><tv></tv>');
    }
  }

  res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=1800');

  const sendText = (status, text) => {
    if (res.status && res.send) return res.status(status).send(text);
    res.writeHead(status, { 'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8' });
    res.end(text);
  };

  const format = reqUrl.includes('output=hls') ? 'hls' : (reqUrl.includes('output=ts') ? 'ts' : config.streamOptions.defaultFormat);
  const includeVlcOpts = reqUrl.includes('vlcopt=1');
  const cacheKey = `${format}_${includeVlcOpts ? 'vlc' : 'std'}`;

  let currentMdMtime = 0;
  try {
    currentMdMtime = fs.statSync(path.join(__dirname, 'PARRILLA-CANALES.md')).mtimeMs;
  } catch (e) {}

  const now = Date.now();
  if (
    cachedM3UByKey[cacheKey] &&
    (now - lastFetchTime < config.cacheTtlMs) &&
    currentMdMtime === lastMdMtime
  ) {
    return sendText(200, cachedM3UByKey[cacheKey]);
  }

  try {
    const streams = await fetchTrexStreams();
    if (!streams || streams.length === 0) {
      if (cachedM3UByKey[cacheKey]) return sendText(200, cachedM3UByKey[cacheKey]);
      return sendText(500, '#EXTM3U\n# Error al conectar con el servidor TREX');
    }

    cachedM3UByKey = {
      ts_std: buildCleanM3U(streams, 'ts', false),
      ts_vlc: buildCleanM3U(streams, 'ts', true),
      hls_std: buildCleanM3U(streams, 'hls', false),
      hls_vlc: buildCleanM3U(streams, 'hls', true)
    };
    lastFetchTime = now;
    lastMdMtime = currentMdMtime;
    return sendText(200, cachedM3UByKey[cacheKey]);
  } catch (err) {
    if (cachedM3UByKey[cacheKey]) return sendText(200, cachedM3UByKey[cacheKey]);
    return sendText(500, '#EXTM3U\n# Error: ' + err.message);
  }
};
