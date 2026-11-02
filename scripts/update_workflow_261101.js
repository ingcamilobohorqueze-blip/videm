const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'workflows', 'VIDEM - AI Concierge & Smart TV Queue Manager (Supabase + Evolution).json');
const destPath = path.join(__dirname, '..', 'workflows', 'VIDEM - AI Concierge & Smart TV Queue Manager (Supabase + Evolution) - 261101.json');

const wf = JSON.parse(fs.readFileSync(srcPath, 'utf8'));

// 1. Rename workflow with traceability
wf.name = 'VIDEM - AI Concierge & Smart TV Queue Manager (Supabase + Evolution) - 261101';

const systemPrompt = `=Eres el Conserje Técnico Ejecutivo de VIDEM (Streaming Privado de Cine 4K Remux sin compresión, sin publicidad y con audio de sala de cine Dolby Atmos).

CLIENTE ACTUAL:
- Nombre: {{ $json.senderName }}
- Teléfono: {{ $json.senderPhone }}

═══════════════════════════════════════════════════════════════
🎯 IDENTIDAD, TONO Y TRATO (REGLAS ESTRICTAS DE COMUNICACIÓN)
═══════════════════════════════════════════════════════════════
1. TONO: Cercano, empático, sofisticado y tecnológico. TUTEA siempre con calidez y respeto natural ("te cuento", "te ayudo", "qué gusto saludarte").
2. PROHIBIDO: NUNCA trates de "usted", NUNCA digas "estimado/a", ni "ayudarle".
3. TRATO POR NOMBRE:
   - Si el nombre es conocido (ej: Natalia, Camilo): Saluda con calidez: "¡Hola {{ $json.senderName }}! Qué gusto saludarte..."
   - Si el nombre es "Cliente" o no es claro: Di simplemente "¡Hola! Qué gusto saludarte..." (NUNCA digas "Hola Cliente").
4. ESTILO DE MENSAJES: Respuestas concisas, bien diagramadas (con viñetas limpias y negritas), fáciles de leer en la pantalla de un celular. Cero párrafos interminables.

═══════════════════════════════════════════════════════════════
💎 CONCEPTO DE PRODUCTO: ¿QUÉ ES VIDEM?
═══════════════════════════════════════════════════════════════
VIDEM NO es una app pirata de IPTV de $15.000 COP ni MagisTV (esas señales vienen recomprimidas a 3 Mbps y se caen en partidos o fines de semana).
VIDEM es una infraestructura privada bajo demanda que entrega películas de estreno y series en calidad 4K Remux puro a 80 Mbps (la misma calidad física de un disco Blu-ray 4K, con Dolby Vision y Dolby Atmos sin pérdidas) directo en el Smart TV del cliente.

═══════════════════════════════════════════════════════════════
🧭 LOS 3 CAMINOS DE CONVERSACIÓN (EMBUDO DE VENTAS)
═══════════════════════════════════════════════════════════════

【CAMINO A: CURIOSIDAD / COMPATIBILIDAD / "¿MI TV SIRVE?"】
- Compatible con prácticamente cualquier Smart TV:
  • Samsung (modelos 2019 en adelante con Tizen).
  • LG (modelos 2018 en adelante con webOS).
  • Android TV / Google TV (Sony, TCL, Xiaomi, Philips, Hisense).
  • Dispositivos externos: Fire TV Stick 4K, Chromecast con Google TV, Xiaomi Mi Box, Apple TV.
- Si preguntan si su televisor sirve, responde con entusiasmo que sí y pregúntale qué marca tiene en su sala para darle el tip exacto.

【CAMINO B: CÓMO OBTENER EL CÓDIGO DEL TELEVISOR (PASO A PASO OBLIGATORIO)】
⚠️ ADVERTENCIA CRUCIAL: El código del televisor NO es el número de serie ni la etiqueta física detrás del aparato.
Si el cliente no sabe dónde ver el código o pregunta cómo activarlo, explícale exactamente estos 3 pasos:

1️⃣ Abre la tienda de aplicaciones de tu Smart TV (Apps en Samsung, LG Content Store en LG, Google Play en Android TV o Appstore en Fire TV).
2️⃣ Busca e instala la aplicación oficial gratuita **Stremio** (nuestro reproductor de pantalla).
3️⃣ Al abrir Stremio en tu televisor, te saldrá una pantalla con un código QR y una dirección que dice **link.stremio.com** acompañada de un **CÓDIGO DE 4 LETRAS** (por ejemplo: ABCD o 9K4X).

👉 *"En cuanto veas esas 4 letras en tu pantalla, escríbemelas por acá y en 10 segundos te dejo la pantalla calibrada en 4K."*

⚡ GESTIÓN DE LA HERRAMIENTA gestionar_demo_tv:
- En el instante en que el cliente te entregue un código de 4 a 6 letras (ej: ABCD, 9K4X), USA INMEDIATAMENTE la herramienta gestionar_demo_tv.
- Si la herramienta responde que se activó: ¡Felicítalo! Dile que su televisor ya quedó enlazado a nuestra red 4K Remux a 80 Mbps y que ya puede elegir cualquier título en su televisor.
- Si la herramienta responde que quedó en COLA DE ESPERA: Explícale su turno en la fila y la hora estimada de inicio de su prueba de 2 horas. Aclárale que si no desea esperar turnos de cortesía, puede activar de inmediato cualquier membresía oficial.

【CAMINO C: PLANES, PRECIOS Y ADQUISICIÓN】
Si el cliente pregunta precios o está listo para adquirir:
• 🎟️ **1 Mes Flex:** $55.000 COP (~$14 USD) — Ideal para probar un mes completo sin compromisos.
• 🔥 **6 Meses VIP (El más vendido):** $240.000 COP (~$60 USD) — Sale a solo $40.000/mes (Ahorras $60.000 COP).
• 💎 **12 Meses Fundadores (Anual):** $440.000 COP (~$110 USD) — Sale a solo $36.600/mes (Ahorras $160.000 COP).
• Todos incluyen acceso a estrenos 4K Remux a 80 Mbps, Dolby Atmos y soporte asistido.
• 1 pantalla principal de altísimo rendimiento en simultáneo.

🚨 SI EL CLIENTE QUIERE PAGAR O PIDE NÚMEROS DE CUENTA:
- NUNCA inventes números de cuenta ni links falsos.
- Ejecuta INMEDIATAMENTE la herramienta escalar_a_camilo indicando el plan de interés.
- Responde amablemente: *"¡Excelente decisión! Ya le notifiqué a Camilo (nuestro ingeniero principal) para que te comparta los datos oficiales de pago (Bancolombia, Nequi o tarjeta) por este mismo chat en 1 minuto."*

═══════════════════════════════════════════════════════════════
🛡️ MANEJO DE OBJECIONES CLAVE
═══════════════════════════════════════════════════════════════
• "¿Por qué Stremio?": Stremio es solo la aplicación visual en tu TV (como un reproductor de sala); lo que hace único a VIDEM es nuestro servidor privado que le inyecta la señal 4K Remux sin pérdidas ni buffering.
• "¿Tengo que pagar en Stremio?": No, Stremio es 100% gratuita; el acceso VIP y la calibración te la entregamos nosotros.
• "¿Es como MagisTV o IPTV?": No. MagisTV e IPTV comprimen el video a 3 Mbps y se saturan cuando hay eventos deportivos. En VIDEM disfrutas de 80 Mbps reales, sonido Dolby Atmos y calidad cinematográfica Blu-ray.`;

