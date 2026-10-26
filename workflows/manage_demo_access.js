const https = require('https');

const DEMO_EMAIL = 'vip.8294@videm.tv';
const DEMO_PASS = 'Videm4K.8294!';
const RD_TOKEN = '76N4SFYLKTKDADDLDIAGR6MDKCG7VQT2FMEGTQDQM3X5U2PFU6QQ';
const TORRENTIO_MANIFEST = `https://torrentio.strem.fun/language=latino%7Cqualityfilter=cam,scr%7Cdebridoptions=nodownloadlinks%7Crealdebrid=${RD_TOKEN}/manifest.json`;

function login(callback) {
  const data = JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASS });
  const req = https.request('https://api.strem.io/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
  }, (res) => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => {
      const json = JSON.parse(body);
      callback(json.result?.authKey);
    });
  });
  req.write(data);
  req.end();
}

function cutDemoAccess() {
  login((authKey) => {
    if (!authKey) return console.log('❌ Error al iniciar sesión en demo');
    
    // 1. Obtener addons actuales
    const reqGet = https.request('https://api.strem.io/api/addonCollectionGet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        const json = JSON.parse(body);
        // Filtrar y remover Torrentio RD
        const cleanAddons = json.result.addons.filter(a => a.manifest?.id !== 'com.stremio.torrentio.addon');
        
        const setPayload = JSON.stringify({ authKey, type: 'AddonCollectionSet', addons: cleanAddons });
        const reqSet = https.request('https://api.strem.io/api/addonCollectionSet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(setPayload) }
        }, (sRes) => {
          console.log('🔒 ACCESO DEMO CORTADO CON ÉXITO: Torrentio RD removido del TV del cliente.');
        });
        reqSet.write(setPayload);
        reqSet.end();
      });
    });
    reqGet.write(JSON.stringify({ authKey, type: 'AddonCollectionGet' }));
    reqGet.end();
  });
}

function restoreDemoAccess() {
  login((authKey) => {
    if (!authKey) return console.log('❌ Error al iniciar sesión en demo');
    
    // Obtener manifest de Torrentio
    https.get(TORRENTIO_MANIFEST, (mRes) => {
      let mBody = '';
      mRes.on('data', c => mBody += c);
      mRes.on('end', () => {
        const manifest = JSON.parse(mBody);
        const torrentioAddon = {
          transportUrl: TORRENTIO_MANIFEST,
          transportName: 'http',
          manifest: manifest
        };

        const reqGet = https.request('https://api.strem.io/api/addonCollectionGet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }, (res) => {
          let body = '';
          res.on('data', c => body += c);
          res.on('end', () => {
            const json = JSON.parse(body);
            const addons = json.result.addons.filter(a => a.manifest?.id !== 'com.stremio.torrentio.addon');
            addons.push(torrentioAddon);
            
            const setPayload = JSON.stringify({ authKey, type: 'AddonCollectionSet', addons: addons });
            const reqSet = https.request('https://api.strem.io/api/addonCollectionSet', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(setPayload) }
            }, (sRes) => {
              console.log('⚡ ACCESO DEMO RESTAURADO: Torrentio RD 4K Remux activo para nuevos clientes.');
            });
            reqSet.write(setPayload);
            reqSet.end();
          });
        });
        reqGet.write(JSON.stringify({ authKey, type: 'AddonCollectionGet' }));
        reqGet.end();
      });
    });
  });
}

const action = process.argv[2];
if (action === 'cut') {
  cutDemoAccess();
} else if (action === 'restore') {
  restoreDemoAccess();
} else {
  console.log('Uso: node workflows/manage_demo_access.js [cut|restore]');
}
