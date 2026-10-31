const https = require('https');

const SUPABASE_URL = 'https://crkkakwpiggnbuwqopsc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNya2tha3dwaWdnbmJ1d3FvcHNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzQzNTg3MSwiZXhwIjoyMTA5MDExODcxfQ.n4yTSUUIC4QL-_UKPJSs2qvPwCNJVoFcf-kbZqEpRo4';

const EVOLUTION_API_URL = 'https://evolution-api-production-8353.up.railway.app';
const EVOLUTION_API_KEY = 'levanna-wa-key-2024';
const EVOLUTION_INSTANCE = 'VidemProd';

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

function sendWhatsApp(phone, text) {
  return new Promise((resolve) => {
    const cleanPhone = String(phone).replace(/[^0-9]/g, '');
    const data = JSON.stringify({
      number: cleanPhone,
      options: { delay: 1000, presence: 'composing' },
      textMessage: { text }
    });
    const req = https.request(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve(b));
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.write(data);
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
          else reject(new Error('Login falló'));
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
          else reject(new Error(parsed.error?.message || 'Error vinculando'));
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

module.exports = async (req, res) => {
  try {
    const now = new Date();

    // 1. Buscar sesiones activas vencidas
    const expRes = await supabaseRequest('/rest/v1/demo_sessions?status=eq.active&scheduled_end=lte.' + now.toISOString());
    const expiredSessions = expRes.data || [];

    for (const s of expiredSessions) {
      // Marcar completada
      await supabaseRequest(`/rest/v1/demo_sessions?id=eq.${s.id}`, 'PATCH', { status: 'completed' });
      await supabaseRequest(`/rest/v1/users?phone=eq.${s.user_phone}`, 'PATCH', { status: 'demo_expired' });

      // Mensaje de cierre y oferta comercial
      const followUpMsg = [
        "🍿 *¡Esperamos que hayas disfrutado tu experiencia VIDEM!* 🎬",
        "",
        "Tu pase de cortesía de 2 horas ha finalizado con éxito. ¿Pudiste comprobar la diferencia de nitidez del 4K Remux y el sonido envolvente?",
        "",
        "💡 *Activa tu Membresía VIP Oficial para continuar sin interrupciones:*",
        "• *Pase Mensual (1 Mes):* $55.000 COP",
        "• *Membresía Semestral (6 Meses):* $240.000 COP _(Ahorras $90.000)_",
        "• *Membresía Anual (12 Meses):* $440.000 COP _(Máximo ahorro)_",
        "",
        "Escríbeme por aquí si deseas activar tu acceso permanente hoy mismo. ¡Feliz día! 👋"
      ].join("\n");

      await sendWhatsApp(s.user_phone, followUpMsg);
    }

    // 2. Si no hay ninguna sesión activa ahora, activar al siguiente en cola
    const curActiveRes = await supabaseRequest('/rest/v1/demo_sessions?status=eq.active&scheduled_end=gt.' + now.toISOString());
    const currentActive = curActiveRes.data || [];

    if (currentActive.length === 0) {
      const nextRes = await supabaseRequest('/rest/v1/demo_sessions?status=eq.queued&order=scheduled_start.asc&limit=1');
      const nextSession = nextRes.data && nextRes.data[0];

      if (nextSession) {
        const newStart = now;
        const newEnd = new Date(now.getTime() + (2 * 60 * 60 * 1000));

        // Vincular televisor
        const authKey = await getStremioAuthKey();
        await linkStremioTvCode(nextSession.tv_code, authKey);

        // Actualizar sesión a activa
        await supabaseRequest(`/rest/v1/demo_sessions?id=eq.${nextSession.id}`, 'PATCH', {
          status: 'active',
          scheduled_start: newStart.toISOString(),
          scheduled_end: newEnd.toISOString(),
          queue_position: 0
        });

        await supabaseRequest(`/rest/v1/users?phone=eq.${nextSession.user_phone}`, 'PATCH', {
          status: 'demo_active'
        });

        const expHour = newEnd.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: true });

        // Notificar por WhatsApp
        const activateMsg = [
          "🎉 *¡LLEGÓ TU TURNO VIP EN VIDEM!* 📺🍿",
          "",
          `Acabamos de vincular tu televisor (código: *${nextSession.tv_code}*) en vivo.`,
          `Tienes 2 horas completas de acceso libre hasta las *${expHour}*.`,
          "",
          "✨ *Películas sugeridas para calibrar tu pantalla hoy:*",
          "• *Beetlejuice 2* (4K Remux)",
          "• *Duna: Parte 2* (Dolby Vision)",
          "• *Robot Salvaje* o *Intensamente 2* (Familiares)",
          "",
          "¡Siente la potencia del cine sin compresión en tu casa! 🎬"
        ].join("\n");

        await sendWhatsApp(nextSession.user_phone, activateMsg);
      }
    }

    res.status(200).json({ success: true, processedExpired: expiredSessions.length });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
};
