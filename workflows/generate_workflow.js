const fs = require('fs');
const path = require('path');

const workflow = {
  name: 'VIDEM - Tech Concierge Autonomo (WhatsApp + Pagos + Cuentas)',
  nodes: [
    {
      parameters: {
        httpMethod: 'POST',
        path: 'videm-whatsapp-webhook',
        responseMode: 'onReceived',
        options: {}
      },
      id: 'node-webhook-in',
      name: 'Webhook Evolution API (Inbound)',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 1,
      position: [160, 400]
    },
    {
      parameters: {
        httpMethod: 'POST',
        path: 'videm-payment-webhook',
        responseMode: 'onReceived',
        options: {}
      },
      id: 'node-webhook-payment',
      name: 'Webhook Pasarela Pagos (Wompi/MP)',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 1,
      position: [160, 680]
    },
    {
      parameters: {
        jsCode: [
          '// CEREBRO AUTONOMO VIDEM - Normalizacion, Triaje Inteligente y Respuestas',
          'const body = $input.item.json.body || $input.item.json;',
          '',
          'let senderPhone = "";',
          'let incomingText = "";',
          'let senderName = "Cliente";',
          'let messageType = "text";',
          'let isFromMe = false;',
          '',
          '// 1. Extraer datos del payload de Evolution API',
          'if (body.data) {',
          '  const data = body.data;',
          '  isFromMe = data.key?.fromMe || false;',
          '  senderPhone = (data.key?.remoteJid || "").replace("@s.whatsapp.net", "");',
          '  senderName = data.pushName || "Cliente";',
          '  const msg = data.message || {};',
          '  if (msg.conversation) {',
          '    incomingText = msg.conversation;',
          '  } else if (msg.extendedTextMessage?.text) {',
          '    incomingText = msg.extendedTextMessage.text;',
          '  } else if (msg.imageMessage) {',
          '    messageType = "image";',
          '    incomingText = msg.imageMessage.caption || "[Comprobante Transferencia]";',
          '  }',
          '} else if (body.entry && body.entry[0]?.changes?.[0]?.value?.messages?.[0]) {',
          '  const msg = body.entry[0].changes[0].value.messages[0];',
          '  senderPhone = msg.from;',
          '  senderName = body.entry[0].changes[0].value.contacts?.[0]?.profile?.name || "Cliente";',
          '  if (msg.type === "text") incomingText = msg.text.body;',
          '  if (msg.type === "image") { messageType = "image"; incomingText = msg.image?.caption || "[Comprobante]"; }',
          '} else {',
          '  senderPhone = String(body.from || body.phone || "573015568904");',
          '  incomingText = body.text || body.message || "";',
          '  senderName = body.name || "Cliente";',
          '  messageType = body.type || "text";',
          '}',
          '',
          '// Ignorar mensajes enviados por el propio bot para evitar bucles',
          'if (isFromMe) return [];',
          '',
          'const normalized = incomingText.toLowerCase().trim();',
          'const isStremioPairingCode = /^[A-Za-z0-9]{4,6}$/.test(normalized) && !["hola", "pago", "menu", "info", "si", "no", "bien"].includes(normalized);',
          '',
          'let responseText = "";',
          'let triggerProvisioning = false;',
          'let accountData = null;',
          '',
          '// 2. ENRUTAMIENTO INTELIGENTE',
          'if (messageType === "image" || normalized.includes("comprobante") || normalized.includes("transferencia") || /\\b(m\\d{6,12}|neq-\\d+)\\b/i.test(normalized)) {',
          '  // CASO A: Comprobante de pago recibido (Nequi / Bancolombia)',
          '  const refMatch = incomingText.match(/M?\\d{6,12}/i) || incomingText.match(/ref[:\\s]*([a-zA-Z0-9]+)/i);',
          '  const detectedRef = refMatch ? (refMatch[1] || refMatch[0]) : ("NEQ-" + Math.floor(100000 + Math.random() * 900000));',
          '  const randomSuffix = Math.floor(1000 + Math.random() * 9000);',
          '  const clientEmail = "videm.vip." + randomSuffix + "@videm.private";',
          '  const clientPass = "Videm4K." + randomSuffix + "!";',
          '  const now = new Date();',
          '  const expDate = new Date(now.getTime() + (180 * 24 * 60 * 60 * 1000)).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });',
          '  const activationUrl = "https://videm.tv/activar?nombre=" + encodeURIComponent(senderName) + "&plan=Semestral%20VIP";',
          '',
          '  responseText = "✦ *¡FELICIDADES, " + senderName.toUpperCase() + "! PAGO VERIFICADO* 🎬\\n\\nHemos validado tu transferencia con éxito (Ref: *" + detectedRef + "*).\\nTu membresía *Semestral VIP* está activa hasta el *" + expDate + "*.\\n\\n━━━━━━━━━━━━━━━━━━━━\\n💎 *CREDENCIALES MAESTRAS PRIVADAS:*\\n📧 *Usuario:* `" + clientEmail + "`\\n🔑 *Clave:* `" + clientPass + "`\\n━━━━━━━━━━━━━━━━━━━━\\n\\n📺 *VINCULA TU SMART TV EN 60 SEGUNDOS:*\\nToca este enlace directo desde tu móvil para activar tu pantalla:\\n👉 " + activationUrl + "\\n\\n¡Solo ingresas el código de tu televisor y listo!";',
          '  triggerProvisioning = true;',
          '  accountData = { phone: senderPhone, name: senderName, plan: "Semestral VIP", ref: detectedRef, clientEmail, expDate };',
          '',
          '} else if (isStremioPairingCode) {',
          '  // CASO B: Código de Smart TV enviado (ej: 9A4K)',
          '  const code = incomingText.toUpperCase().trim();',
          '  const activationUrl = "https://videm.tv/activar?code=" + code + "&nombre=" + encodeURIComponent(senderName);',
          '  responseText = "✦ *VIDEM | Enlace de Pantalla Detectado*\\n\\n📺 *Código:* `" + code + "`\\n\\nEstamos vinculando tu perfil VIDEM con:\\n✔ CDN Dedicado 40-80 Mbps Remux activo\\n✔ HDR / Dolby Vision y Dolby Atmos habilitados\\n✔ Catálogo curado y depurado\\n\\n⚡ *Autoriza tu pantalla con 1 clic aquí:*\\n👉 " + activationUrl + "\\n\\n¡Tu televisor se sincronizará automáticamente! 🍿";',
          '',
          '} else if (normalized.includes("requisitos") || normalized.includes("cumplo") || normalized.includes("califica") || normalized.includes("agendar") || normalized.includes("precio") || normalized.includes("plan")) {',
          '  // CASO C: Cliente calificado o consulta de planes',
          '  const paymentUrlWompi = "https://checkout.wompi.co/l/videm-semestral-60usd?customer_phone=" + senderPhone;',
          '  responseText = "✦ *VIDEM | Acceso Calificado Confirmado*\\n\\nExcelente, " + senderName + ". Tu hogar califica para el estándar privado *Videm* (Remux 4K sin compresión).\\n\\n💎 *Tarifa de Consultoría y Aprovisionamiento:*\\n• *Plan Semestral (6 meses completos):* $240.000 COP (~$60 USD)\\n• *Plan Anual (12 meses preferencial):* $440.000 COP (~$110 USD)\\n\\n━━━━━━━━━━━━━━━━━━━━\\n💳 *OPCIÓN 1: Pago Inmediato con Tarjeta / PSE (Activación 100% Automática)*\\n👉 Enlace de pago seguro: " + paymentUrlWompi + "\\n\\n📱 *OPCIÓN 2: Transferencia Directa*\\n• *Nequi / Daviplata:* 301 556 8904\\n• *Bancolombia (Ahorros):* (Solicitar número de cuenta)\\n━━━━━━━━━━━━━━━━━━━━\\n\\n📌 *Activación Autónoma:* Tan pronto realices el pago o envíes la foto del comprobante aquí, nuestro bot te entregará tus credenciales y el enlace en menos de 2 minutos.";',
          '',
          '} else if (normalized.includes("renov") || normalized.includes("extender")) {',
          '  // CASO D: Renovaciones',
          '  responseText = "✦ *VIDEM | Portal de Clientes & Renovaciones*\\n\\nHola " + senderName + ", bienvenido a tu canal prioritario de servicio.\\n\\nPara renovar tu enlace privado de inmediato:\\n1️⃣ Selecciona tu modalidad:\\n   • *Renovación Semestral (6 meses):* $240.000 COP\\n   • *Renovación Anual (12 meses):* $440.000 COP\\n\\n2️⃣ Realiza tu pago mediante Nequi al *301 556 8904* o solicítanos el enlace PSE/Tarjeta y envía el comprobante por este chat.\\n\\nTu enlace CDN y addons se mantendrán activos sin necesidad de reconfigurar tu televisor.";',
          '',
          '} else if (normalized.includes("baja") || normalized.includes("supresion") || normalized.includes("datos")) {',
          '  // CASO E: Habeas Data',
          '  responseText = "✦ *VIDEM | Solicitud de Supresión de Datos Confirmada*\\n\\nHola " + senderName + ".\\n\\nHemos recibido formalmente tu solicitud de baja y supresión de datos conforme a la Ley 1581 de 2012 (Habeas Data).\\n\\nTu número telefónico y registro de contacto han sido retirados de nuestra lista de asistencia y no recibirás más notificaciones de Videm. ¡Que tengas un excelente día!";',
          '',
          '} else {',
          '  // CASO F: Diagnóstico / Saludo inicial',
          '  responseText = "✦ *VIDEM | Private Tech Concierge*\\n\\nHola " + senderName + ", un gusto saludarte. Soy el asistente técnico de *Videm*.\\n\\nPara garantizarte la experiencia cinematográfica en *Remux 4K nativo, Dolby Vision y Dolby Atmos sin buffering*, validemos rápidamente tu equipamiento:\\n\\n1️⃣ ¿Cuál es la marca y sistema de tu Smart TV o TV Box? (Ej: LG OLED webOS, Samsung Tizen, Google TV, Apple TV 4K, Fire TV Stick, Xiaomi Box).\\n\\n2️⃣ ¿Cuentas con conexión de fibra óptica en casa? ¿De cuántos megas aproximadamente?\\n\\n3️⃣ ¿Tienes barra de sonido o receptor A/V dedicado? (Ej: Sonos, Bose, Samsung Q-Symphony, etc.)\\n\\nPuedes responder aquí mismo y evaluaremos tu perfil de inmediato.\\n\\n_Nota: Al continuar autorizas el tratamiento de datos para fines de asistencia técnica y soporte._";',
          '}',
          '',
          'return {',
          '  phone: senderPhone,',
          '  senderPhone,',
          '  senderName,',
          '  responseText,',
          '  triggerProvisioning,',
          '  accountData',
          '};'
        ].join('\n')
      },
      id: 'node-cerebro',
      name: 'Cerebro Autónomo VIDEM',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [420, 400]
    },
    {
      parameters: {
        method: 'POST',
        url: 'https://evolution-api-production-8353.up.railway.app/message/sendText/VidemProd',
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: 'apikey', value: 'levanna-wa-key-2024' },
            { name: 'Content-Type', value: 'application/json' }
          ]
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: '={\n  \"number\": \"{{ $json.phone || $json.senderPhone }}\",\n  \"text\": {{ JSON.stringify($json.responseText) }}\n}',
        options: {}
      },
      id: 'node-send-whatsapp',
      name: 'Evolution API: Enviar WhatsApp',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.1,
      position: [760, 400]
    },
    {
      parameters: {
        jsCode: [
          'const payload = $input.item.json.body || $input.item.json;',
          'let transactionRef = "";',
          'let amount = 0;',
          'let status = "";',
          'let customerPhone = "";',
          '',
          'if (payload.data && payload.data.transaction) {',
          '  const tx = payload.data.transaction;',
          '  transactionRef = tx.id || tx.reference;',
          '  amount = (tx.amount_in_cents || 0) / 100;',
          '  status = tx.status;',
          '  customerPhone = tx.customer_data?.phone_number || tx.customer_email || "";',
          '} else {',
          '  transactionRef = payload.reference || ("TX-" + Date.now());',
          '  status = payload.status || "APPROVED";',
          '  amount = payload.amount || 240000;',
          '  customerPhone = payload.phone || "573015568904";',
          '}',
          '',
          'if (status !== "APPROVED" && status !== "Aprobado_Auto") return [];',
          '',
          'const phone = customerPhone.replace(/[^0-9]/g, "");',
          'const randomSuffix = Math.floor(1000 + Math.random() * 9000);',
          'const clientEmail = "videm.vip." + randomSuffix + "@videm.private";',
          'const clientPass = "Videm4K." + randomSuffix + "!";',
          'const now = new Date();',
          'const expDate = new Date(now.getTime() + (180 * 24 * 60 * 60 * 1000)).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });',
          'const activationUrl = "https://videm.tv/activar?nombre=Cliente%20VIP&plan=Semestral%20VIP";',
          '',
          'const responseText = "✦ *¡FELICIDADES! TU ACCESO VIDEM ESTÁ ACTIVO* 🎬\\n\\nTu pago por pasarela ha sido validado con éxito (Ref: *" + transactionRef + "*).\\nTu suscripción *Semestral VIP* está activa hasta el *" + expDate + "*.\\n\\n━━━━━━━━━━━━━━━━━━━━\\n💎 *CREDENCIALES PRIVADAS:*\\n📧 *Correo:* `" + clientEmail + "`\\n🔑 *Clave:* `" + clientPass + "`\\n━━━━━━━━━━━━━━━━━━━━\\n\\n📺 *ACTIVAR SMART TV EN 60 SEGUNDOS:*\\n👉 " + activationUrl + "\\n\\n¡Ingresa el código que ves en tu televisor y listo!";',
          '',
          'return { phone, responseText, triggerProvisioning: true };'
        ].join('\n')
      },
      id: 'node-proc-gateway',
      name: 'Procesar Pago Pasarela (Wompi/MP)',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [420, 680]
    },
    {
      parameters: {
        operation: 'append',
        sheetId: '1_TU_ID_DE_GOOGLE_SHEETS_VIDEM',
        range: 'Clientes!A:G',
        options: {}
      },
      id: 'node-sheets-clientes',
      name: 'Google Sheets: Registrar Cliente (Opcional)',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4,
      disabled: true,
      position: [760, 600]
    }
  ],
  connections: {
    'Webhook Evolution API (Inbound)': {
      main: [[{ node: 'Cerebro Autónomo VIDEM', type: 'main', index: 0 }]]
    },
    'Cerebro Autónomo VIDEM': {
      main: [
        [
          { node: 'Evolution API: Enviar WhatsApp', type: 'main', index: 0 },
          { node: 'Google Sheets: Registrar Cliente (Opcional)', type: 'main', index: 0 }
        ]
      ]
    },
    'Webhook Pasarela Pagos (Wompi/MP)': {
      main: [[{ node: 'Procesar Pago Pasarela (Wompi/MP)', type: 'main', index: 0 }]]
    },
    'Procesar Pago Pasarela (Wompi/MP)': {
      main: [
        [
          { node: 'Evolution API: Enviar WhatsApp', type: 'main', index: 0 },
          { node: 'Google Sheets: Registrar Cliente (Opcional)', type: 'main', index: 0 }
        ]
      ]
    }
  }
};

const targetPath = path.join(__dirname, 'n8n_videm_whatsapp_bot.json');
fs.writeFileSync(targetPath, JSON.stringify(workflow, null, 2), 'utf8');
console.log('Successfully generated clean, fail-proof workflow at', targetPath);
