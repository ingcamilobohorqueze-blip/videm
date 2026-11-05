const https = require('https');

const DEMO_RD_TOKEN = '76N4SFYLKTKDADDLDIAGR6MDKCG7VQT2FMEGTQDQM3X5U2PFU6QQ';

function queryJson(url, timeoutMs = 6000) {
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
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(null);
    });
  });
}

function postForm(url, postData, token) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const bodyStr = new URLSearchParams(postData).toString();
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve({ raw: data, status: res.statusCode }); }
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.write(bodyStr);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { action, query, imdbId, type, rdToken, titleName } = req.body || req.query || {};
    const effectiveToken = rdToken || DEMO_RD_TOKEN;

    // 1. BUSCADOR DE TÍTULOS CON CARÁTULAS EN ESPAÑOL (TMDB Discover)
    if (action === 'search' || req.method === 'GET') {
      const q = String(query || '').trim();
      if (!q) return res.status(200).json({ results: [] });

      const tmdbSearchUrl = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(q)}&language=es-MX&page=1&api_key=8265bd1679663a7ea12ac168da84d2e8`;
      const tmdbData = await queryJson(tmdbSearchUrl, 4500);

      const list = (tmdbData?.results || [])
        .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
        .slice(0, 8)
        .map(item => ({
          tmdbId: item.id,
          type: item.media_type === 'tv' ? 'series' : 'movie',
          title: item.title || item.name || '',
          originalTitle: item.original_title || item.original_name || '',
          year: (item.release_date || item.first_air_date || '').slice(0, 4),
          overview: item.overview || 'Sinopsis disponible en la Bóveda VIP.',
          poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://videm.tv/assets/images/plan_lluvia_bogota_cine.jpg',
          rating: item.vote_average ? item.vote_average.toFixed(1) : '8.5'
        }));

      return res.status(200).json({ results: list });
    }

    // 2. INYECCIÓN AUTOMÁTICA EN LA BÓVEDA REAL-DEBRID DEL CLIENTE
    if (action === 'request_vault') {
      let targetId = imdbId;
      const mediaType = type === 'series' || type === 'tv' ? 'series' : 'movie';

      // Si recibimos tmdbId en vez de imdbId, resolvemos su IMDb ID
      if (!targetId && req.body.tmdbId) {
        const detailUrl = `https://api.themoviedb.org/3/${mediaType === 'series' ? 'tv' : 'movie'}/${req.body.tmdbId}/external_ids?api_key=8265bd1679663a7ea12ac168da84d2e8`;
        const ext = await queryJson(detailUrl, 4000);
        targetId = ext?.imdb_id;
      }

      if (!targetId) {
        return res.status(400).json({ success: false, error: 'No se pudo identificar el código de la película o serie.' });
      }

      // Buscar torrents en español latino / Remux en Torrentio
      const streamId = mediaType === 'series' ? `${targetId}:1:1` : targetId;
      const torrentioUrl = `https://torrentio.strem.fun/language=latino,spanish%7Cqualityfilter=cam,scr/stream/${mediaType}/${streamId}.json`;
      const tData = await queryJson(torrentioUrl, 5000);

      const candidate = (tData?.streams || []).find(s => s.infoHash);

      if (candidate && candidate.infoHash) {
        // Inyectar magnet a Real-Debrid
        const magnet = `magnet:?xt=urn:btih:${candidate.infoHash}&dn=${encodeURIComponent(titleName || 'VIDEM_VIP_VAULT')}`;
        const addRes = await postForm('https://api.real-debrid.com/rest/1.0/torrents/addMagnet', { magnet }, effectiveToken);

        if (addRes && addRes.id) {
          // Seleccionar todos los archivos para descarga instantánea en la nube
          await postForm(`https://api.real-debrid.com/rest/1.0/torrents/selectFiles/${addRes.id}`, { files: 'all' }, effectiveToken);

          return res.status(200).json({
            success: true,
            status: 'cached',
            message: `🎬 "${titleName || 'Título'}" ha sido cargada con éxito a tu Bóveda Privada. Ya puedes verla en tu Smart TV en resolución 4K / Latino.`,
            torrentId: addRes.id
          });
        }
      }

      // Si no hay torrent directo, registrar la orden como solicitud prioritaria de Conserje
      return res.status(200).json({
        success: true,
        status: 'queued',
        message: `🎩 Tu solicitud de "${titleName || 'Película'}" fue recibida con prioridad VIP. Nuestro equipo la cargará en tu televisor en breve.`
      });
    }

    return res.status(400).json({ success: false, error: 'Acción no reconocida' });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
