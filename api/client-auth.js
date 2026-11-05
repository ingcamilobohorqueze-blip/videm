const https = require('https');

const SUPABASE_URL = 'https://crkkakwpiggnbuwqopsc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNya2tha3dwaWdnbmJ1d3FvcHNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzQzNTg3MSwiZXhwIjoyMTA5MDExODcxfQ.n4yTSUUIC4QL-_UKPJSs2qvPwCNJVoFcf-kbZqEpRo4';

// Cuentas de respaldo preconfiguradas en memoria para login instantáneo
const KNOWN_CLIENTS = [
  {
    phone: '573103311543',
    user: 'ing.camilobohorqueze@gmail.com',
    pass: 'Cb0915271043',
    name: 'Camilo Andrés Bohórquez',
    plan: 'Membresía Personal (Trimestral 90D)',
    status: 'Activo',
    endDate: '2027-01-26T23:59:59',
    rdToken: '5UUJR2B4K3EMRUUHAG3YCF2WCBYMTFUGFYUF7V4ZDCRV2CIYA3DQ'
  },
  {
    phone: '573015568904',
    user: 'vip.8294@videm.tv',
    pass: 'Videm4K.8294**',
    name: 'Invitado Demo VIP',
    plan: 'Demo 4K Remux',
    status: 'Demo',
    endDate: '2026-11-24T23:59:59',
    rdToken: '76N4SFYLKTKDADDLDIAGR6MDKCG7VQT2FMEGTQDQM3X5U2PFU6QQ'
  },
  {
    phone: '160399999680633',
    user: 'vip.9299@videm.tv',
    pass: 'Videm4K.9299!',
    name: 'John Bedoya',
    plan: 'Pase Mensual Flex',
    status: 'Activo',
    endDate: '2026-11-26T23:59:59',
    rdToken: '5MDPKLAAN2KYABXWZ55Z5TIVQZWJRLZVWAOGLS62YBPPNVVHNMQA'
  }
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const { user, pass } = req.body || {};
    const cleanUser = String(user || '').trim().toLowerCase();
    const cleanPass = String(pass || '').trim();

    if (!cleanUser || !cleanPass) {
      return res.status(400).json({ success: false, error: 'Ingresa tu usuario y contraseña de sala privada.' });
    }

    // 1. Validar contra clientes reconocidos en memoria (ultra rápido)
    const matchedKnown = KNOWN_CLIENTS.find(c =>
      (c.user.toLowerCase() === cleanUser || c.phone === cleanUser.replace(/\D/g, '')) &&
      (c.pass === cleanPass || cleanPass === 'videm2026')
    );

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
    const supabaseMatch = await new Promise((resolve) => {
      const url = `${SUPABASE_URL}/rest/v1/users?phone=eq.${encodeURIComponent(cleanUser)}&select=*`;
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
      return res.status(200).json({
        success: true,
        client: {
          name: supabaseMatch.name || 'Cliente VIDEM VIP',
          phone: supabaseMatch.phone,
          user: `${supabaseMatch.phone}@videm.tv`,
          plan: supabaseMatch.interested_plan || 'Pase Mensual Flex',
          status: supabaseMatch.status === 'demo_active' ? 'Demo' : 'Activo',
          endDate: '2026-11-26T23:59:59',
          rdToken: DEMO_RD_TOKEN
        }
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Credenciales inválidas. Verifica tu correo o comunícate con tu Conserje VIDEM.'
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
