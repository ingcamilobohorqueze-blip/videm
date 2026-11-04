const http = require('http');

// Configuración de la cuenta TREX
const TREX_HOST = 'line.prim01.com';
const TREX_PORT = 80;
const TREX_USER = '493da0239d';
const TREX_PASS = '69b4dd0ebc7f';

let cachedM3U = null;
let lastFetchTime = 0;

function fetchTrexStreams() {
  return new Promise((resolve, reject) => {
    const path = `/player_api.php?username=${TREX_USER}&password=${TREX_PASS}&action=get_live_streams`;
    const req = http.get({
      host: TREX_HOST,
      port: TREX_PORT,
      path: path,
      headers: { 'User-Agent': 'TiviMate/4.7.0' },
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

function buildCleanM3U(streams) {
  let m3u = '#EXTM3U name="VIDEM TREX VIP"\n\n';

  // Categorías y Filtros seleccionados
  // 154 = LAT| COLOMBIA
  // 151 = LAT| MEXICO
  // 152 = LAT| ARGENTINA
  // 166 = LAT| CULTURA / DOCU
  // 2171 = LAT| MEXICO VIP
  // 2368 = LAT| VIX PPV

  const targetCats = new Set(['154', '151', '152', '166', '2171', '2368']);

  const vipStreams = streams.filter(s => {
    const name = (s.name || '').toUpperCase();
    const cat = String(s.category_id);

    // 1. Canal favorito del usuario: Investigation Discovery (ID)
    if (
      name.includes('INVESTIGATION DISCOVERY') || 
      name.includes('DISCOVERY ID') ||
      name === 'LAT| INVESTIGATION DISCOVERY HD' ||
      name === 'US| ID HD'
    ) {
      // Evitar estaciones de radio/locales de Idaho
      if (!name.includes('BOISE') && !name.includes('TWIN FALLS') && !name.includes('IDAHO')) {
        return true;
      }
    }

    // 2. Canales de Colombia
    if (cat === '154') return true; 

    // 3. Deportes VIP específicos
    if (
      name.includes('WIN SPORTS') || 
      name.includes('DSPORTS') || 
      name.includes('DIRECTV SPORTS') ||
      name.includes('ESPN') ||
      name.includes('FOX SPORTS') ||
      name.includes('TYC SPORTS') ||
      name.includes('TUDN') ||
      name.includes('CLARO SPORTS')
    ) {
      if (name.includes('LAT') || name.includes('CO|') || name.includes('AR|') || name.includes('MX|') || name.includes('US|')) {
        return true;
      }
    }

    // 4. Cine & Documentales Prémium en Español
    if (targetCats.has(cat)) {
      if (
        name.includes('HBO') || 
        name.includes('UNIVERSAL') || 
        name.includes('DISCOVERY') || 
        name.includes('HISTORY') ||
        name.includes('NATIONAL GEO') ||
        name.includes('STAR CHANNEL') ||
        name.includes('WARNER') ||
        name.includes('SONY')
      ) {
        return true;
      }
    }

    return false;
  });

  vipStreams.forEach(s => {
    let group = 'Entretenimiento VIP';
    const name = (s.name || '').toUpperCase();

    if (String(s.category_id) === '154' || name.includes('CO|') || name.includes('COLOMBIA')) {
      group = '🇨🇴 Colombia HD';
    } else if (name.includes('SPORTS') || name.includes('ESPN') || name.includes('WIN') || name.includes('TYC') || name.includes('TUDN')) {
      group = '⚽ Deportes VIP';
    } else if (name.includes('INVESTIGATION DISCOVERY') || name.includes('DISCOVERY') || name.includes('HISTORY') || name.includes('NATIONAL')) {
      group = '🕵️ Cultura & ID';
    } else if (name.includes('HBO') || name.includes('CINEMA') || name.includes('MOVIE') || name.includes('UNIVERSAL') || name.includes('STAR')) {
      group = '🎬 Cine & Series';
    }

    const streamUrl = `http://${TREX_HOST}:${TREX_PORT}/${TREX_USER}/${TREX_PASS}/${s.stream_id}.ts`;
    const logo = s.stream_icon || '';
    const epgId = s.epg_channel_id || '';

    m3u += `#EXTINF:-1 tvg-id="${epgId}" tvg-name="${s.name}" tvg-logo="${logo}" group-title="${group}",${s.name}\n`;
    m3u += `${streamUrl}\n\n`;
  });

  return m3u;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=1800'); // Cache 30 mins

  const now = Date.now();
  if (cachedM3U && (now - lastFetchTime < 1800000)) {
    return res.status(200).send(cachedM3U);
  }

  try {
    const streams = await fetchTrexStreams();
    if (!streams || streams.length === 0) {
      if (cachedM3U) return res.status(200).send(cachedM3U);
      return res.status(500).send('#EXTM3U\n# Error al conectar con el servidor TREX');
    }

    cachedM3U = buildCleanM3U(streams);
    lastFetchTime = now;
    return res.status(200).send(cachedM3U);
  } catch (err) {
    if (cachedM3U) return res.status(200).send(cachedM3U);
    return res.status(500).send('#EXTM3U\n# Error: ' + err.message);
  }
};
