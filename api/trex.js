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
  let m3u = '#EXTM3U name="VIDEM PARRILLA TOTAL (DIRECTV/CLARO/MOVISTAR)"\n\n';

  // Categorías relevantes en Trex:
  // 154 = LAT| COLOMBIA
  // 151 = LAT| MEXICO
  // 152 = LAT| ARGENTINA
  // 166 = LAT| CULTURA / DOCU
  // 2171 = LAT| MEXICO VIP
  // 2368 = LAT| VIX PPV
  // 1334 = SPORTS EVENTS

  const targetCats = new Set(['154', '151', '152', '166', '2171', '2368', '1667']);

  const vipStreams = streams.filter(s => {
    const name = (s.name || '').toUpperCase();
    const cat = String(s.category_id);

    // Evitar estaciones locales de radio en USA
    if (name.includes('BOISE') || name.includes('TWIN FALLS') || name.includes('IDAHO')) return false;
    // Evitar idiomas no hispanos
    if (name.match(/\b(SWE|DNK|NOR|FIN|PL|RU|HINDI|FR|BE|NL|RO|ALB|RS|MO|GR|BR|BG|IS|CZ|ARABIC|TURK)\b/)) return false;

    // 1. Canal favorito: Investigation Discovery (ID)
    if (name.includes('INVESTIGATION DISCOVERY') || name.includes('DISCOVERY ID') || name === 'LAT| INVESTIGATION DISCOVERY HD' || name === 'US| ID HD') {
      return true;
    }

    // 2. Todos los canales de Colombia (Caracol, RCN, Win, Dsports, Citytv, etc.)
    if (cat === '154') return true;

    // 3. Parrilla Deportiva Total (Directv Sports/Dsports, Win Sports, ESPN, Fox, Claro, TyC, TUDN, DAZN, etc.)
    if (
      name.includes('DSPORTS') ||
      name.includes('DIRECTV SPORTS') ||
      name.includes('WIN SPORTS') ||
      name.includes('WINSPORTS') ||
      name.includes('ESPN') ||
      name.includes('FOX SPORTS') ||
      name.includes('CLARO SPORTS') ||
      name.includes('TYC SPORTS') ||
      name.includes('TUDN') ||
      name.includes('DAZN') ||
      name.includes('GOLTV') ||
      name.includes('NBA TV') ||
      name.includes('F1') ||
      name.includes('LALIGA') ||
      name.includes('PREMIER LEAGUE')
    ) {
      if (name.includes('LAT') || name.includes('CO|') || name.includes('AR|') || name.includes('MX|') || name.includes('US|') || name.includes('ES|')) {
        return true;
      }
    }

    // 4. Parrilla Cable / Satélite (DirecTV / Claro / Movistar: Cine, Series, Documentales, Infantiles)
    if (targetCats.has(cat)) {
      if (
        name.includes('HBO') ||
        name.includes('UNIVERSAL') ||
        name.includes('STAR CHANNEL') ||
        name.includes('WARNER') ||
        name.includes('SONY') ||
        name.includes('PARAMOUNT') ||
        name.includes('CINECANAL') ||
        name.includes('SPACE') ||
        name.includes('TNT') ||
        name.includes('AXN') ||
        name.includes('FX') ||
        name.includes('A&E') ||
        name.includes('DISCOVERY') ||
        name.includes('ANIMAL PLANET') ||
        name.includes('NATIONAL GEO') ||
        name.includes('NAT GEO') ||
        name.includes('HISTORY') ||
        name.includes('TLC') ||
        name.includes('DISNEY') ||
        name.includes('CARTOON') ||
        name.includes('NICKELODEON') ||
        name.includes('NICK') ||
        name.includes('CNN') ||
        name.includes('TELEMUNDO') ||
        name.includes('UNIVISION')
      ) {
        return true;
      }
    }

    return false;
  });

  vipStreams.forEach(s => {
    let group = 'Entretenimiento VIP';
    const name = (s.name || '').toUpperCase();

    if (name.includes('INVESTIGATION DISCOVERY') || name.includes('DISCOVERY ID') || name.includes('ID HD')) {
      group = '🕵️ Cultura & ID';
    } else if (String(s.category_id) === '154' || name.includes('CO|') || name.includes('COLOMBIA')) {
      group = '🇨🇴 Colombia (Nacionales & TDT)';
    } else if (
      name.includes('SPORTS') || 
      name.includes('ESPN') || 
      name.includes('WIN') || 
      name.includes('TYC') || 
      name.includes('TUDN') || 
      name.includes('DSPORTS') || 
      name.includes('DIRECTV') ||
      name.includes('DAZN')
    ) {
      group = '⚽ Deportes VIP (Parrilla Total)';
    } else if (
      name.includes('HBO') || 
      name.includes('CINEMA') || 
      name.includes('MOVIE') || 
      name.includes('UNIVERSAL') || 
      name.includes('STAR') ||
      name.includes('WARNER') ||
      name.includes('SONY') ||
      name.includes('TNT') ||
      name.includes('SPACE') ||
      name.includes('AXN')
    ) {
      group = '🎬 Cine & Series (DirecTV / Claro)';
    } else if (
      name.includes('DISCOVERY') || 
      name.includes('HISTORY') || 
      name.includes('NATIONAL') || 
      name.includes('NAT GEO') ||
      name.includes('ANIMAL')
    ) {
      group = '🌍 Documentales & Ciencia';
    } else if (name.includes('DISNEY') || name.includes('CARTOON') || name.includes('NICK')) {
      group = '🧒 Infantiles';
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
