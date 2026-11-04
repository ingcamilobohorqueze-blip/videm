const https = require('https');

const DEMO_EMAIL = 'vip.8294@videm.tv';
const DEMO_PASS = 'Videm4K.8294**';
const DEMO_RD_TOKEN = '76N4SFYLKTKDADDLDIAGR6MDKCG7VQT2FMEGTQDQM3X5U2PFU6QQ';

function request(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, headers: res.headers, raw: data }); }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
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

  try {
    const { authKey } = req.body || {};
    let deletedDownloads = 0;
    let tvLoggedOut = false;

    // 1. Eliminar todas las descargas/streams activos en Real-Debrid para cortar el tráfico de video inmediatamente
    try {
      const rdRes = await request('https://api.real-debrid.com/rest/1.0/downloads', {
        headers: { 'Authorization': 'Bearer ' + DEMO_RD_TOKEN }
      });
      if (Array.isArray(rdRes.data)) {
        for (const item of rdRes.data) {
          await request(`https://api.real-debrid.com/rest/1.0/downloads/delete/${item.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + DEMO_RD_TOKEN }
          });
          deletedDownloads++;
        }
      }
    } catch (rdErr) {
      console.warn('Error purgando descargas Real-Debrid:', rdErr.message);
    }

    // 2. Si se proporcionó la authKey de la sesión del televisor, revocarla en Stremio Cloud
    if (authKey) {
      try {
        const logoutRes = await request('https://api.strem.io/api/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }, JSON.stringify({ authKey }));
        if (logoutRes.data?.result?.success) {
          tvLoggedOut = true;
        }
      } catch (logoutErr) {
        console.warn('Error revocando sesión Stremio:', logoutErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Acceso demo cortado con éxito.',
      deletedDownloads,
      tvLoggedOut
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
