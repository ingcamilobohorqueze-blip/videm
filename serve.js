const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);

  // Endpoint de API para obtener el QR fresco en vivo desde Evolution API
  if (reqPath === '/api/qr-live') {
    const options = {
      hostname: 'evolution-api-production-8353.up.railway.app',
      port: 443,
      path: '/instance/connect/VidemProd',
      method: 'GET',
      headers: {
        'apikey': 'levanna-wa-key-2024'
      }
    };

    const apiReq = https.request(options, (apiRes) => {
      let data = '';
      apiRes.on('data', chunk => data += chunk);
      apiRes.on('end', () => {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(data);
      });
    });

    apiReq.on('error', (err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    });

    apiReq.end();
    return;
  }

  // Endpoint de API para vincular Smart TV de forma 100% autónoma
  if (reqPath === '/api/link-device' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const code = (payload.code || '').toUpperCase().trim();
        let authKey = payload.authKey;

        if (!code || code.length < 4) {
          throw new Error('Código de 4 letras inválido o faltante');
        }

        // Si no se proporcionó authKey directa, autenticamos con email y password
        if (!authKey) {
          if (!payload.email || !payload.password) {
            throw new Error('Se requiere authKey o bien email y contraseña de Stremio');
          }
          authKey = await new Promise((resolve, reject) => {
            const loginData = JSON.stringify({ email: payload.email, password: payload.password });
            const lReq = https.request('https://api.strem.io/api/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginData) }
            }, (lRes) => {
              let lBody = '';
              lRes.on('data', c => lBody += c);
              lRes.on('end', () => {
                try {
                  const parsed = JSON.parse(lBody);
                  if (parsed.result?.authKey) resolve(parsed.result.authKey);
                  else reject(new Error(parsed.error?.message || 'Fallo de autenticación en Stremio'));
                } catch(e) { reject(e); }
              });
            });
            lReq.on('error', reject);
            lReq.write(loginData);
            lReq.end();
          });
        }

        // Asegurar que la cuenta tenga Torrentio RD activo
        if (payload.isDemo !== false) {
          try {
            const DEMO_RD_TOKEN = '76N4SFYLKTKDADDLDIAGR6MDKCG7VQT2FMEGTQDQM3X5U2PFU6QQ';
            const manifestUrl = `https://torrentio.strem.fun/language=latino%7Cqualityfilter=cam,scr%7Cdebridoptions=nodownloadlinks%7Crealdebrid=${DEMO_RD_TOKEN}/manifest.json`;
            const existing = await new Promise((resAddons) => {
              const p = JSON.stringify({ authKey, type: 'AddonCollectionGet' });
              const reqAdd = https.request('https://api.strem.io/api/addonCollectionGet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(p) }
              }, (rAdd) => {
                let bAdd = '';
                rAdd.on('data', c => bAdd += c);
                rAdd.on('end', () => {
                  try { resAddons(JSON.parse(bAdd).result?.addons || []); } catch(e) { resAddons([]); }
                });
              });
              reqAdd.on('error', () => resAddons([]));
              reqAdd.write(p);
              reqAdd.end();
            });

            const hasTorrentio = existing.some(a => a.manifest?.id === 'com.stremio.torrentio.addon');
            if (!hasTorrentio) {
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

              await new Promise((resSet) => {
                const p = JSON.stringify({ authKey, type: 'AddonCollectionSet', addons: clean });
                const reqSet = https.request('https://api.strem.io/api/addonCollectionSet', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(p) }
                }, (rSet) => {
                  let bSet = '';
                  rSet.on('data', c => bSet += c);
                  rSet.on('end', resSet);
                });
                reqSet.on('error', resSet);
                reqSet.write(p);
                reqSet.end();
              });
              console.log('✅ Torrentio RD auto-restaurado en serve.js para Smart TV');
            }
          } catch(errAdd) {
            console.warn('Advertencia en serve.js asegurando addons:', errAdd.message);
          }
        }

        // Enlazar el dispositivo directamente mediante la API interna de Stremio Link
        const linkResult = await new Promise((resolve, reject) => {
          const postData = JSON.stringify({ authKey });
          const linkReq = https.request('https://link.stremio.com/api/write?code=' + code, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
          }, (linkRes) => {
            let linkBody = '';
            linkRes.on('data', c => linkBody += c);
            linkRes.on('end', () => {
              try {
                const parsed = JSON.parse(linkBody);
                if (parsed.success) resolve(parsed);
                else reject(new Error(parsed.error?.message || 'No se pudo vincular el código al televisor'));
              } catch(e) { reject(e); }
            });
          });
          linkReq.on('error', reject);
          linkReq.write(postData);
          linkReq.end();
        });

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ success: true, code, authKeyPreview: authKey.slice(0, 8) + '...' }));
      } catch (err) {
        res.writeHead(400, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Endpoint de API para aprovisionar Torrentio RD en Stremio Cloud
  if (reqPath === '/api/provision-stremio' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { email, password, rdToken } = payload;
        if (!email || !password || !rdToken) {
          throw new Error('Se requieren email, password y rdToken');
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

        // 2. Manifest Torrentio RD (VIDEM 4K Remux, Latino, sin cam)
        const manifestUrl = `https://torrentio.strem.fun/language=latino%7Cqualityfilter=cam,scr%7Cdebridoptions=nodownloadlinks%7Crealdebrid=${rdToken}/manifest.json`;
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

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ success: true, email, message: 'Torrentio RD 4K Remux aprovisionado en Stremio Cloud' }));
      } catch (err) {
        res.writeHead(400, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  if (reqPath === '/') reqPath = '/index.html';

  const fullPath = path.join(__dirname, reqPath);

  fs.stat(fullPath, (err, stats) => {
    let finalPath = fullPath;
    if (err || !stats.isFile()) {
      if (fs.existsSync(fullPath + '.html')) {
        finalPath = fullPath + '.html';
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }
    }

    const ext = path.extname(finalPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(finalPath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`VIDEM local dev server running at http://localhost:${PORT}/`);
});
