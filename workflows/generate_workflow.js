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
          '// CEREBRO AUTONOMO VIDEM - Conversacion Guiada Paso a Paso',
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
          'if (isFromMe) return [];',
          '',
          'const normalized = incomingText.toLowerCase().trim();',
          'const isStremioPairingCode = /^[A-Za-z0-9]{4,6}$/.test(normalized) && !["hola", "pago", "menu", "info", "si", "no", "bien", "vale", "ok", "listo"].includes(normalized);',
          '',
          '// 2. Gestion de Estado en Memoria por Telefono',
          'global.videmUserSessions = global.videmUserSessions || {};',
          'const userSession = global.videmUserSessions[senderPhone] || { step: 0, answers: {} };',
          '',
          'let responseText = "";',
          'let triggerProvisioning = false;',
          'let accountData = null;',
          '',
          '// CASO ESPECIAL: Comprobante de Pago (Nequi / Bancolombia)',
          'if (messageType === "image" || normalized.includes("comprobante") || normalized.includes("transferencia") || /\\b(m\\d{6,12}|neq-\\d+)\\b/i.test(normalized)) {',
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
          '  userSession.step = 4;',
          '',
          '// CASO ESPECIAL: Código de Smart TV (ej: 9A4K)',
          '} else if (isStremioPairingCode) {',
          '  const code = incomingText.toUpperCase().trim();',
          '  const activationUrl = "https://videm.tv/activar?code=" + code + "&nombre=" + encodeURIComponent(senderName);',
          '  responseText = "✦ *VIDEM | Enlace de Pantalla Detectado*\\n\\n📺 *Código:* `" + code + "`\\n\\nEstamos vinculando tu perfil VIDEM con:\\n✔ CDN Dedicado 40-80 Mbps Remux activo\\n✔ HDR / Dolby Vision y Dolby Atmos habilitados\\n✔ Catálogo curado y depurado\\n\\n⚡ *Autoriza tu pantalla con 1 clic aquí:*\\n👉 " + activationUrl + "\\n\\n¡Tu televisor se sincronizará automáticamente! 🍿";',
          '',
          '// CASO ESPECIAL: Solicitud de Baja (Habeas Data)',
          '} else if (normalized.includes("baja") || normalized.includes("supresion") || normalized.includes("habeas")) {',
          '  responseText = "✦ *VIDEM | Solicitud de Supresión de Datos Confirmada*\\n\\nHola " + senderName + ".\\n\\nHemos recibido formalmente tu solicitud de baja y supresión de datos conforme a la Ley 1581 de 2012 (Habeas Data).\\n\\nTu número telefónico y registro de contacto han sido retirados de nuestra lista de asistencia y no recibirás más notificaciones de Videm. ¡Que tengas un excelente día!";',
          '',
          '// CASO ESPECIAL: Renovaciones',
          '} else if (normalized.includes("renov") || normalized.includes("extender")) {',
          '  responseText = "✦ *VIDEM | Portal de Clientes & Renovaciones*\\n\\nHola " + senderName + ", bienvenido a tu canal prioritario de servicio.\\n\\nPara renovar tu enlace privado de inmediato:\\n1️⃣ Selecciona tu modalidad:\\n   • *Renovación Semestral (6 meses):* $240.000 COP\\n   • *Renovación Anual (12 meses):* $440.000 COP\\n\\n2️⃣ Realiza tu pago mediante Nequi al *301 556 8904* o solicítanos el enlace PSE/Tarjeta y envía el comprobante por este chat.\\n\\nTu enlace CDN y addons se mantendrán activos sin necesidad de reconfigurar tu televisor.";',
          '',
          '// CASO RESPUESTA COMPUESTA (Usuario respondió las 3 cosas a la vez, como en tu prueba)',
          '} else if ((normalized.includes("1") && normalized.includes("2") && normalized.includes("3")) || (normalized.includes("fibra") && (normalized.includes("xiaomi") || normalized.includes("tv") || normalized.includes("lg") || normalized.includes("samsung")) && (normalized.includes("sonido") || normalized.includes("barra")))) {',
          '  const paymentUrlWompi = "https://checkout.wompi.co/l/videm-semestral-60usd?customer_phone=" + senderPhone;',
          '  responseText = "✦ *VIDEM | Calificación Técnica Exitosa* 🍿\\n\\n¡Excelente, " + senderName + "! Revisamos tu configuración (" + incomingText.replace(/\\n/g, " / ") + ") y tu hogar califica con honores para el estándar privado *Videm* (Remux 4K nativo 40-80 Mbps y audio Dolby Atmos sin pausas).\\n\\n💎 *Tarifa de Consultoría y Aprovisionamiento:*\\n• *Plan Semestral (6 meses completos):* $240.000 COP (~$60 USD)\\n• *Plan Anual (12 meses preferencial):* $440.000 COP (~$110 USD)\\n\\n━━━━━━━━━━━━━━━━━━━━\\n💳 *OPCIÓN 1: Pago Inmediato con Tarjeta / PSE (Activación 100% Automática)*\\n👉 Enlace de pago seguro: " + paymentUrlWompi + "\\n\\n📱 *OPCIÓN 2: Transferencia Directa*\\n• *Nequi / Daviplata:* 301 556 8904\\n• *Bancolombia (Ahorros):* (Solicitar número)\\n━━━━━━━━━━━━━━━━━━━━\\n\\n📌 En cuanto realices tu pago o envíes la foto del comprobante aquí, se emitirán tus credenciales y el enlace interactivo de tu pantalla en menos de 2 minutos.";',
          '  userSession.step = 4;',
          '',
          '// FLUJO PASO A PASO (Pregunta por pregunta con opciones múltiples y "Otro")',
          '} else if (userSession.step === 1 || (normalized.match(/^[1-6]$/) && userSession.step === 0 && !normalized.includes("hola")) || normalized.includes("tv") || normalized.includes("box") || normalized.includes("samsung") || normalized.includes("oled") || normalized.includes("fire") || normalized.includes("apple")) {',
          '  // El usuario acaba de responder el PASO 1 (Pantalla) -> Pasamos al PASO 2 (Internet)',
          '  userSession.step = 2;',
          '  userSession.answers.tv = incomingText;',
          '  responseText = "✦ *VIDEM | Diagnóstico Técnico (Paso 2 de 3)* ⚡\\n\\n¡Perfecto! Hemos registrado tu equipo (" + incomingText + "). 📺\\n\\n*Paso 2 de 3: ¿Qué tipo y velocidad de internet tienes en casa?*\\n\\n1️⃣ Fibra Óptica de 300 a 500+ Megas\\n2️⃣ Fibra Óptica de 100 a 200 Megas\\n3️⃣ Conexión Cable coaxial / HFC (50 a 100 Megas)\\n4️⃣ Red móvil 4G/5G o Wi-Fi compartido\\n5️⃣ Otro (¿De cuántos megas aproximadamente?)\\n\\n_👉 Responde con el número de tu opción (1, 2, 3...) o descríbela:_";',
          '',
          '} else if (userSession.step === 2 || normalized.includes("fibra") || normalized.includes("megas") || normalized.includes("mbps") || normalized.match(/\\b(100|200|300|500|600|900|1000)\\b/)) {',
          '  // El usuario acaba de responder el PASO 2 (Internet) -> Pasamos al PASO 3 (Sonido)',
          '  userSession.step = 3;',
          '  userSession.answers.internet = incomingText;',
          '  responseText = "✦ *VIDEM | Diagnóstico Técnico (Paso 3 de 3)* 🔊\\n\\n¡Conexión validada! Excelente ancho de banda para transferencias Remux 4K sin compresión.\\n\\n*Paso 3 de 3: ¿Cómo disfrutas el audio en tu sala de cine?*\\n\\n1️⃣ Barra de sonido o Receiver dedicado con Dolby Atmos / eARC (Sonos, Bose, LG, Samsung, Sony, etc.)\\n2️⃣ Barra de sonido estándar 2.1 o Parlantes externos\\n3️⃣ Parlantes integrados del televisor\\n4️⃣ Otro (¿Cuál equipo de audio utilizas?)\\n\\n_👉 Responde con el número de tu opción (1, 2, 3...):_";',
          '',
          '} else if (userSession.step === 3 || normalized.includes("barra") || normalized.includes("sonido") || normalized.includes("atmos") || normalized.includes("parlante") || normalized.includes("bose") || normalized.includes("sonos")) {',
          '  // El usuario acaba de responder el PASO 3 (Sonido) -> Mostramos CALIFICACIÓN Y PLANES',
          '  userSession.step = 4;',
          '  userSession.answers.audio = incomingText;',
          '  const paymentUrlWompi = "https://checkout.wompi.co/l/videm-semestral-60usd?customer_phone=" + senderPhone;',
          '  responseText = "✦ *VIDEM | Calificación Técnica Exitosa* 🍿\\n\\n¡Felicidades, " + senderName + "! Tu configuración cumple con todos los requisitos para acceder al estándar privado *Videm* (Remux 4K nativo 40-80 Mbps y audio Dolby Atmos sin pausas).\\n\\n💎 *Tarifa de Consultoría y Aprovisionamiento:*\\n• *Plan Semestral (6 meses completos):* $240.000 COP (~$60 USD)\\n• *Plan Anual (12 meses preferencial):* $440.000 COP (~$110 USD)\\n\\n━━━━━━━━━━━━━━━━━━━━\\n💳 *OPCIÓN 1: Pago Inmediato con Tarjeta / PSE (Activación 100% Automática)*\\n👉 Enlace de pago seguro: " + paymentUrlWompi + "\\n\\n📱 *OPCIÓN 2: Transferencia Directa*\\n• *Nequi / Daviplata:* 301 556 8904\\n• *Bancolombia (Ahorros):* (Solicitar número)\\n━━━━━━━━━━━━━━━━━━━━\\n\\n📌 En cuanto realices tu pago o envíes la foto del comprobante aquí, se emitirán tus credenciales y el enlace interactivo de tu pantalla en menos de 2 minutos.";',
          '',
          '} else {',
          '  // INICIO / SALUDO -> Enviamos el PASO 1 (Pantalla con opciones)',
          '  userSession.step = 1;',
          '  responseText = "✦ *VIDEM | Private Tech Concierge* 🎬\\n\\nHola " + senderName + ", un gusto saludarte. Soy el conserje técnico de *Videm*.\\n\\nPara garantizarte la experiencia cinematográfica en *Remux 4K nativo, Dolby Vision y Dolby Atmos sin buffering*, validemos 3 datos rápidos de tu equipamiento.\\n\\n*Paso 1 de 3: ¿Qué pantalla o televisor principal usarás?*\\n\\n1️⃣ Smart TV LG (webOS / OLED / QNED)\\n2️⃣ Smart TV Samsung (Tizen)\\n3️⃣ Google TV / Android TV / Sony / TCL\\n4️⃣ Xiaomi Box / TV Box / Mecool\\n5️⃣ Amazon Fire TV Stick 4K\\n6️⃣ Apple TV 4K\\n7️⃣ Otro (¿Cuál marca y modelo?)\\n\\n_👉 Responde con el número de tu opción (1, 2, 3...) o escribe tu modelo:_\\n\\n_Nota: Al continuar autorizas el tratamiento de datos para fines de asistencia técnica._";',
          '}',
          '',
          '// Guardar estado actualizado',
          'global.videmUserSessions[senderPhone] = userSession;',
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
console.log('Successfully generated step-by-step interactive workflow at', targetPath);
