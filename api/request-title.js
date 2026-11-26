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
    const { action, query, imdbId, type, rdToken, titleName, season, episode, preferredAudio, phone } = req.body || req.query || {};
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
          poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://videm.tv/assets/images/hero-home-theater.jpeg',
          rating: item.vote_average ? item.vote_average.toFixed(1) : '8.5'
        }));

      return res.status(200).json({ results: list });
    }

    // 2. INYECCIÓN AUTOMÁTICA EN LA BÓVEDA REAL-DEBRID (AUTO-CACHÉ AUDIO LATINO / 4K)
    if (action === 'request_vault' || action === 'request_audio') {
      let targetId = imdbId;
      const mediaType = type === 'series' || type === 'tv' ? 'series' : 'movie';
      const seasonNum = Math.max(1, parseInt(season, 10) || 1);
      const episodeNum = Math.max(1, parseInt(episode, 10) || 1);
      const isSpain = preferredAudio === 'castellano' || (phone && /^(\+?34)/.test(String(phone).trim()));
      const seasonLabel = mediaType === 'series' ? ` (Temporada ${seasonNum})` : '';

      // Si recibimos tmdbId en vez de imdbId, resolvemos su IMDb ID
      if (!targetId && req.body.tmdbId) {
        const detailUrl = `https://api.themoviedb.org/3/${mediaType === 'series' ? 'tv' : 'movie'}/${req.body.tmdbId}/external_ids?api_key=8265bd1679663a7ea12ac168da84d2e8`;
        const ext = await queryJson(detailUrl, 4000);
        targetId = ext?.imdb_id;
      }

      if (!targetId) {
        return res.status(400).json({ success: false, error: 'No se pudo identificar el código de la película o serie.' });
      }

      // Buscar torrents en Audio Latino / Dual en múltiples scrapers (incluyendo los no cacheados para forzar caché en Real-Debrid)
      const streamId = mediaType === 'series' ? `${targetId}:${seasonNum}:${episodeNum}` : targetId;
      const langPrimary = isSpain ? 'spanish,latino' : 'latino';
      const peerflixLang = isSpain ? 'es-ES,es-419' : 'es-419';

      const [tLat, pLat, tEsp, tDb] = await Promise.all([
        queryJson(`https://torrentio.strem.fun/language=${langPrimary}%7Cqualityfilter=cam,scr/stream/${mediaType}/${streamId}.json`, 4000),
        queryJson(`https://addon.peerflix.mov/language=${peerflixLang}/stream/${mediaType}/${streamId}.json`, 4000),
        queryJson(`https://torrentio.strem.fun/language=latino,spanish%7Cqualityfilter=cam,scr/stream/${mediaType}/${streamId}.json`, 4000),
        queryJson(`https://torrentsdb.com/stream/${mediaType}/${streamId}.json`, 3800)
      ]);

      const allCandidates = [
        ...(tLat?.streams || []),
        ...(pLat?.streams || []),
        ...(tEsp?.streams || []),
        ...(tDb?.streams || [])
      ].filter(s => s && s.infoHash);

      // Calificar candidatos: priorizar Audio Latino / Dual-Lat real y descartar francés/ruso/VOSTFR
      const scored = allCandidates.map(s => {
        const text = `${s.name || ''} ${s.title || ''} ${s.description || ''}`.toLowerCase();
        let score = 0;
        const isBadLang = /[а-яА-ЯёЁ]|rutracker|vostfr|\bfrench\b|truefrench/i.test(text);
        if (isBadLang) return { s, score: -999 };

        if (/dual[\s._-]*lat|audio[\s._-]*lat|latino|es-419|cinecalidad|pelisenhd|hackstore/i.test(text)) score += 100;
        else if (isSpain && /castellano|es-es|\besp\b|mejortorrent|wolfmax|dontorrent/i.test(text)) score += 100;
        else if (/multi|dual/i.test(text)) score += 35;

        if (/2160p|\b4k\b/i.test(text)) score += 15;
        else if (/1080p/i.test(text)) score += 12;
        if (/complete|season|temporada|s0\d|s\d\d/i.test(text) && mediaType === 'series') score += 10;

        return { s, score };
      }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

      const best = scored[0]?.s;

      if (best && best.infoHash) {
        const magnet = `magnet:?xt=urn:btih:${best.infoHash}&dn=${encodeURIComponent(titleName || 'VIDEM_VIP_VAULT')}`;
        const addRes = await postForm('https://api.real-debrid.com/rest/1.0/torrents/addMagnet', { magnet }, effectiveToken);

        if (addRes && addRes.id) {
          await postForm(`https://api.real-debrid.com/rest/1.0/torrents/selectFiles/${addRes.id}`, { files: 'all' }, effectiveToken);

          const audioLabel = isSpain ? 'Castellano' : 'Audio Latino';
          return res.status(200).json({
            success: true,
            status: 'cached',
            message: `🔊 ¡${audioLabel} activado para "${titleName || 'Título'}"${seasonLabel}! Se está guardando en nuestra nube 10 Gbps (estará listo en tu Smart TV en 1–3 minutos).`,
            torrentId: addRes.id
          });
        }
      }

      // Si no hay torrent Latino directo disponible, entregar enlace de reporte prioritario al Conserje
      const waPhone = isSpain ? '34746057776' : '573015568904';
      const waText = `Hola VIDEM VIP, solicito activar Audio ${isSpain ? 'Castellano' : 'Latino'} en alta velocidad para: "${titleName || 'Título'}"${seasonLabel} (ID: ${targetId}).`;
      return res.status(200).json({
        success: true,
        status: 'queued',
        waUrl: `https://wa.me/${waPhone}?text=${encodeURIComponent(waText)}`,
        message: `🎩 No encontramos paquete automático en Audio ${isSpain ? 'Castellano' : 'Latino'} para "${titleName || 'Título'}"${seasonLabel}. Pulsa "Reportar" para que nuestro Conserje lo cargue manualmente.`
      });
    }

    return res.status(400).json({ success: false, error: 'Acción no reconocida' });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

