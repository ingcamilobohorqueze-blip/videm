const fs = require('fs');
const path = require('path');

const SHEET_ID = '1z3k3znhxGgc3xvXLZ8ymEqCWnwf5De9qazw2I_dMaoM';

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
      position: [100, 400]
    },
    {
      parameters: {
        method: 'POST',
        url: 'https://evolution-api-production-8353.up.railway.app/chat/findMessages/VidemProd',
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: 'apikey', value: 'levanna-wa-key-2024' },
            { name: 'Content-Type', value: 'application/json' }
          ]
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: '={\n  \"where\": {\n    \"key\": {\n      \"remoteJid\": \"{{ $json.body?.data?.key?.remoteJid || ($json.body?.entry ? $json.body.entry[0].changes[0].value.messages[0].from + \"@s.whatsapp.net\" : \"573103311543@s.whatsapp.net\") }}\"\n    }\n  },\n  \"limit\": 5\n}',
        options: {}
      },
      id: 'node-fetch-history',
      name: 'Buscar Historial en Railway',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.1,
      position: [320, 400]
    },
    {
      parameters: {
        jsCode: [
          '// CEREBRO AUTONOMO VIDEM - Evaluacion con Memoria Real de Chat',
          'const webhookItem = $(\"Webhook Evolution API (Inbound)\").first().json;',
          'const body = webhookItem.body || webhookItem;',
          'const historyData = $input.item.json;',
          '',
          'let senderPhone = \"\";',
          'let incomingText = \"\";',
          'let senderName = \"Cliente\";',
          'let messageType = \"text\";',
          'let isFromMe = false;',
          '',
          'if (body.data) {',
          '  const data = body.data;',
          '  isFromMe = data.key?.fromMe || false;',
          '  senderPhone = (data.key?.remoteJid || \"\").replace(\"@s.whatsapp.net\", \"\");',
          '  senderName = data.pushName || \"Cliente\";',
          '  const msg = data.message || {};',
          '  if (msg.conversation) {',
          '    incomingText = msg.conversation;',
          '  } else if (msg.extendedTextMessage?.text) {',
          '    incomingText = msg.extendedTextMessage.text;',
          '  } else if (msg.imageMessage) {',
          '    messageType = \"image\";',
          '    incomingText = msg.imageMessage.caption || \"[Comprobante Transferencia]\";',
          '  }',
          '} else if (body.entry && body.entry[0]?.changes?.[0]?.value?.messages?.[0]) {',
          '  const msg = body.entry[0].changes[0].value.messages[0];',
          '  senderPhone = msg.from;',
          '  senderName = body.entry[0].changes[0].value.contacts?.[0]?.profile?.name || \"Cliente\";',
          '  if (msg.type === \"text\") incomingText = msg.text.body;',
          '  if (msg.type === \"image\") { messageType = \"image\"; incomingText = msg.image?.caption || \"[Comprobante]\"; }',
          '} else {',
          '  senderPhone = String(body.from || body.phone || \"573103311543\");',
          '  incomingText = body.text || body.message || \"\";',
          '  senderName = body.name || \"Cliente\";',
          '  messageType = body.type || \"text\";',
          '}',
          '',
          'if (isFromMe) return [];',
          '',
          'const normalized = incomingText.toLowerCase().trim();',
          'const isStremioPairingCode = /^[A-Za-z0-9]{4,6}$/.test(normalized) && ![\"hola\", \"pago\", \"menu\", \"info\", \"si\", \"no\", \"bien\", \"vale\", \"ok\", \"listo\", \"1\", \"2\", \"3\", \"4\", \"5\", \"6\", \"7\"].includes(normalized);',
          '',
          '// Historial de Railway para saber exactamente qué preguntó el bot',
          'const records = historyData.messages?.records || (Array.isArray(historyData) ? historyData : []);',
          'let lastBotMessage = \"\";',
          'for (const r of records) {',
          '  if (r.key?.fromMe) {',
          '    lastBotMessage = r.message?.conversation || r.message?.extendedTextMessage?.text || \"\";',
          '    break;',
          '  }',
          '}',
          '',
          'let responseText = \"\";',
          'let triggerProvisioning = false;',
          'let isQualifiedLead = false;',
          'let accountData = null;',
          '',
          '// 1. CASO ESPECIAL: Comprobante de Pago',
          'if (messageType === \"image\" || normalized.includes(\"comprobante\") || normalized.includes(\"transferencia\") || /\\b(m\\d{6,12}|neq-\\d+)\\b/i.test(normalized)) {',
          '  const refMatch = incomingText.match(/M?\\d{6,12}/i) || incomingText.match(/ref[:\\s]*([a-zA-Z0-9]+)/i);',
          '  const detectedRef = refMatch ? (refMatch[1] || refMatch[0]) : (\"NEQ-\" + Math.floor(100000 + Math.random() * 900000));',
          '  const randomSuffix = Math.floor(1000 + Math.random() * 9000);',
          '  const clientEmail = \"videm.vip.\" + randomSuffix + \"@videm.private\";',
          '  const clientPass = \"Videm4K.\" + randomSuffix + \"!\";',
          '  const now = new Date();',
          '  const expDate = new Date(now.getTime() + (180 * 24 * 60 * 60 * 1000)).toLocaleDateString(\"es-CO\", { year: \"numeric\", month: \"long\", day: \"numeric\" });',
          '  const activationUrl = \"https://videm.tv/activar?nombre=\" + encodeURIComponent(senderName) + \"&plan=Semestral%20VIP\";',
          '',
          '  responseText = \"✦ *¡FELICIDADES, \" + senderName.toUpperCase() + \"! PAGO VERIFICADO* 🎬\\n\\nHemos validado tu transferencia con éxito (Ref: *\" + detectedRef + \"*).\\nTu membresía *Semestral VIP* está activa hasta el *\" + expDate + \"*.\\n\\n━━━━━━━━━━━━━━━━━━━━\\n💎 *CREDENCIALES MAESTRAS PRIVADAS:*\\n📧 *Usuario:* `\" + clientEmail + \"`\\n🔑 *Clave:* `\" + clientPass + \"`\\n━━━━━━━━━━━━━━━━━━━━\\n\\n📺 *VINCULA TU SMART TV EN 60 SEGUNDOS:*\\nToca este enlace directo desde tu móvil para activar tu pantalla:\\n👉 \" + activationUrl + \"\\n\\n¡Solo ingresas el código de tu televisor y listo!\";',
          '  triggerProvisioning = true;',
          '  accountData = { phone: senderPhone, name: senderName, plan: \"Semestral VIP\", ref: detectedRef, clientEmail, expDate };',
          '',
          '// 2. CASO ESPECIAL: Código de TV Stremio',
          '} else if (isStremioPairingCode) {',
          '  const code = incomingText.toUpperCase().trim();',
          '  const activationUrl = \"https://videm.tv/activar?code=\" + code + \"&nombre=\" + encodeURIComponent(senderName);',
          '  responseText = \"✦ *VIDEM | Enlace de Pantalla Detectado*\\n\\n📺 *Código:* `\" + code + \"`\\n\\nEstamos vinculando tu perfil VIDEM con:\\n✔ CDN Dedicado 40-80 Mbps Remux activo\\n✔ HDR / Dolby Vision y Dolby Atmos habilitados\\n✔ Catálogo curado y depurado\\n\\n⚡ *Autoriza tu pantalla con 1 clic aquí:*\\n👉 \" + activationUrl + \"\\n\\n¡Tu televisor se sincronizará automáticamente! 🍿\";',
          '',
          '// 3. CASO ESPECIAL: Respuesta Compuesta (todas las respuestas a la vez)',
          '} else if ((normalized.includes(\"1\") && normalized.includes(\"2\") && normalized.includes(\"3\")) || (normalized.includes(\"fibra\") && (normalized.includes(\"xiaomi\") || normalized.includes(\"tv\") || normalized.includes(\"lg\") || normalized.includes(\"samsung\")) && (normalized.includes(\"sonido\") || normalized.includes(\"barra\")))) {',
          '  const paymentUrlWompi = \"https://checkout.wompi.co/l/videm-semestral-60usd?customer_phone=\" + senderPhone;',
          '  responseText = \"✦ *VIDEM | Calificación Técnica Exitosa* 🍿\\n\\n¡Excelente, \" + senderName + \"! Revisamos tu configuración (\" + incomingText.replace(/\\n/g, \" / \") + \") y tu hogar califica con honores para el estándar privado *Videm* (Remux 4K nativo 40-80 Mbps y audio Dolby Atmos sin pausas).\\n\\n💎 *Tarifa de Consultoría y Aprovisionamiento:*\\n• *Plan Semestral (6 meses completos):* $240.000 COP (~$60 USD)\\n• *Plan Anual (12 meses preferencial):* $440.000 COP (~$110 USD)\\n\\n━━━━━━━━━━━━━━━━━━━━\\n💳 *OPCIÓN 1: Pago Inmediato con Tarjeta / PSE (Activación 100% Automática)*\\n👉 Enlace de pago seguro: \" + paymentUrlWompi + \"\\n\\n📱 *OPCIÓN 2: Transferencia Directa*\\n• *Nequi / Daviplata:* 301 556 8904\\n• *Bancolombia (Ahorros):* (Solicitar número)\\n━━━━━━━━━━━━━━━━━━━━\\n\\n📌 En cuanto realices tu pago o envíes la foto del comprobante aquí, se emitirán tus credenciales y el enlace interactivo de tu pantalla en menos de 2 minutos.\";',
          '  isQualifiedLead = true;',
          '',
          '// 4. FLUJO CONVERSACIONAL BASADO EN EL ULTIMO MENSAJE DEL BOT',
          '} else if (lastBotMessage.includes(\"Paso 2 de 3\") && !normalized.includes(\"hola\") && !normalized.includes(\"menu\")) {',
          '  responseText = \"✦ *VIDEM | Diagnóstico Técnico (Paso 3 de 3)* 🔊\\n\\n¡Conexión validada! Excelente ancho de banda para transferencias Remux 4K sin compresión.\\n\\n*Paso 3 de 3: ¿Cómo disfrutas el audio en tu sala de cine?*\\n\\n1️⃣ Barra de sonido o Receiver dedicado con Dolby Atmos / eARC (Sonos, Bose, LG, Samsung, Sony, etc.)\\n2️⃣ Barra de sonido estándar 2.1 o Parlantes externos\\n3️⃣ Parlantes integrados del televisor\\n4️⃣ Otro (¿Cuál equipo de audio utilizas?)\\n\\n_👉 Responde con el número de tu opción (1, 2, 3...):_\";',
          '',
          '} else if (lastBotMessage.includes(\"Paso 3 de 3\") && !normalized.includes(\"hola\") && !normalized.includes(\"menu\")) {',
          '  const paymentUrlWompi = \"https://checkout.wompi.co/l/videm-semestral-60usd?customer_phone=\" + senderPhone;',
          '  responseText = \"✦ *VIDEM | Calificación Técnica Exitosa* 🍿\\n\\n¡Felicidades, \" + senderName + \"! Tu configuración cumple con todos los requisitos para acceder al estándar privado *Videm* (Remux 4K nativo 40-80 Mbps y audio Dolby Atmos sin pausas).\\n\\n💎 *Tarifa de Consultoría y Aprovisionamiento:*\\n• *Plan Semestral (6 meses completos):* $240.000 COP (~$60 USD)\\n• *Plan Anual (12 meses preferencial):* $440.000 COP (~$110 USD)\\n\\n━━━━━━━━━━━━━━━━━━━━\\n💳 *OPCIÓN 1: Pago Inmediato con Tarjeta / PSE (Activación 100% Automática)*\\n👉 Enlace de pago seguro: \" + paymentUrlWompi + \"\\n\\n📱 *OPCIÓN 2: Transferencia Directa*\\n• *Nequi / Daviplata:* 301 556 8904\\n• *Bancolombia (Ahorros):* (Solicitar número)\\n━━━━━━━━━━━━━━━━━━━━\\n\\n📌 En cuanto realices tu pago o envíes la foto del comprobante aquí, se emitirán tus credenciales y el enlace interactivo de tu pantalla en menos de 2 minutos.\";',
          '  isQualifiedLead = true;',
          '',
          '} else if (lastBotMessage.includes(\"Paso 1 de 3\") && !normalized.includes(\"hola\") && !normalized.includes(\"menu\")) {',
          '  responseText = \"✦ *VIDEM | Diagnóstico Técnico (Paso 2 de 3)* ⚡\\n\\n¡Perfecto! Hemos registrado tu equipo (\" + incomingText + \"). 📺\\n\\n*Paso 2 de 3: ¿Qué tipo y velocidad de internet tienes en casa?*\\n\\n1️⃣ Fibra Óptica de 300 a 500+ Megas\\n2️⃣ Fibra Óptica de 100 a 200 Megas\\n3️⃣ Conexión Cable coaxial / HFC (50 a 100 Megas)\\n4️⃣ Red móvil 4G/5G o Wi-Fi compartido\\n5️⃣ Otro (¿De cuántos megas aproximadamente?)\\n\\n_👉 Responde con el número de tu opción (1, 2, 3...) o descríbela:_\";',
          '',
          '} else {',
          '  responseText = \"✦ *VIDEM | Private Tech Concierge* 🎬\\n\\nHola \" + senderName + \", un gusto saludarte. Soy el conserje técnico de *Videm*.\\n\\nPara garantizarte la experiencia cinematográfica en *Remux 4K nativo, Dolby Vision y Dolby Atmos sin buffering*, validemos 3 datos rápidos de tu equipamiento.\\n\\n*Paso 1 de 3: ¿Qué pantalla o televisor principal usarás?*\\n\\n1️⃣ Smart TV LG (webOS / OLED / QNED)\\n2️⃣ Smart TV Samsung (Tizen)\\n3️⃣ Google TV / Android TV / Sony / TCL\\n4️⃣ Xiaomi Box / TV Box / Mecool\\n5️⃣ Amazon Fire TV Stick 4K\\n6️⃣ Apple TV 4K\\n7️⃣ Otro (¿Cuál marca y modelo?)\\n\\n_👉 Responde con el número de tu opción (1, 2, 3...) o escribe tu modelo:_\\n\\n_Nota: Al continuar autorizas el tratamiento de datos para fines de asistencia técnica._\";',
          '}',
          '',
          'return {',
          '  phone: senderPhone,',
          '  senderPhone,',
          '  senderName,',
          '  responseText,',
          '  triggerProvisioning,',
          '  isQualifiedLead,',
          '  accountData',
          '};'
        ].join('\n')
      },
      id: 'node-cerebro',
      name: 'Cerebro Autónomo VIDEM',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [540, 400]
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
      position: [780, 400]
    },
    {
      parameters: {
        jsCode: [
          '// FILTRO Y FORMATEO DE REGISTROS PARA GOOGLE SHEETS CRM',
          '// Solo se ejecuta si el cliente completó la calificación o pagó.',
          '// NO llena filas por mensajes intermedios de chat (Hola, 1, 2, etc.)',
          'const item = $input.item.json;',
          '',
          'if (!item.triggerProvisioning && !item.isQualifiedLead) {',
          '  return []; // Detiene la ejecución hacia Google Sheets',
          '}',
          '',
          'const now = new Date();',
          'const fechaCol = now.toLocaleString(\"es-CO\", { timeZone: \"America/Bogota\", year: \"numeric\", month: \"2-digit\", day: \"2-digit\", hour: \"2-digit\", minute: \"2-digit\" });',
          '',
          'return {',
          '  Fecha: fechaCol,',
          '  Telefono: item.phone || item.senderPhone,',
          '  Nombre: item.senderName || \"Cliente\",',
          '  Plan: item.accountData?.plan || \"Semestral VIP ($60 USD)\",',
          '  Estado: item.triggerProvisioning ? \"Activo (Pagado)\" : \"Calificado (Pendiente Pago)\",',
          '  Usuario_Stremio: item.accountData?.clientEmail || \"-\",',
          '  Referencia: item.accountData?.ref || \"-\",',
          '  Vigencia: item.accountData?.expDate || \"-\"',
          '};'
        ].join('\n')
      },
      id: 'node-format-crm',
      name: 'Filtrar Solo Clientes / Ventas',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [780, 600]
    },
    {
      parameters: {
        operation: 'append',
        documentId: {
          __rl: true,
          value: SHEET_ID,
          mode: 'id'
        },
        sheetName: {
          __rl: true,
          value: 'Hoja 1',
          mode: 'name'
        },
        options: {}
      },
      id: 'node-sheets-clientes',
      name: 'Google Sheets: Registrar Cliente',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4.5,
      position: [1020, 600]
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
      position: [100, 780]
    },
    {
      parameters: {
        jsCode: [
          'const payload = $input.item.json.body || $input.item.json;',
          'let transactionRef = \"\";',
          'let amount = 0;',
          'let status = \"\";',
          'let customerPhone = \"\";',
          '',
          'if (payload.data && payload.data.transaction) {',
          '  const tx = payload.data.transaction;',
          '  transactionRef = tx.id || tx.reference;',
          '  amount = (tx.amount_in_cents || 0) / 100;',
          '  status = tx.status;',
          '  customerPhone = tx.customer_data?.phone_number || tx.customer_email || \"\";',
          '} else {',
          '  transactionRef = payload.reference || (\"TX-\" + Date.now());',
          '  status = payload.status || \"APPROVED\";',
          '  amount = payload.amount || 240000;',
          '  customerPhone = payload.phone || \"573103311543\";',
          '}',
          '',
          'if (status !== \"APPROVED\" && status !== \"Aprobado_Auto\") return [];',
          '',
          'const phone = customerPhone.replace(/[^0-9]/g, \"\");',
          'const randomSuffix = Math.floor(1000 + Math.random() * 9000);',
          'const clientEmail = \"videm.vip.\" + randomSuffix + \"@videm.private\";',
          'const clientPass = \"Videm4K.\" + randomSuffix + \"!\";',
          'const now = new Date();',
          'const expDate = new Date(now.getTime() + (180 * 24 * 60 * 60 * 1000)).toLocaleDateString(\"es-CO\", { year: \"numeric\", month: \"long\", day: \"numeric\" });',
          'const activationUrl = \"https://videm.tv/activar?nombre=Cliente%20VIP&plan=Semestral%20VIP\";',
          '',
          'const responseText = \"✦ *¡FELICIDADES! TU ACCESO VIDEM ESTÁ ACTIVO* 🎬\\n\\nTu pago por pasarela ha sido validado con éxito (Ref: *\" + transactionRef + \"*).\\nTu suscripción *Semestral VIP* está activa hasta el *\" + expDate + \"*.\\n\\n━━━━━━━━━━━━━━━━━━━━\\n💎 *CREDENCIALES PRIVADAS:*\\n📧 *Correo:* `\" + clientEmail + \"`\\n🔑 *Clave:* `\" + clientPass + \"`\\n━━━━━━━━━━━━━━━━━━━━\\n\\n📺 *ACTIVAR SMART TV EN 60 SEGUNDOS:*\\n👉 \" + activationUrl + \"\\n\\n¡Ingresa el código que ves en tu televisor y listo!\";',
          '',
          'return {',
          '  phone,',
          '  senderPhone: phone,',
          '  senderName: \"Cliente VIP\",',
          '  responseText,',
          '  triggerProvisioning: true,',
          '  accountData: { plan: \"Semestral VIP\", clientEmail, ref: transactionRef, expDate }',
          '};'
        ].join('\n')
      },
      id: 'node-proc-gateway',
      name: 'Procesar Pago Pasarela (Wompi/MP)',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [320, 780]
    }
  ],
  connections: {
    'Webhook Evolution API (Inbound)': {
      main: [[{ node: 'Buscar Historial en Railway', type: 'main', index: 0 }]]
    },
    'Buscar Historial en Railway': {
      main: [[{ node: 'Cerebro Autónomo VIDEM', type: 'main', index: 0 }]]
    },
    'Cerebro Autónomo VIDEM': {
      main: [
        [
          { node: 'Evolution API: Enviar WhatsApp', type: 'main', index: 0 },
          { node: 'Filtrar Solo Clientes / Ventas', type: 'main', index: 0 }
        ]
      ]
    },
    'Filtrar Solo Clientes / Ventas': {
      main: [
        [
          { node: 'Google Sheets: Registrar Cliente', type: 'main', index: 0 }
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
          { node: 'Filtrar Solo Clientes / Ventas', type: 'main', index: 0 }
        ]
      ]
    }
  }
};

const targetPath = path.join(__dirname, 'n8n_videm_whatsapp_bot.json');
fs.writeFileSync(targetPath, JSON.stringify(workflow, null, 2), 'utf8');
console.log('Successfully generated workflow with Sheet ID and CRM filter at', targetPath);
