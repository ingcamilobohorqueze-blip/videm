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

    // 1. Canal favorito del usuario: Investigation Discovery (ID en español y US)
    if (
      name.includes('INVESTIGATION DISCOVERY') || 
      name.includes('DISCOVERY ID') ||
      name === 'LAT| INVESTIGATION DISCOVERY HD' ||
      name === 'US| ID HD'
    ) {
      // Excluir idiomas extranjeros (sueco, danés, ruso, polaco, hindi, francés, etc.)
      const isForeign = name.match(/\b(SWE|DNK|NOR|FIN|PL|RU|HINDI|FR|BE|NL|RO|ALB|RS|MO|GR|BR|BG|IS|CZ)\b/);
      const isLocalUsRadio = name.includes('BOISE') || name.includes('TWIN FALLS') || name.includes('IDAHO');
      if (!isForeign && !isLocalUsRadio) {
        return true;
      }
    }

    // 2. Canales de Colombia
    if (cat === '154') return true; 

    // 3. Deportes VIP específicos (Solo feeds en español y top US)
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

function getOfficialLogo(name) {
  const n = (name || '').toUpperCase();
  if (n.includes('WIN SPORTS PLUS') || n.includes('WIN SPORTS+')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Win_Sports%2B_logo.png/512px-Win_Sports%2B_logo.png';
  if (n.includes('WIN SPORTS') || n.includes('WINSPORTS')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Win_Sports_logo_2019.png/512px-Win_Sports_logo_2019.png';
  if (n.includes('CARACOL')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Caracol_Televisi%C3%B3n_logo.png/512px-Caracol_Televisi%C3%B3n_logo.png';
  if (n.includes('RCN')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Canal_RCN_logo_2019.png/512px-Canal_RCN_logo_2019.png';
  if (n.includes('SEÑAL COLOMBIA') || n.includes('SENAL COLOMBIA')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Logo_Se%C3%B1al_Colombia.png/512px-Logo_Se%C3%B1al_Colombia.png';
  if (n.includes('CANAL 1') || n.includes('CANAL UNO')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Canal_1_Colombia_2017.png/512px-Canal_1_Colombia_2017.png';
  if (n.includes('CITY TV') || n.includes('CITYTV')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Logo_Citytv_2019.png/512px-Logo_Citytv_2019.png';
  if (n.includes('DIRECTV SPORTS') || n.includes('DSPORTS')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/DSports_logo_2022.png/512px-DSports_logo_2022.png';
  if (n.includes('INVESTIGATION DISCOVERY') || n.includes('DISCOVERY ID') || n.includes('ID HD')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Investigation_Discovery_2020.svg/512px-Investigation_Discovery_2020.svg.png';
  if (n.includes('ESPN 2')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/ESPN2_logo.svg/512px-ESPN2_logo.svg.png';
  if (n.includes('ESPN 3')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/ESPN3_logo.svg/512px-ESPN3_logo.svg.png';
  if (n.includes('ESPN')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/512px-ESPN_wordmark.svg.png';
  if (n.includes('FOX SPORTS')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Fox_Sports_logo_2012.svg/512px-Fox_Sports_logo_2012.svg.png';
  if (n.includes('TYC SPORTS') || n.includes('TYC')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/TyC_Sports_Logo_2018.png/512px-TyC_Sports_Logo_2018.png';
  if (n.includes('HBO')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/HBO_logo.svg/512px-HBO_logo.svg.png';
  if (n.includes('DISCOVERY CHANNEL') || n.includes('DISCOVERY')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Discovery_Channel_2019.svg/512px-Discovery_Channel_2019.svg.png';
  if (n.includes('HISTORY')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/History_logo_2021.svg/512px-History_logo_2021.svg.png';
  if (n.includes('CLARO SPORTS')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Claro_Sports_logo_2017.png/512px-Claro_Sports_logo_2017.png';
  return '';
}

  vipStreams.forEach(s => {
    let group = 'Entretenimiento VIP';
    const name = (s.name || '').toUpperCase();

    if (name.includes('INVESTIGATION DISCOVERY') || name.includes('DISCOVERY ID') || name.includes('ID HD')) {
      group = '🕵️ Cultura & ID';
    } else if (String(s.category_id) === '154' || name.includes('CO|') || name.includes('COLOMBIA')) {
      group = '🇨🇴 Colombia HD';
    } else if (name.includes('SPORTS') || name.includes('ESPN') || name.includes('WIN') || name.includes('TYC') || name.includes('TUDN') || name.includes('DSPORTS') || name.includes('DIRECTV')) {
      group = '⚽ Deportes VIP';
    } else if (name.includes('HBO') || name.includes('CINEMA') || name.includes('MOVIE') || name.includes('UNIVERSAL') || name.includes('STAR')) {
      group = '🎬 Cine & Series';
    } else if (name.includes('DISCOVERY') || name.includes('HISTORY') || name.includes('NATIONAL') || name.includes('ANIMAL')) {
      group = '🌍 Documentales';
    }

    const streamUrl = `http://${TREX_HOST}:${TREX_PORT}/${TREX_USER}/${TREX_PASS}/${s.stream_id}.ts`;
    const officialLogo = getOfficialLogo(s.name);
    const logo = officialLogo || s.stream_icon || '';
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
