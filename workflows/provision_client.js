const https = require('https');

async function provisionStremioAccount(email, password, rdToken) {
  console.log(`📡 Conectando a Stremio API para ${email}...`);
  
  // 1. Iniciar sesión en Stremio
  const authKey = await new Promise((resolve, reject) => {
    const data = JSON.stringify({ email, password });
    const req = https.request('https://api.strem.io/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.result?.authKey) resolve(json.result.authKey);
          else reject(new Error(json.error?.message || 'Login falló en Stremio'));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });

  // 2. Construir manifest de Torrentio RD con parámetros VIDEM VIP (4K Remux, sin cam, audio latino)
  const manifestUrl = `https://torrentio.strem.fun/language=latino%7Cqualityfilter=cam,scr%7Cdebridoptions=nodownloadlinks%7Crealdebrid=${rdToken}/manifest.json`;

  console.log('⬇️ Descargando manifiesto de Torrentio RD...');
  const manifest = await new Promise((resolve, reject) => {
    https.get(manifestUrl, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });

  // 3. Obtener addons existentes
  const existingAddons = await new Promise((resolve, reject) => {
    const payload = JSON.stringify({ authKey, type: 'AddonCollectionGet' });
    const req = https.request('https://api.strem.io/api/addonCollectionGet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json.result?.addons || []);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  // 4. Limpiar duplicados e inyectar nuevo Torrentio RD
  const cleanAddons = existingAddons.filter(a => a.manifest?.id !== 'com.stremio.torrentio.addon');
  cleanAddons.push({
    transportUrl: manifestUrl,
    transportName: 'http',
    manifest
  });

  // 5. Guardar addons en la nube de Stremio
  await new Promise((resolve, reject) => {
    const payload = JSON.stringify({ authKey, type: 'AddonCollectionSet', addons: cleanAddons });
    const req = https.request('https://api.strem.io/api/addonCollectionSet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  console.log(`🎉 ¡ÉXITO! La cuenta ${email} quedó aprovisionada con Torrentio RD en 4K Remux.`);
}

const email = process.argv[2];
const pass = process.argv[3];
const token = process.argv[4];

if (!email || !pass || !token) {
  console.log('Uso: node workflows/provision_client.js <email> <password> <rdToken>');
  process.exit(1);
}

provisionStremioAccount(email, pass, token)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error en aprovisionamiento:', err.message);
    process.exit(1);
  });
