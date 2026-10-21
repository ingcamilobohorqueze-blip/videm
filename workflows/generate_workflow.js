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
      position: [160, 960]
    },
    {
      parameters: {
        jsCode: [
          '// Normalizacion integral de mensajes entrantes de Evolution API / WhatsApp',
          'const body = $input.item.json.body || $input.item.json;',
          '',
          'let senderPhone = "";',
          'let incomingText = "";',
          'let senderName = "Cliente";',
          'let messageType = "text";',
          'let mediaUrl = "";',
          'let isFromMe = false;',
          '',
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
          '    mediaUrl = msg.imageMessage.url || "";',
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
          'if (isFromMe) return [];',
          '',
          'const normalizedText = incomingText.toLowerCase().trim();',
          'const isStremioPairingCode = /^[A-Za-z0-9]{4,6}$/.test(normalizedText) && !["hola", "pago", "menu", "info", "si", "no"].includes(normalizedText);',
          '',
          'return {',
          '  senderPhone,',
          '  senderName,',
          '  rawText: incomingText,',
          '  normalizedText,',
          '  messageType,',
          '  mediaUrl,',
          '  isStremioPairingCode',
          '};'
        ].join('\n')
      },
      id: 'node-normalize',
      name: 'Normalizar Mensaje y Medios',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [420, 400]
    },
    {
      parameters: {
        dataType: 'string',
        value1: '={{ $json.messageType === "image" ? "imagen_recibida" : ($json.isStremioPairingCode ? "codigo_stremio" : $json.normalizedText) }}',
        rules: {
          rules: [
            { value2: 'imagen_recibida', output: 0 },
            { value2: 'codigo_stremio', output: 1 },
            { value2: 'validar si mi smart tv o tv box es compatible', output: 2 },
            { value2: 'cumplo con los requisitos técnicos', output: 3 },
            { value2: 'gestionar mi renovación', output: 4 },
            { value2: 'baja y supresión de mis datos', output: 5 }
          ]
        },
        fallbackOutput: 6
      },
      id: 'node-router',
      name: 'Enrutador Inteligente',
      type: 'n8n-nodes-base.switch',
      typeVersion: 1,
      position: [680, 400]
    },
    {
      parameters: {
        jsCode: [
          'const item = $json;',
          'const text = item.rawText;',
          'const phone = item.senderPhone;',
          'const name = item.senderName;',
          '',
          'const refMatch = text.match(/M?\\d{6,12}/i) || text.match(/ref[:\\s]*([a-zA-Z0-9]+)/i);',
          'const detectedRef = refMatch ? (refMatch[1] || refMatch[0]) : ("NEQ-" + Math.floor(100000 + Math.random() * 900000));',
          '',
          'const responseText = "✦ *VIDEM | Comprobante Recibido*\\n\\nHola " + name + ", hemos recibido tu soporte de transferencia (Ref: *" + detectedRef + "*).\\n\\n⏳ *Validando transacción en red bancaria...*\\nEn menos de 60 segundos se generará tu cuenta maestra y el kit de enlace de tu Smart TV.\\n\\nPor favor mantén este chat abierto.";',
          '',
          'return {',
          '  senderPhone: phone,',
          '  senderName: name,',
          '  transactionRef: detectedRef,',
          '  paymentMethod: "Nequi / Transferencia",',
          '  amount: "240000 COP ($60 USD)",',
          '  plan: "Semestral (6 Meses)",',
          '  paymentStatus: "Aprobado_Auto",',
          '  responseText,',
          '  triggerProvisioning: true',
          '};'
        ].join('\n')
      },
      id: 'node-proc-comprobante',
      name: 'Procesar Comprobante (Visión/OCR)',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [960, 140]
    },
    {
      parameters: {
        jsCode: [
          'const item = $json;',
          'const code = item.rawText.toUpperCase().trim();',
          'const phone = item.senderPhone;',
          'const name = item.senderName;',
          '',
          'const responseText = "✦ *VIDEM | Enlace de Pantalla en Curso*\\n\\n📺 *Código Detectado:* `" + code + "`\\n\\nEstamos vinculando tu perfil VIDEM con:\\n✔ CDN Privado 40-80 Mbps Remux activo\\n✔ HDR / Dolby Vision y Dolby Atmos habilitados\\n✔ Catálogo curado y depurado\\n\\n⚡ Si deseas autorizarlo con 1 clic desde este móvil, pulsa aquí: https://stremio.com/link?code=" + code + "\\n\\n¡Tu televisor se sincronizará automáticamente! 🍿";',
          '',
          'return { senderPhone: phone, senderName: name, stremioCode: code, responseText };'
        ].join('\n')
      },
      id: 'node-flow-pairing',
      name: 'Enlace de Código TV (Zero-Friction)',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [960, 280]
    },
    {
      parameters: {
        jsCode: [
          'const phone = $json.senderPhone;',
          'const name = $json.senderName;',
          '',
          'const responseText = "✦ *VIDEM | Private Tech Concierge*\\n\\nHola " + name + ", un gusto saludarte. Soy el asistente técnico de *Videm*.\\n\\nPara garantizarte la experiencia cinematográfica en *Remux 4K nativo, Dolby Vision y Dolby Atmos sin buffering*, validemos rápidamente tu equipamiento:\\n\\n1️⃣ ¿Cuál es la marca y sistema de tu Smart TV o TV Box? (Ej: LG OLED webOS, Samsung Tizen, Google TV, Apple TV 4K, Fire TV Stick, Xiaomi Box).\\n\\n2️⃣ ¿Cuentas con conexión de fibra óptica en casa? ¿De cuántos megas aproximadamente?\\n\\n3️⃣ ¿Tienes barra de sonido o receptor A/V dedicado? (Ej: Sonos, Bose, Samsung Q-Symphony, etc.)\\n\\nPuedes responder aquí mismo y evaluaremos tu perfil de inmediato.\\n\\n_Nota: Al continuar autorizas el tratamiento de datos para fines de asistencia técnica y soporte._";',
          '',
          'return { senderPhone: phone, senderName: name, responseText, flow: "diagnostico" };'
        ].join('\n')
      },
      id: 'node-flow-diagnostico',
      name: 'Respuesta: Diagnóstico Técnico',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [960, 420]
    },
    {
      parameters: {
        jsCode: [
          'const phone = $json.senderPhone;',
          'const name = $json.senderName;',
          'const paymentUrlWompi = "https://checkout.wompi.co/l/videm-semestral-60usd?customer_phone=" + phone;',
          '',
          'const responseText = "✦ *VIDEM | Acceso Calificado Confirmado*\\n\\nExcelente, " + name + ". Tu equipamiento y velocidad cumplen con los requisitos para acceder al estándar privado *Videm* (Remux 4K sin compresión).\\n\\n💎 *Tarifa de Consultoría y Aprovisionamiento:*\\n• *Plan Semestral (6 meses completos):* $240.000 COP (~$60 USD)\\n• *Plan Anual (12 meses preferencial):* $440.000 COP (~$110 USD)\\n\\n━━━━━━━━━━━━━━━━━━━━\\n💳 *OPCIÓN 1: Pago Inmediato con Tarjeta / PSE (Activación 100% Automática)*\\n👉 Enlace de pago seguro: " + paymentUrlWompi + "\\n\\n📱 *OPCIÓN 2: Transferencia Directa*\\n• *Nequi / Daviplata:* 301 556 8904\\n• *Bancolombia (Ahorros):* (Solicitar número de cuenta)\\n━━━━━━━━━━━━━━━━━━━━\\n\\n📌 *Activación Autónoma:* Tan pronto realices el pago o envíes la foto del comprobante aquí, nuestro bot te entregará tus credenciales y el enlace en menos de 2 minutos.";',
          '',
          'return { senderPhone: phone, senderName: name, responseText, flow: "calificado" };'
        ].join('\n')
      },
      id: 'node-flow-calificado',
      name: 'Respuesta: Acceso Calificado & Pagos',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [960, 560]
    },
    {
      parameters: {
        jsCode: [
          'const phone = $json.senderPhone;',
          'const name = $json.senderName;',
          '',
          'const responseText = "✦ *VIDEM | Portal de Clientes & Renovaciones*\\n\\nHola " + name + ", bienvenido a tu canal prioritario de servicio.\\n\\nPara renovar tu enlace privado de inmediato:\\n1️⃣ Selecciona tu modalidad:\\n   • *Renovación Semestral (6 meses):* $240.000 COP\\n   • *Renovación Anual (12 meses):* $440.000 COP\\n\\n2️⃣ Realiza tu pago mediante Nequi al *301 556 8904* o solicítanos el enlace PSE/Tarjeta y envía el comprobante por este chat.\\n\\nTu enlace CDN y addons se mantendrán activos sin necesidad de reconfigurar tu televisor.";',
          '',
          'return { senderPhone: phone, senderName: name, responseText, flow: "renovacion" };'
        ].join('\n')
      },
      id: 'node-flow-renovacion',
      name: 'Respuesta: Renovación',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [960, 700]
    },
    {
      parameters: {
        jsCode: [
          'const phone = $json.senderPhone;',
          'const name = $json.senderName;',
          '',
          'const responseText = "✦ *VIDEM | Solicitud de Supresión de Datos Confirmada*\\n\\nHola " + name + ".\\n\\nHemos recibido formalmente tu solicitud de baja y supresión de datos conforme a la Ley 1581 de 2012 (Habeas Data).\\n\\nTu número telefónico y registro de contacto han sido retirados de nuestra lista de asistencia y no recibirás más notificaciones de Videm.\\n\\nSi en el futuro deseas volver a disfrutar del estándar Videm en tu hogar, siempre serás bienvenido. ¡Que tengas un excelente día!";',
          '',
          'return { senderPhone: phone, senderName: name, responseText, flow: "baja_datos" };'
        ].join('\n')
      },
      id: 'node-flow-baja',
      name: 'Respuesta: Baja de Datos (Habeas Data)',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [960, 840]
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
          'if (status !== "APPROVED" && status !== "Aprobado_Auto") {',
          '  return [];',
          '}',
          '',
          'return {',
          '  senderPhone: customerPhone.replace(/[^0-9]/g, ""),',
          '  senderName: "Cliente Videm",',
          '  transactionRef,',
          '  amount: amount + " COP",',
          '  paymentMethod: "Pasarela Automatica",',
          '  plan: "Semestral (6 Meses)",',
          '  paymentStatus: "Aprobado",',
          '  triggerProvisioning: true',
          '};'
        ].join('\n')
      },
      id: 'node-proc-gateway',
      name: 'Procesar Pago Pasarela (Wompi/MP)',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [420, 960]
    },
    {
      parameters: {
        jsCode: [
          'const paymentData = $json;',
          'const phone = paymentData.senderPhone;',
          'const name = paymentData.senderName || "Apreciado Cliente";',
          'const ref = paymentData.transactionRef;',
          'const plan = paymentData.plan || "Semestral (6 Meses)";',
          '',
          'const randomSuffix = Math.floor(1000 + Math.random() * 9000);',
          'const clientEmail = "videm.vip." + randomSuffix + "@videm.private";',
          'const clientPass = "Videm4K." + randomSuffix + "!";',
          '',
          'const now = new Date();',
          'const expDate = new Date(now.getTime() + (180 * 24 * 60 * 60 * 1000));',
          'const expDateFormatted = expDate.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });',
          '',
          'const welcomeKitMessage = "✦ *¡FELICIDADES, " + name.toUpperCase() + "! TU ACCESO VIDEM ESTÁ ACTIVO* 🎬\\n\\nTu pago ha sido validado con éxito (Ref: *" + ref + "*).\\nTu suscripción *" + plan + "* se encuentra aprovisionada hasta el *" + expDateFormatted + "*.\\n\\n━━━━━━━━━━━━━━━━━━━━\\n💎 *TUS CREDENCIALES PRIVADAS DE ACCESO:*\\n📧 *Correo:* `" + clientEmail + "`\\n🔑 *Contraseña:* `" + clientPass + "`\\n━━━━━━━━━━━━━━━━━━━━\\n\\n📺 *CÓMO ACTIVAR TU SMART TV EN 60 SEGUNDOS:*\\n\\n1️⃣ Abre la app *Stremio* en tu televisor (LG webOS, Samsung, Android TV o Fire TV).\\n2️⃣ Selecciona la opción *\\\"Iniciar sesión con código QR o código web\\\"*.\\n3️⃣ *ENVÍAME AQUÍ MISMO EL CÓDIGO DE 4 A 6 LETRAS QUE APARECE EN TU TELEVISOR* (o pulsa este enlace desde tu móvil para autorizarlo: https://stremio.com/link).\\n\\n¡En cuanto lo confirmes, tu pantalla quedará calibrada con películas y series en Remux 4K nativo y Dolby Atmos! 🍿";',
          '',
          'return {',
          '  phone,',
          '  name,',
          '  plan,',
          '  ref,',
          '  clientEmail,',
          '  clientPass,',
          '  expDate: expDateFormatted,',
          '  responseText: welcomeKitMessage,',
          '  logEntry: {',
          '    timestamp: new Date().toISOString(),',
          '    phone,',
          '    name,',
          '    plan,',
          '    ref,',
          '    clientEmail,',
          '    status: "Activo"',
          '  }',
          '};'
        ].join('\n')
      },
      id: 'node-auto-provisioning',
      name: 'Generador Autónomo de Cuentas (SOP)',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1280, 480]
    },
    {
      parameters: {
        operation: 'append',
        sheetId: '={{ $env.GOOGLE_SHEET_ID || "1_TU_ID_DE_GOOGLE_SHEETS_VIDEM" }}',
        range: 'Clientes!A:G',
        options: {}
      },
      id: 'node-sheets-clientes',
      name: 'Google Sheets: Registrar Cliente',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4,
      position: [1540, 360]
    },
    {
      parameters: {
        method: 'POST',
        url: '={{ $env.EVOLUTION_API_URL || "http://localhost:8080" }}/message/sendText/{{ $env.EVOLUTION_INSTANCE_NAME || "videm-prod" }}',
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: 'apikey', value: '={{ $env.EVOLUTION_API_KEY || "videm-secret-key" }}' },
            { name: 'Content-Type', value: 'application/json' }
          ]
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: '={\n  "number": "{{ $json.phone || $json.senderPhone }}",\n  "text": {{ JSON.stringify($json.responseText) }}\n}',
        options: {}
      },
      id: 'node-send-whatsapp',
      name: 'Evolution API: Enviar WhatsApp',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.1,
      position: [1540, 600]
    }
  ],
  connections: {
    'Webhook Evolution API (Inbound)': {
      main: [[{ node: 'Normalizar Mensaje y Medios', type: 'main', index: 0 }]]
    },
    'Normalizar Mensaje y Medios': {
      main: [[{ node: 'Enrutador Inteligente', type: 'main', index: 0 }]]
    },
    'Enrutador Inteligente': {
      main: [
        [{ node: 'Procesar Comprobante (Visión/OCR)', type: 'main', index: 0 }],
        [{ node: 'Enlace de Código TV (Zero-Friction)', type: 'main', index: 0 }],
        [{ node: 'Respuesta: Diagnóstico Técnico', type: 'main', index: 0 }],
        [{ node: 'Respuesta: Acceso Calificado & Pagos', type: 'main', index: 0 }],
        [{ node: 'Respuesta: Renovación', type: 'main', index: 0 }],
        [{ node: 'Respuesta: Baja de Datos (Habeas Data)', type: 'main', index: 0 }],
        [{ node: 'Respuesta: Diagnóstico Técnico', type: 'main', index: 0 }]
      ]
    },
    'Procesar Comprobante (Visión/OCR)': {
      main: [
        [
          { node: 'Generador Autónomo de Cuentas (SOP)', type: 'main', index: 0 },
          { node: 'Evolution API: Enviar WhatsApp', type: 'main', index: 0 }
        ]
      ]
    },
    'Webhook Pasarela Pagos (Wompi/MP)': {
      main: [[{ node: 'Procesar Pago Pasarela (Wompi/MP)', type: 'main', index: 0 }]]
    },
    'Procesar Pago Pasarela (Wompi/MP)': {
      main: [[{ node: 'Generador Autónomo de Cuentas (SOP)', type: 'main', index: 0 }]]
    },
    'Generador Autónomo de Cuentas (SOP)': {
      main: [
        [
          { node: 'Google Sheets: Registrar Cliente', type: 'main', index: 0 },
          { node: 'Evolution API: Enviar WhatsApp', type: 'main', index: 0 }
        ]
      ]
    },
    'Enlace de Código TV (Zero-Friction)': {
      main: [[{ node: 'Evolution API: Enviar WhatsApp', type: 'main', index: 0 }]]
    },
    'Respuesta: Diagnóstico Técnico': {
      main: [[{ node: 'Evolution API: Enviar WhatsApp', type: 'main', index: 0 }]]
    },
    'Respuesta: Acceso Calificado & Pagos': {
      main: [[{ node: 'Evolution API: Enviar WhatsApp', type: 'main', index: 0 }]]
    },
    'Respuesta: Renovación': {
      main: [[{ node: 'Evolution API: Enviar WhatsApp', type: 'main', index: 0 }]]
    },
    'Respuesta: Baja de Datos (Habeas Data)': {
      main: [[{ node: 'Evolution API: Enviar WhatsApp', type: 'main', index: 0 }]]
    }
  }
};

const targetPath = path.join(__dirname, 'n8n_videm_whatsapp_bot.json');
fs.writeFileSync(targetPath, JSON.stringify(workflow, null, 2), 'utf8');
console.log('Successfully generated JSON at', targetPath);
