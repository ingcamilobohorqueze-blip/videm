const https = require('https');

const SUPABASE_URL = 'https://crkkakwpiggnbuwqopsc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNya2tha3dwaWdnbmJ1d3FvcHNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzQzNTg3MSwiZXhwIjoyMTA5MDExODcxfQ.n4yTSUUIC4QL-_UKPJSs2qvPwCNJVoFcf-kbZqEpRo4';
const DEMO_RD_TOKEN = '76N4SFYLKTKDADDLDIAGR6MDKCG7VQT2FMEGTQDQM3X5U2PFU6QQ';
const DEMO_PHONE = '573015568904';

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
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const sendJson = (status, payload) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (res.status && res.json) return res.status(status).json(payload);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
  };

  try {
    const parsedUrl = new URL(req.url || '', 'http://localhost');
    const body = req.body || {};
    const action = body.action || parsedUrl.searchParams.get('action') || req.query?.action || 'cut';
    const authKey = body.authKey;

    if (action === 'status') {
      const sbHeaders = { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY };
      const [masterRes, sessionsRes, rdRes] = await Promise.all([
        request(`${SUPABASE_URL}/rest/v1/users?phone=eq.${DEMO_PHONE}&select=status`, { headers: sbHeaders }).catch(() => ({ data: [] })),
        request(`${SUPABASE_URL}/rest/v1/demo_sessions?order=created_at.desc&limit=3&select=user_phone,tv_code,status,scheduled_start,scheduled_end`, { headers: sbHeaders }).catch(() => ({ data: [] })),
        request('https://api.real-debrid.com/rest/1.0/downloads?limit=5', { headers: { 'Authorization': 'Bearer ' + DEMO_RD_TOKEN } }).catch(() => ({ data: [] }))
      ]);

      const nowMs = Date.now();
      const masterStatus = Array.isArray(masterRes.data) ? (masterRes.data[0]?.status || 'unknown') : 'unknown';
      const sessions = Array.isArray(sessionsRes.data) ? sessionsRes.data : [];
      const activeSession = sessions.find(s => s.status === 'active' && new Date(s.scheduled_end).getTime() > nowMs) || null;
      const expiredActive = sessions.find(s => s.status === 'active' && new Date(s.scheduled_end).getTime() <= nowMs) || null;
      const lastSession = sessions[0] || null;
      const downloads = Array.isArray(rdRes.data) ? rdRes.data : [];
      const isOnline = masterStatus === 'demo_active' && !expiredActive;

      sendJson(200, {
        success: true,
        action: 'status',
        isOnline,
        masterStatus: expiredActive && masterStatus === 'demo_active' ? 'demo_expired' : masterStatus,
        activeSession,
        lastSession,
        rdActiveCount: downloads.length,
        lastDownload: downloads[0] ? {
          filename: downloads[0].filename,
          generated: downloads[0].generated,
          sizeGb: Number(((downloads[0].filesize || 0) / 1e9).toFixed(2))
        } : null,
        checkedAt: new Date().toISOString()
      });
      return;
    }

    if (action === 'cut') {
      // 1. Desactivar en Supabase users
      await request(`${SUPABASE_URL}/rest/v1/users?phone=eq.${DEMO_PHONE}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json'
        }
      }, JSON.stringify({ status: 'demo_cancelled' }));

      // 2. Marcar sesiones demo como canceladas
      await request(`${SUPABASE_URL}/rest/v1/demo_sessions?status=eq.active`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json'
        }
      }, JSON.stringify({ status: 'cancelled' }));

      // 3. Purgar descargas de Real-Debrid para congelar el video en el televisor
      let purged = 0;
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
            purged++;
          }
        }
      } catch(e) {}

      // 4. Si hay authKey, revocar en Stremio Cloud
      if (authKey) {
        try {
          await request('https://api.strem.io/api/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }, JSON.stringify({ authKey }));
        } catch(e) {}
      }

      sendJson(200, { success: true, action: 'cut', status: 'demo_cancelled', purgedDownloads: purged });
    } else {
      // Restaurar señal
      await request(`${SUPABASE_URL}/rest/v1/users?phone=eq.${DEMO_PHONE}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json'
        }
      }, JSON.stringify({ status: 'demo_active' }));

      sendJson(200, { success: true, action: 'restore', status: 'demo_active' });
    }
  } catch (err) {
    sendJson(500, { success: false, error: err.message });
  }
};