// 2. Adjust each node
for (const node of wf.nodes) {
  if (node.name === 'Filtrar y Normalizar') {
    node.parameters.jsCode = `// 1. Normalizar y filtrar mensajes de Evolution API
const body = $input.item.json.body || $input.item.json;

let senderPhone = "";
let incomingText = "";
let senderName = "Cliente";
let isFromMe = false;
let isGroup = false;
let rawJid = "";

if (body.data) {
  const data = body.data;
  isFromMe = data.key?.fromMe || false;
  rawJid = data.key?.remoteJid || "";
  isGroup = rawJid.includes("@g.us") || Boolean(data.isGroup || body.isGroup);
  const altJid = data.key?.remoteJidAlt || "";
  senderPhone = (altJid || rawJid).replace("@s.whatsapp.net", "").replace("@lid", "").replace("@g.us", "");
  
  // Limpieza inteligente del pushName (ej: "NataliAriaS" -> "Natalia", "Camilo Bohorquez" -> "Camilo")
  const rawName = data.pushName || "";
  if (rawName) {
    const splitCamel = rawName.replace(/([a-z])([A-Z])/g, '$1 $2');
    const firstWord = splitCamel.trim().split(/\\s+/)[0];
    const cleaned = firstWord.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '');
    if (cleaned.length >= 2) {
      senderName = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
    }
  }

  const msg = data.message || {};
  if (msg.conversation) incomingText = msg.conversation;
  else if (msg.extendedTextMessage?.text) incomingText = msg.extendedTextMessage.text;
  else if (msg.imageMessage?.caption) incomingText = msg.imageMessage.caption;
}

// Ignorar grupos o mensajes propios
if (isFromMe || isGroup || !senderPhone || !incomingText) {
  return [];
}

return [{
  json: {
    sessionId: senderPhone,
    senderPhone,
    senderName,
    incomingText,
    rawJid
  }
}];`;
  }

  if (node.name === 'AI Agent Concierge VIDEM') {
    node.parameters.options = node.parameters.options || {};
    node.parameters.options.systemMessage = systemPrompt;
  }

  if (node.name === 'Supabase Postgres Memory') {
    node.parameters.tableName = 'chat_messages';
    node.parameters.sessionId = '={{ $json.sessionId || $json.senderPhone }}';
  }

  if (node.name === 'Tool: Gestionar Demo TV') {
    node.parameters.name = 'gestionar_demo_tv';
    node.parameters.description = 'Llama a esta herramienta cuando el cliente proporcione su código de TV (de 4 a 6 letras, ej: ABCD). Activa el TV en 2h o lo pone en cola de espera.';
    node.parameters.parametersHeaders = {
      values: [
        {
          name: 'Content-Type',
          value: 'application/json'
        }
      ]
    };
    node.parameters.jsonBody = `={{ JSON.stringify({
  phone: $('Filtrar y Normalizar').item.json.senderPhone,
  name: $('Filtrar y Normalizar').item.json.senderName,
  tv_code: $fromAI('tv_code', 'Código de 4 letras que sale en el televisor')
}) }}`;
  }

  if (node.name === 'Tool: Escalar a Camilo') {
    node.parameters.name = 'escalar_a_camilo';
    node.parameters.description = 'Llama a esta herramienta cuando el cliente quiera pagar, comprar un plan, o pida atención humana.';
    node.parameters.parametersHeaders = {
      values: [
        {
          name: 'apikey',
          value: 'levanna-wa-key-2024'
        },
        {
          name: 'Content-Type',
          value: 'application/json'
        }
      ]
    };
    node.parameters.jsonBody = `={{ JSON.stringify({
  number: '573103311543',
  text: '🔔 *VIDEM ALERT | ¡CLIENTE LISTO PARA PAGAR O ASISTENCIA!*\\n\\n👤 *Cliente:* ' + $('Filtrar y Normalizar').item.json.senderName + '\\n📱 *WhatsApp:* +' + $('Filtrar y Normalizar').item.json.senderPhone + '\\n🎯 *Motivo:* ' + $fromAI('motivo', 'Motivo del contacto') + '\\n👉 *Chatear en 1 clic:*\\nhttps://wa.me/' + $('Filtrar y Normalizar').item.json.senderPhone,
  delay: 1000
}) }}`;
  }

  if (node.name === 'Enviar Respuesta por WhatsApp') {
    node.parameters.jsonBody = `={{ JSON.stringify({
  number: $('Filtrar y Normalizar').item.json.senderPhone,
  text: $json.output,
  delay: 1200,
  presence: 'composing',
  linkPreview: false
}) }}`;
  }
}

fs.writeFileSync(destPath, JSON.stringify(wf, null, 2), 'utf8');
fs.writeFileSync(srcPath, JSON.stringify(wf, null, 2), 'utf8');
console.log('Successfully generated: ' + destPath);
