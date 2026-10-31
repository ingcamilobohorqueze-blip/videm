const DEMO_RD_TOKEN = '76N4SFYLKTKDADDLDIAGR6MDKCG7VQT2FMEGTQDQM3X5U2PFU6QQ';

async function ensureDemoAddons(authKey) {
  try {
    const existing = await new Promise((resolve) => {
      const p = JSON.stringify({ authKey, type: 'AddonCollectionGet' });
      const req = https.request('https://api.strem.io/api/addonCollectionGet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(p) }
      }, (r) => {
        let b = '';
        r.on('data', c => b += c);
        r.on('end', () => {
          try { resolve(JSON.parse(b).result?.addons || []); }
          catch(e) { resolve([]); }
        });
      });
      req.on('error', () => resolve([]));
      req.write(p);
      req.end();
    });

    const hasTorrentio = existing.some(a => a.manifest?.id === 'com.stremio.torrentio.addon');
    if (!hasTorrentio) {
      const manifestUrl = `https://torrentio.strem.fun/language=latino%7Cqualityfilter=cam,scr%7Cdebridoptions=nodownloadlinks%7Crealdebrid=${DEMO_RD_TOKEN}/manifest.json`;
      const manifest = {
        id: "com.stremio.torrentio.addon",
        version: "0.0.15",
        name: "Torrentio RD",
        description: "Provides torrent streams from scraped torrent providers.",
        catalogs: [{ id: "torrentio-realdebrid", name: "RealDebrid", type: "other", extra: [{ name: "skip" }] }],
        resources: [
          { name: "stream", types: ["movie", "series", "anime"], idPrefixes: ["tt", "kitsu"] },
          { name: "meta", types: ["other"], idPrefixes: ["realdebrid"] }
        ],
        types: ["movie", "series", "anime", "other"],
        background: "https://torrentio.strem.fun/images/background_v1.jpg",
        logo: "https://torrentio.strem.fun/images/logo_v1.png",
        behaviorHints: { configurable: true, configurationRequired: false }
      };

      const clean = existing.filter(a => a.manifest?.id !== 'com.stremio.torrentio.addon');
      clean.push({ transportUrl: manifestUrl, transportName: 'http', manifest });

      await new Promise((resolve) => {
        const p = JSON.stringify({ authKey, type: 'AddonCollectionSet', addons: clean });
        const req = https.request('https://api.strem.io/api/addonCollectionSet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(p) }
        }, (r) => {
          let b = '';
          r.on('data', c => b += c);
          r.on('end', resolve);
        });
        req.on('error', resolve);
        req.write(p);
        req.end();
      });
    }
  } catch(e) {
    console.warn('ensureDemoAddons warning:', e.message);
  }
}

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { code, authKey, isDemo } = req.body || {};
    if (!code || !authKey) {
      res.status(400).json({ success: false, error: 'Faltan parámetros: code y authKey son requeridos' });
      return;
    }

    if (isDemo !== false) {
      await ensureDemoAddons(authKey);
    }

    const postData = JSON.stringify({ authKey });

    const linkResult = await new Promise((resolve, reject) => {
      const linkReq = https.request(`https://link.stremio.com/api/write?code=${encodeURIComponent(code)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (linkRes) => {
        let body = '';
        linkRes.on('data', c => body += c);
        linkRes.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (parsed.success) resolve(parsed);
            else reject(new Error(parsed.error?.message || 'Código rechazado o expirado en el televisor'));
          } catch (e) {
            reject(new Error('Respuesta inválida del servidor Stremio Link: ' + body));
          }
        });
      });

      linkReq.on('error', reject);
      linkReq.write(postData);
      linkReq.end();
    });

    res.status(200).json({
      success: true,
      code,
      message: 'Televisor enlazado con éxito a la cuenta VIDEM'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
