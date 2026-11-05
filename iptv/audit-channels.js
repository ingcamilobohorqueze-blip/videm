/**
 * TREX IPTV (90 DÍAS) - Herramienta de Auditoría de Cuenta, Categorías y Canales
 * Uso: node iptv/audit-channels.js [termino_busqueda]
 */

const http = require('http');
const config = require('./config');

function queryTrexApi(action = '') {
  return new Promise((resolve, reject) => {
    const actionParam = action ? `&action=${action}` : '';
    const path = `/player_api.php?username=${config.credentials.username}&password=${config.credentials.password}${actionParam}`;
    const req = http.get({
      host: config.credentials.host,
      port: config.credentials.port,
      path,
      headers: { 'User-Agent': config.userAgent },
      timeout: 20000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout conectando a TREX')); });
  });
}

(async () => {
  try {
    console.log('=== 1. ESTADO DE SUSCRIPCIÓN TREX (90 DÍAS) ===');
    const info = await queryTrexApi('');
    if (info && info.user_info) {
      const u = info.user_info;
      const createdDate = u.created_at ? new Date(Number(u.created_at) * 1000).toISOString().split('T')[0] : 'N/A';
      const expDate = u.exp_date ? new Date(Number(u.exp_date) * 1000).toISOString().split('T')[0] : 'N/A';
      const daysLeft = u.exp_date ? Math.ceil((Number(u.exp_date) * 1000 - Date.now()) / (1000 * 60 * 60 * 24)) : 'N/A';
      console.log(`Usuario:          ${u.username}`);
      console.log(`Estado:           ${u.status} (Trial: ${u.is_trial === '0' ? 'No - Cuenta Oficial' : 'Sí'})`);
      console.log(`Creada:           ${createdDate}`);
      console.log(`Vencimiento:      ${expDate} (${daysLeft} días restantes)`);
      console.log(`Conexiones:       ${u.active_cons} activas / ${u.max_connections} máx`);
    } else {
      console.log('Respuesta cuenta:', info);
    }

    const search = process.argv[2];
    if (search) {
      console.log(`\n=== 2. BÚSQUEDA DE CANALES: "${search}" ===`);
      const streams = await queryTrexApi('get_live_streams');
      const matches = (streams || []).filter(s => (s.name || '').toLowerCase().includes(search.toLowerCase()));
      console.log(`Encontrados: ${matches.length}`);
      matches.slice(0, 40).forEach(s => {
        console.log(`  [Cat ${s.category_id}] ID:${s.stream_id} | ${s.name} | EPG:${s.epg_channel_id || '-'}`);
      });
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
