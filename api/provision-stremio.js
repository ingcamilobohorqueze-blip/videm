const https = require('https');

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
    const { email, password, rdToken } = req.body || {};
    if (!email || !password || !rdToken) {
      res.status(400).json({ success: false, error: 'Se requieren email, password y rdToken' });
      return;
    }

    // 1. Iniciar sesión en Stremio
    const authKey = await new Promise((resolve, reject) => {
      const data = JSON.stringify({ email, password });
      const lReq = https.request('https://api.strem.io/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
      }, (lRes) => {
        let lBody = '';
        lRes.on('data', c => lBody += c);
        lRes.on('end', () => {
          try {
            const json = JSON.parse(lBody);
            if (json.result?.authKey) resolve(json.result.authKey);
            else reject(new Error(json.error?.message || 'Login falló en Stremio'));
          } catch (e) { reject(e); }
        });
      });
      lReq.on('error', reject);
      lReq.write(data);
      lReq.end();
    });

    // 2. Descargar manifiesto de Torrentio RD
    const manifestUrl = `https://torrentio.strem.fun/language=latino%7Cqualityfilter=cam,scr%7Cdebridoptions=nodownloadlinks%7Crealdebrid=${encodeURIComponent(rdToken)}/manifest.json`;
    const manifest = await new Promise((resolve, reject) => {
      https.get(manifestUrl, (mRes) => {
        let mBody = '';
        mRes.on('data', c => mBody += c);
        mRes.on('end', () => {
          try { resolve(JSON.parse(mBody)); } catch(e) { reject(e); }
        });
      }).on('error', reject);
    });

    // 3. AddonCollectionGet
    const existingAddons = await new Promise((resolve, reject) => {
      const p = JSON.stringify({ authKey, type: 'AddonCollectionGet' });
      const req = https.request('https://api.strem.io/api/addonCollectionGet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(p) }
      }, (r) => {
        let b = '';
        r.on('data', c => b += c);
        r.on('end', () => {
          try {
            const json = JSON.parse(b);
            resolve(json.result?.addons || []);
          } catch(e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.write(p);
      req.end();
    });

    // 4. Limpiar duplicados e inyectar
    const cleanAddons = existingAddons.filter(a => a.manifest?.id !== 'com.stremio.torrentio.addon');
    cleanAddons.push({
      transportUrl: manifestUrl,
      transportName: 'http',
      manifest
    });

    // 5. AddonCollectionSet
    await new Promise((resolve, reject) => {
      const p = JSON.stringify({ authKey, type: 'AddonCollectionSet', addons: cleanAddons });
      const req = https.request('https://api.strem.io/api/addonCollectionSet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(p) }
      }, (r) => {
        let b = '';
        r.on('data', c => b += c);
        r.on('end', () => resolve(b));
      });
      req.on('error', reject);
      req.write(p);
      req.end();
    });

    res.status(200).json({
      success: true,
      email,
      message: 'Torrentio RD 4K Remux aprovisionado con éxito en Stremio Cloud'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
