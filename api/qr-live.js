const https = require('https');

const EVOLUTION_HOST = 'evolution-api-production-8353.up.railway.app';
const EVOLUTION_API_KEY = 'levanna-wa-key-2024';

function evolutionRequest(method, path, bodyObj = null) {
  return new Promise((resolve, reject) => {
    const bodyStr = bodyObj ? JSON.stringify(bodyObj) : null;
    const headers = {
      'apikey': EVOLUTION_API_KEY,
      'Content-Type': 'application/json'
    };
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);

    const req = https.request({
      hostname: EVOLUTION_HOST,
      port: 443,
      path,
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: { raw: data } });
        }
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Soportar ?instance=VidemProd (Colombia) o ?instance=VidemEsp (España +34 746 05 77 76)
  const urlObj = new URL(req.url || '/api/qr-live', 'https://videm.tv');
  const instance = urlObj.searchParams.get('instance') === 'VidemEsp' ? 'VidemEsp' : 'VidemProd';
  const defaultNumber = instance === 'VidemEsp' ? '34746057776' : '573015568904';
  const queryNum = urlObj.searchParams.get('number') || defaultNumber;

  try {
    let connectRes = await evolutionRequest('GET', `/instance/connect/${instance}?number=${queryNum}`);

    // Si es la instancia de España (VidemEsp) y aún no ha sido creada en Evolution API, crearla automáticamente
    if (instance === 'VidemEsp' && (connectRes.status === 404 || connectRes.data?.error)) {
      await evolutionRequest('POST', '/instance/create', {
        instanceName: 'VidemEsp',
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      });
      connectRes = await evolutionRequest('GET', `/instance/connect/${instance}?number=${queryNum}`);
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).json(connectRes.data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

