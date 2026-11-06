const https = require('https');

const SUPABASE_URL = 'https://crkkakwpiggnbuwqopsc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNya2tha3dwaWdnbmJ1d3FvcHNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzQzNTg3MSwiZXhwIjoyMTA5MDExODcxfQ.n4yTSUUIC4QL-_UKPJSs2qvPwCNJVoFcf-kbZqEpRo4';

// Cuentas de respaldo preconfiguradas con PINs de 4 dígitos y credenciales maestras
const KNOWN_CLIENTS = [
  {
    id: 'camilo',
    phone: '573103311543',
    user: 'ing.camilobohorqueze@gmail.com',
    pin: '1043',
    pass: 'Cb0915271043',
    name: 'Camilo Andrés Bohórquez',
    plan: 'Membresía Personal (Trimestral 90D)',
    status: 'Activo',
    endDate: '2027-01-26T23:59:59',
    rdToken: '5UUJR2B4K3EMRUUHAG3YCF2WCBYMTFUGFYUF7V4ZDCRV2CIYA3DQ'
  },
  {
    id: 'demo',
    phone: '573015568904',
    user: 'vip.8294@videm.tv',
    pin: '8294',
    pass: 'Videm4K.8294**',
    name: 'Invitado Demo VIP',
    plan: 'Demo 4K Remux',
    status: 'Demo',
    endDate: '2026-11-24T23:59:59',
    rdToken: '76N4SFYLKTKDADDLDIAGR6MDKCG7VQT2FMEGTQDQM3X5U2PFU6QQ'
  },
  {
    id: 'john_bedoya',
    supabaseId: '7c36cb4b-0764-498f-982f-73cb86704f20',
    phone: '160399999680633',
    user: 'vip.9299@videm.tv',
    pin: '9299',
    pass: 'Videm4K.9299!',
    name: 'John Bedoya',
    plan: 'Pase Mensual Flex',
    status: 'Activo',
    endDate: '2026-11-26T23:59:59',
    rdToken: '5MDPKLAAN2KYABXWZ55Z5TIVQZWJRLZVWAOGLS62YBPPNVVHNMQA'
  }
];

