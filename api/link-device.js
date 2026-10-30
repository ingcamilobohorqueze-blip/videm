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
    const { code, authKey } = req.body || {};
    if (!code || !authKey) {
      res.status(400).json({ success: false, error: 'Faltan parámetros: code y authKey son requeridos' });
      return;
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
