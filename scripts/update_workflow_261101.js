const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'workflows', 'VIDEM - AI Concierge & Smart TV Queue Manager (Supabase + Evolution).json');
const destPath = path.join(__dirname, '..', 'workflows', 'VIDEM - AI Concierge & Smart TV Queue Manager (Supabase + Evolution) - 261101.json');

const wf = JSON.parse(fs.readFileSync(srcPath, 'utf8'));

// 1. Rename workflow with traceability
wf.name = 'VIDEM - AI Concierge & Smart TV Queue Manager (Supabase + Evolution) - 261101';

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
  senderName = data.pushName || "Cliente";
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
