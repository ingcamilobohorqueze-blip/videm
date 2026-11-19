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

// Mapa en memoria de auto-reparación (cuando un ID primario cae a black.ts, promueve el ID vivo)
let healedIdOverrides = {};

function checkTrexStreamAlive(id, timeoutMs = 1800) {
  return new Promise((resolve) => {
    const req = http.get({
      host: TREX_HOST,
      port: TREX_PORT,
      path: `/${TREX_USER}/${TREX_PASS}/${id}.ts`,
      headers: { 'User-Agent': config.userAgent },
      timeout: timeoutMs
    }, (res) => {
      const loc = res.headers.location || '';
      res.destroy();
      resolve(res.statusCode === 302 && loc.length > 0 && !loc.includes('black.ts'));
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

function fetchCoM3U() {
  return new Promise((resolve, reject) => {
    https.get('https://iptv-org.github.io/iptv/countries/co.m3u', { timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const epgUrl = config.endpoints.epgXmltv;
        let out = `#EXTM3U url-tvg="${epgUrl}" x-tvg-url="${epgUrl}" name="TDT & Cable Colombia (Lista Libre)"\n\n`;

        // 1. Inyectar arriba las señales principales 1080p estables de la cabecera TDT Colombia (138.121.15.230)
        const topTdt = [
          { id: 'Caracol.co', name: 'Caracol TV 1080p (TDT Principal)', url: 'http://138.121.15.230:9002/CARACOL/index.m3u8' },
          { id: 'RCN.co', name: 'Canal RCN 1080p (TDT Principal)', url: 'http://138.121.15.230:9002/RCN/index.m3u8' },
          { id: 'Canal.1.co', name: 'Canal 1 1080p (TDT Principal)', url: 'http://138.121.15.230:9002/CANAL-UNO/index.m3u8' }
        ];
        topTdt.forEach(c => {
          const { logo } = resolveEpgAndLogo({ name: c.name }, c.name);
          out += `#EXTINF:-1 tvg-id="${c.id}" tvg-name="${c.id}" tvg-logo="${logo}" group-title="🇨🇴 TDT Principales",${c.name}\n${c.url}\n\n`;
        });

        // 2. Filtrar enlaces muertos de co.m3u que causaban error MRL en VLC y corregir la etiqueta de ch19 (ESPN 5)
        const deadUrls = new Set([
          'http://38.187.7.252:8000/play/a03d/index.m3u8', // DSports caído
          'http://38.190.100.202:8000/play/a09v/index.m3u8', // Caracol 404 (reemplazado arriba)
          'http://168.196.127.137:6001/play/a095/index.m3u8', // TNT Series caído
          'http://38.134.250.110:8000/play/a003/index.m3u8', // Discovery Kids 404
          'http://181.78.14.26:4000/play/a00d/index.m3u8', // Caracol HD2 caído
          'http://181.78.14.26:4000/play/a07m/index.m3u8'  // RCN HD2 caído
        ]);

        const lines = data.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line.startsWith('#EXTINF')) continue;
          if (/\[Geo-blocked\]|\[Not 24\/7\]/i.test(line)) continue;

          let j = i + 1;
          while (j < lines.length && !lines[j].trim().startsWith('http') && !lines[j].trim().startsWith('#EXTINF')) j++;
          const streamUrl = (lines[j] || '').trim();
          if (!streamUrl.startsWith('http') || deadUrls.has(streamUrl)) continue;

          let extinf = line;
          if (streamUrl.includes('181.78.12.119:16123/play/ch19')) {
            extinf = extinf
              .replace(/tvg-id="[^"]*"/, 'tvg-id="ESPN.5.co"')
              .replace(/,Win\+\s*Futbol.*$/i, ',ESPN 5 / Eventos Fútbol (1080p)');
          }
          out += `${extinf}\n${streamUrl}\n\n`;
        }

        resolve(out);
      });
    }).on('error', reject);
  });
}

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
          let xml = zlib.gunzipSync(buffer).toString('utf8');

          // Duplicar mapeos de IDs para que el mismo XML sirva TANTO para videm.tv/api/trex COMO para iptv-org/countries/co.m3u
          const aliasMap = {
            'Win.Sports+.co': ['WinPlusFutbol.co@SD'],
            'Win.Sports.co': ['WinSports.co@SD'],
            'Caracol.co': ['CaracolTV.co@SD', 'CaracolHD2.co@SD'],
            'RCN.co': ['CanalRCN.co@SD', 'RCNHD2.co@SD'],
            'Canal.1.co': ['Canal1.co@SD'],
            'City.TV.co': ['CitytvBogota.co@SD'],
            'Señal.Colombia.co': ['SenalColombia.co@SD'],
            'Canal.Capital.co': ['CanalCapital.co@SD'],
            'Canal.Trece.co': ['Trece.co@SD'],
            'Canal.TRO.co': ['CanalTRO.co@SD'],
            'Teleantioquia.co': ['Teleantioquia.co@SD'],
            'TELEMEDELLIN.co': ['Telemedellin.co@SD'],
            'Telepacifico.co': ['Telepacifico.co@SD'],
            'Telecaribe.co': ['Telecaribe.co@SD'],
            'Telecafé.co': ['Telecafe.co@SD'],
            'CableNoticias.co': ['Cablenoticias.co@SD'],
            'NTN24.co': ['NTN24.co@SD'],
            'ESPN.co': ['ESPNLatinAmerica.us@Colombia'],
            'ESPN.2.co': ['ESPN2LatinAmerica.us@Colombia'],
            'ESPN.3.co': ['ESPN3LatinAmerica.us@South'],
            'ESPN.4.co': ['ESPN4LatinAmerica.us@South'],
            'ESPN.5.co': ['ESPN5LatinAmerica.us@South'],
            'ESPN.6.HD.co': ['ESPN6LatinAmerica.us@SD'],
            'ESPN.7.HD.co': ['ESPN7LatinAmerica.us@SD'],
            'STAR.CHANNEL.co': ['StarChannel.co@SD'],
            'Warner.Channel.co': ['WarnerChannel.us@Colombia'],
            'A&amp;E.co': ['AELatinAmerica.us@Panregional'],
            'AXN.co': ['AXNLatinAmerica.us@Andes'],
            'Universal.TV.co': ['UniversalTVLatinAmerica.us@Colombia'],
            'Studio.Universal.co': ['StudioUniversalLatinAmerica.us@Colombia'],
            'TNT.co': ['TNTLatinAmerica.us@Colombia'],
            'TNT.Series.co': ['TNTSeriesLatinAmerica.us@Panregional'],
            'TNT.Novelas.co': ['TNTNovelas.us@Colombia', 'TNTNovelas.us@ColombiaHD'],
            'RCN.Novelas.co': ['RCNNovelas.co@SD'],
            'Cinecanal.co': ['Cinecanal.us@Panregional'],
            'Space.co': ['Space.ar@Panregional'],
            'Discovery.Channel.co': ['DiscoveryChannelLatinAmerica.us@Panregional'],
            'History.Channel.co': ['HistoryLatinAmerica.us@Panregional'],
            'TLC.co': ['TLCLatinAmerica.us@Panregional'],
            'Comedy.Central.co': ['ComedyCentralLatinAmerica.us@Panregional'],
            'E!.Entertainment.TV.co': ['ELatinAmerica.us@Colombia'],
            'Disney.Channel.co': ['DisneyChannelLatinAmerica.ar@Panregional', 'DisneyChannelLatinAmerica.ar@Center'],
            'DISNEY.JUNIOR.co': ['DisneyJrLatinAmerica.ar@North', 'DisneyJrLatinAmerica.ar@NorthHD'],
            'Cartoon.Network.co': ['CartoonNetworkLatinAmerica.us@NorthAtlantic'],
            'Discovery.Kids.co': ['DiscoveryKidsLatinAmerica.us@Colombia'],
            'Nick.co': ['NickelodeonLatinAmerica.us@Panregional'],
            'Nick.Jr.co': ['NickJrLatinAmerica.us@Panregional']
          };

          for (const [srcId, aliases] of Object.entries(aliasMap)) {
            const chRegex = new RegExp(`<channel id="${srcId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">([\\s\\S]*?)<\\/channel>`);
            const chMatch = xml.match(chRegex);
            if (chMatch) {
              const extraChannels = aliases.map(a => `<channel id="${a}">${chMatch[1]}</channel>`).join('');
              xml = xml.replace(chMatch[0], chMatch[0] + extraChannels);
            }
            const progRegex = new RegExp(`<programme ([^>]*?)channel="${srcId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"([\\s\\S]*?)<\\/programme>`, 'g');
            xml = xml.replace(progRegex, (full, before, after) => {
              const clones = aliases.map(a => `<programme ${before}channel="${a}"${after}</programme>`).join('');
              return full + clones;
            });
          }

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

  const appendChannel = (stream, displayTitle, group, dial, customDirectUrl = null) => {
    const { epgId, logo } = resolveEpgAndLogo(stream || {}, displayTitle);
    const streamUrl = customDirectUrl || (format === 'hls'
      ? `http://${TREX_HOST}:${TREX_PORT}/live/${TREX_USER}/${TREX_PASS}/${stream.stream_id}.m3u8`
      : `http://${TREX_HOST}:${TREX_PORT}/${TREX_USER}/${TREX_PASS}/${stream.stream_id}.ts`);

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
    const tdtDirectList = config.tdtDirectByDial && config.tdtDirectByDial[entry.dial];

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
      const isMultiChannelLine =
        entry.dial === 602 ||
        (entry.dial >= 621 && entry.dial <= 625) ||
        /[\/&]|(\b1\s+y\s+2\b)/i.test(entry.title);

      const primaryId = healedIdOverrides[entry.dial] || entry.streamIds[0];
      const idsToEmit = isMultiChannelLine ? entry.streamIds : [primaryId];

      idsToEmit.forEach((id, idx) => {
        const s = streamById.get(id);
        if (!s) return;
        let displayTitle = entry.title;
        if (idsToEmit.length > 1) {
          if (entry.dial === 602) {
            displayTitle = `Win Sports+ HD (Señal Alterna ${idx + 1})`;
          } else {
            const cleanRaw = (s.name || '').replace(/^(LAT|CO|MXC|ARG|US|VIX|PRIME|TV|YP|CAR-AMP|CL)\|\s*/i, '').replace(/ᴿᴬᵂ/g, '').trim();
            displayTitle = `${entry.title} [${cleanRaw || idx + 1}]`;
          }
        }
        appendChannel(s, displayTitle, entry.group, entry.dial);
      });

      // Si es un canal nacional (130-149) con respaldo TDT estable, ponerlo DESPUÉS de la señal principal de TREX
      if (tdtDirectList && tdtDirectList.length > 0) {
        tdtDirectList.forEach(tdt => {
          appendChannel({ name: entry.title }, tdt.title, entry.group, entry.dial, tdt.url);
        });
      }
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

  // 1. Endpoint Lista Independiente Colombia (co.m3u con cabecera EPG inyectada): /api/trex?lista=co
  if (reqUrl.includes('lista=co')) {
    try {
      const coM3u = await fetchCoM3U();
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
      if (res.status && res.send) return res.status(200).send(coM3u);
      res.writeHead(200, { 'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8' });
      return res.end(coM3u);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('#EXTM3U\n# Error cargando co.m3u: ' + e.message);
    }
  }

  // 2. Endpoint Auto-Healer & Auditoría JSON ultrarrápida (<2.5s) para n8n: /api/trex?audit=json
  if (reqUrl.includes('audit=json')) {
    try {
      const startTime = Date.now();
      const allEntries = parseParrillaMarkdown().filter(e => e.streamIds && e.streamIds.length > 0);
      // Evaluar los canales con múltiples IDs de failover + deportes clave en lotes de 10 (evita rate-limit de TREX y responde en ~2s)
      const priorityEntries = allEntries.filter(e => e.streamIds.length > 1 || (e.dial >= 601 && e.dial <= 638) || (e.dial >= 502 && e.dial <= 528));
      let liveCount = 0;
      let healedCount = 0;
      const healedChannels = [];

      const batchSize = 10;
      for (let i = 0; i < priorityEntries.length; i += batchSize) {
        const batch = priorityEntries.slice(i, i + batchSize);
        await Promise.all(batch.map(async (entry) => {
          const primaryId = healedIdOverrides[entry.dial] || entry.streamIds[0];
          const ok = await checkTrexStreamAlive(primaryId, 1200);
          if (ok) {
            liveCount++;
            return;
          }
          let replacementId = null;
          for (const candId of entry.streamIds) {
            if (candId === primaryId) continue;
            if (await checkTrexStreamAlive(candId, 1200)) {
              replacementId = candId;
              break;
            }
          }
          if (replacementId) {
            healedIdOverrides[entry.dial] = replacementId;
            healedCount++;
            liveCount++;
            healedChannels.push(`Dial ${entry.dial} (${entry.title}): ${primaryId} -> ${replacementId}`);
          }
        }));
      }

      if (healedCount > 0 || reqUrl.includes('refresh=1')) {
        cachedM3UByKey = {};
        lastFetchTime = 0;
      }

      const payload = JSON.stringify({
        success: true,
        elapsedMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        totalChecked: priorityEntries.length,
        liveCount,
        healedCount,
        healedChannels,
        activeOverrides: healedIdOverrides
      }, null, 2);

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (res.status && res.send) return res.status(200).send(payload);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(payload);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: e.message }));
    }
  }

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
