const https = require('https');

const SUPABASE_URL = 'https://crkkakwpiggnbuwqopsc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNya2tha3dwaWdnbmJ1d3FvcHNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzQzNTg3MSwiZXhwIjoyMTA5MDExODcxfQ.n4yTSUUIC4QL-_UKPJSs2qvPwCNJVoFcf-kbZqEpRo4';

const DEMO_EMAIL = 'vip.8294@videm.tv';
const DEMO_PASS = 'Videm4K.8294!';

function supabaseRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    const postData = body ? JSON.stringify(body) : null;
    const req = https.request(url, {
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, raw: data }); }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function getStremioAuthKey() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASS });
    const req = https.request('https://api.strem.io/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(b);
          if (json.result?.authKey) resolve(json.result.authKey);
          else reject(new Error('Login falló en Stremio'));
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function linkStremioTvCode(code, authKey) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ authKey });
    const req = https.request(`https://link.stremio.com/api/write?code=${encodeURIComponent(code)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(b);
          if (parsed.success) resolve(parsed);
          else reject(new Error(parsed.error?.message || 'Código rechazado o expirado en TV'));
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { phone, name, tv_code, tv_brand } = req.body || {};
    if (!phone || !tv_code) {
      res.status(400).json({ error: 'Faltan parámetros: phone y tv_code son requeridos' });
      return;
    }

    const cleanCode = String(tv_code).trim().toUpperCase();
    const cleanPhone = String(phone).replace(/[^0-9]/g, '');

    // 1. Upsert Usuario en Supabase
    await supabaseRequest('/rest/v1/users', 'POST', {
      phone: cleanPhone,
      name: name || 'Cliente',
      tv_brand: tv_brand || null,
      last_interaction: new Date().toISOString()
    });

    const now = new Date();

    // 2. Verificar sesiones activas o en cola
    const activeRes = await supabaseRequest('/rest/v1/demo_sessions?status=eq.active&scheduled_end=gt.' + now.toISOString() + '&order=scheduled_end.desc');
    const queuedRes = await supabaseRequest('/rest/v1/demo_sessions?status=eq.queued&order=scheduled_end.desc');

    const activeSessions = activeRes.data || [];
    const queuedSessions = queuedRes.data || [];

    // CASO A: Línea disponible de inmediato
    if (activeSessions.length === 0) {
      const scheduledStart = now;
      const scheduledEnd = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // 2 Horas

      // Vincular TV en Stremio
      const authKey = await getStremioAuthKey();
      await linkStremioTvCode(cleanCode, authKey);

      // Registrar sesión activa
      await supabaseRequest('/rest/v1/demo_sessions', 'POST', {
        user_phone: cleanPhone,
        tv_code: cleanCode,
        queue_position: 0,
        scheduled_start: scheduledStart.toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
        status: 'active'
      });

      // Actualizar estado usuario
      await supabaseRequest(`/rest/v1/users?phone=eq.${cleanPhone}`, 'PATCH', {
        status: 'demo_active'
      });

      const expHour = scheduledEnd.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: true });

      res.status(200).json({
        type: 'activated',
        status: 'active',
        message: `¡Pantalla (${cleanCode}) vinculada con éxito! Tienes 2 horas de acceso VIP hasta las ${expHour}.`,
        expiresAt: expHour,
        code: cleanCode
      });
      return;
    }

    // CASO B: Hay una prueba en curso -> Encolar por turnos
    const lastEnd = queuedSessions.length > 0 
      ? new Date(queuedSessions[0].scheduled_end)
      : new Date(activeSessions[0].scheduled_end);

    const scheduledStart = lastEnd > now ? lastEnd : now;
    const scheduledEnd = new Date(scheduledStart.getTime() + (2 * 60 * 60 * 1000));
    const queuePosition = queuedSessions.length + 1;

    // Registrar en cola
    await supabaseRequest('/rest/v1/demo_sessions', 'POST', {
      user_phone: cleanPhone,
      tv_code: cleanCode,
      queue_position: queuePosition,
      scheduled_start: scheduledStart.toISOString(),
      scheduled_end: scheduledEnd.toISOString(),
      status: 'queued'
    });

    // Actualizar estado usuario
    await supabaseRequest(`/rest/v1/users?phone=eq.${cleanPhone}`, 'PATCH', {
      status: 'demo_queued'
    });

    const startHour = scheduledStart.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: true });
    const waitMin = Math.round((scheduledStart.getTime() - now.getTime()) / (1000 * 60));

    res.status(200).json({
      type: 'queued',
      status: 'queued',
      queuePosition,
      startTime: startHour,
      waitMinutes: waitMin,
      message: `En este momento el servidor VIP está al 100% con otra pantalla en prueba. Tu turno es el #${queuePosition} y tu activación iniciará automáticamente a las ${startHour} (~${waitMin} min).`
    });

  } catch(err) {
    res.status(500).json({ error: err.message });
  }
};