function patchSupabase(path, body) {
  return new Promise((resolve) => {
    try {
      const url = new URL(SUPABASE_URL + path);
      const data = JSON.stringify(body);
      const req = https.request({
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'Prefer': 'return=representation'
        }
      }, (res) => {
        let resp = '';
        res.on('data', chunk => resp += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: resp }));
      });
      req.on('error', () => resolve(null));
      req.write(data);
      req.end();
    } catch (e) {
      resolve(null);
    }
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const { action = 'login', user, pass, pin, newPin, phone, countryCode } = req.body || {};
    const cleanUser = String(user || '').trim().toLowerCase();
    const cleanInputPin = String(pin || pass || '').trim();

    // ==========================================
    // ACTION: ACTIVAR O ACTUALIZAR PIN Y WHATSAPP
    // ==========================================
    if (action === 'activate' || action === 'set-pin') {
      const targetPin = String(newPin || pin || pass || '').trim();
      let rawPhone = String(phone || '').replace(/\D/g, '').trim();
      const prefix = String(countryCode || '').replace(/\D/g, '').trim();
      
      let targetPhone = rawPhone;
      if (prefix && !rawPhone.startsWith(prefix)) {
        targetPhone = prefix + rawPhone;
      }

      if (!cleanUser) {
        return res.status(400).json({ success: false, error: 'Ingresa tu usuario asignado o código VIP.' });
      }
      if (!/^\d{4}$/.test(targetPin)) {
        return res.status(400).json({ success: false, error: 'El PIN debe ser exactamente de 4 dígitos numéricos (ej. 1234).' });
      }
      if (targetPhone && targetPhone.length < 7) {
        return res.status(400).json({ success: false, error: 'Ingresa un número telefónico móvil válido con código de país.' });
      }

      // Buscar si coincide con KNOWN_CLIENTS
      const matched = KNOWN_CLIENTS.find(c =>
        c.user.toLowerCase() === cleanUser ||
        c.user.toLowerCase().startsWith(cleanUser) ||
        (targetPhone && (c.phone === targetPhone || c.phone.endsWith(targetPhone) || targetPhone.endsWith(c.phone))) ||
        (cleanUser.includes('9299') && c.id === 'john_bedoya') ||
        (cleanUser.includes('8294') && c.id === 'demo')
      );

      if (matched) {
        matched.pin = targetPin;
        if (targetPhone) matched.phone = targetPhone;

        // Persistir en Supabase si tiene registro asociado
        if (matched.supabaseId) {
          const notesUpdate = `Pase Mensual Flex. [PIN:${targetPin}] [WHATSAPP:+${targetPhone || matched.phone}] Actualizado desde PWA`;
          await patchSupabase(`/rest/v1/users?id=eq.${matched.supabaseId}`, {
            notes: notesUpdate
          });
        }

        return res.status(200).json({
          success: true,
          message: '¡PIN configurado exitosamente!',
          client: {
            name: matched.name,
            phone: matched.phone,
            user: matched.user,
            plan: matched.plan,
            status: matched.status,
            endDate: matched.endDate,
            rdToken: matched.rdToken
          }
        });
      }

      return res.status(404).json({
        success: false,
        error: 'No encontramos tu código o usuario VIP. Contacta a tu Conserje por WhatsApp.'
      });
    }

    // ==========================================
    // ACTION: LOGIN REGULAR (CON PIN O CONTRASEÑA)
    // ==========================================
    if (!cleanUser || !cleanInputPin) {
      return res.status(400).json({ success: false, error: 'Ingresa tu usuario y tu PIN de 4 dígitos.' });
    }

    // 1. Validar contra clientes reconocidos en memoria (ultra rápido)
    const cleanDigits = cleanUser.replace(/\D/g, '');
    const matchedKnown = KNOWN_CLIENTS.find(c => {
      const matchUser = (
        c.user.toLowerCase() === cleanUser ||
        c.user.toLowerCase().replace('@videm.tv', '') === cleanUser.replace('@videm.tv', '') ||
        (cleanDigits && (c.phone === cleanDigits || (cleanDigits.length >= 7 && (c.phone.endsWith(cleanDigits) || cleanDigits.endsWith(c.phone))))) ||
        (cleanUser === 'john' && c.id === 'john_bedoya') ||
        (cleanUser === '9299' && c.id === 'john_bedoya') ||
        (cleanUser === '8294' && c.id === 'demo')
      );

      if (!matchUser) return false;

      // Comprobar PIN de 4 dígitos, contraseña tradicional o PIN maestro
      const matchPin = (
        c.pin === cleanInputPin ||
        c.pass === cleanInputPin ||
        cleanInputPin === 'videm2026' ||
        cleanInputPin === '0000'
      );

      return matchPin;
    });

    if (matchedKnown) {
      return res.status(200).json({
        success: true,
        client: {
          name: matchedKnown.name,
          phone: matchedKnown.phone,
          user: matchedKnown.user,
          plan: matchedKnown.plan,
          status: matchedKnown.status,
          endDate: matchedKnown.endDate,
          rdToken: matchedKnown.rdToken
        }
      });
    }

    // 2. Consulta de respaldo en Supabase
    const cleanPhoneDigits = cleanUser.replace(/\D/g, '');
    const supabaseMatch = await new Promise((resolve) => {
      const url = `${SUPABASE_URL}/rest/v1/users?phone=eq.${encodeURIComponent(cleanPhoneDigits || cleanUser)}&select=*`;
      https.get(url, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY
        }
      }, (r) => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => {
          try {
            const arr = JSON.parse(d);
            resolve(arr && arr[0] ? arr[0] : null);
          } catch (e) { resolve(null); }
        });
      }).on('error', () => resolve(null));
    });

    if (supabaseMatch) {
      // Si el cliente tiene un PIN guardado en notes, validarlo; de lo contrario permitir videm2026 o los últimos 4 dígitos de su teléfono
      const notes = supabaseMatch.notes || '';
      const pinMatch = notes.match(/\[PIN:(\d{4})\]/);
      const expectedPin = pinMatch ? pinMatch[1] : (cleanPhoneDigits.slice(-4) || '9299');

      if (cleanInputPin === expectedPin || cleanInputPin === 'videm2026' || cleanInputPin === '0000') {
        return res.status(200).json({
          success: true,
          client: {
            name: supabaseMatch.name || 'Cliente VIDEM VIP',
            phone: supabaseMatch.phone,
            user: `${cleanPhoneDigits || 'vip'}@videm.tv`,
            plan: supabaseMatch.interested_plan || 'Pase Mensual Flex',
            status: supabaseMatch.status === 'demo_active' ? 'Demo' : 'Activo',
            endDate: '2026-11-26T23:59:59',
            rdToken: '76N4SFYLKTKDADDLDIAGR6MDKCG7VQT2FMEGTQDQM3X5U2PFU6QQ'
          }
        });
      } else {
        return res.status(401).json({
          success: false,
          error: 'PIN incorrecto. Puedes recuperarlo tocando en "¿Olvidaste tu PIN?" o usar videm2026.'
        });
      }
    }

    return res.status(401).json({
      success: false,
      error: 'Credenciales inválidas. Verifica tu usuario/PIN o comunícate con tu Conserje VIDEM.'
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
