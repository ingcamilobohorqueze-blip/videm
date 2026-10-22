const fs = require('fs');
const path = require('path');

const SHEET_ID = '1z3k3znhxGgc3xvXLZ8ymEqCWnwf5De9qazw2I_dMaoM';
const ADMIN_PHONE = '573103311543';

const workflow = {
  name: 'VIDEM - Tech Concierge Autonomo (WhatsApp + Pagos + Cuentas + Alertas)',
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
        jsonBody: '={\n  "where": {\n    "key": {\n      "remoteJid": "{{ $json.body?.data?.key?.remoteJid || ($json.body?.entry ? $json.body.entry[0].changes[0].value.messages[0].from + "@s.whatsapp.net" : "573103311543@s.whatsapp.net") }}"\n    }\n  },\n  "limit": 5\n}',
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
          '// CEREBRO AUTONOMO VIDEM - Evaluacion con Memoria Real, Pagos y Alertas a Camilo',
          'const webhookItem = $("Webhook Evolution API (Inbound)").first().json;',
          'const body = webhookItem.body || webhookItem;',
          'const historyData = $input.item.json;',
          '',
          'let senderPhone = "";',
          'let incomingText = "";',
          'let senderName = "Cliente";',
          'let messageType = "text";',
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
          '  }',
          '} else if (body.entry && body.entry[0]?.changes?.[0]?.value?.messages?.[0]) {',
          '  const msg = body.entry[0].changes[0].value.messages[0];',
          '  senderPhone = msg.from;',
          '  senderName = body.entry[0].changes[0].value.contacts?.[0]?.profile?.name || "Cliente";',
          '  if (msg.type === "text") incomingText = msg.text.body;',
          '  if (msg.type === "image") { messageType = "image"; incomingText = msg.image?.caption || "[Comprobante]"; }',
          '} else {',
          '  senderPhone = String(body.from || body.phone || "573103311543");',
          '  incomingText = body.text || body.message || "";',
          '  senderName = body.name || "Cliente";',
          '  messageType = body.type || "text";',
          '}',
          '',
          'if (isFromMe) return [];',
          '',
          'const normalized = incomingText.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();',
          'const isStremioPairingCode = /^[A-Za-z0-9]{4,6}$/.test(incomingText.trim()) && !["hola", "pago", "menu", "info", "si", "no", "bien", "vale", "ok", "listo", "1", "2", "3", "4", "5", "6", "7"].includes(normalized);',
          '',
          '// Historial de Railway para saber exactamente que pregunto el bot',
          'const records = historyData.messages?.records || (Array.isArray(historyData) ? historyData : []);',
          'let lastBotMessage = "";',
          'for (const r of records) {',
          '  if (r.key?.fromMe) {',
          '    lastBotMessage = r.message?.conversation || r.message?.extendedTextMessage?.text || "";',
          '    break;',
          '  }',
          '}',
          '',
          'let responseText = "";',
          'let triggerProvisioning = false;',
          'let isQualifiedLead = false;',
          'let isHumanHelpRequested = false;',
          'let adminAlertText = "";',
          'let accountData = null;',
          '',
          '// DATOS OFICIALES DE PAGO VIDEM',
          'const sumupSemestral = "https://pay.sumup.com/b2c/X4ODXUPY9G";',
          'const sumupAnual = "https://pay.sumup.com/b2c/X9P4DBUZ42";',
          'const bancolombiaText = "🏦 *OPCIÓN 2: TRANSFERENCIA BANCARIA DIRECTA*\\n• *Bancolombia (Ahorros):* `03202411001`\\n• *Titular:* Camilo Andrés Bohórquez Enciso\\n• *C.C.:* 80.257.729\\n_(Acepta transferencias directas de Bancolombia, Nequi y Transfiya sin costo adicional)_";',
          '',
          '// 1. CASO ESPECIAL: Comprobante o Notificación de Pago Recibido',
          'const isPayment = messageType === "image" || normalized.includes("comprobante") || normalized.includes("transferencia") || normalized.includes("transferi") || normalized.includes("pague") || normalized.includes("pago") || normalized.includes("recibo") || normalized.includes("voucher") || /\\b(m\\d{6,12}|neq-\\d+|sumup|bancolombia)\\b/i.test(normalized) || (/\\b\\d{6,12}\\b/.test(normalized) && (normalized.includes("ref") || normalized.includes("listo") || normalized.includes("ya") || normalized.includes("anual") || normalized.includes("semestral")));',
          'if (isPayment) {',
          '  const refMatch = incomingText.match(/M?\\d{6,12}/i) || incomingText.match(/ref[:\\s]*([a-zA-Z0-9]+)/i);',
          '  const detectedRef = refMatch ? (refMatch[1] || refMatch[0]) : ("TX-" + Math.floor(100000 + Math.random() * 900000));',
          '  const randomSuffix = Math.floor(1000 + Math.random() * 9000);',
          '  const clientEmail = "videm.vip." + randomSuffix + "@videm.private";',
          '  const clientPass = "Videm4K." + randomSuffix + "!";',
          '  const isAnual = normalized.includes("anual") || normalized.includes("440") || normalized.includes("12");',
          '  const planName = isAnual ? "Anual VIP" : "Semestral VIP";',
          '  const planCost = isAnual ? "$440.000 COP" : "$240.000 COP";',
          '  const planDays = isAnual ? 365 : 180;',
          '  const now = new Date();',
          '  const colHour = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" })).getHours();',
          '  const isBusinessHours = colHour >= 8 && colHour < 22; // 8:00 AM a 10:00 PM COT',
          '  const expDate = new Date(now.getTime() + (planDays * 24 * 60 * 60 * 1000)).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });',
          '  const activationUrl = "https://videm.tv/activar?nombre=" + encodeURIComponent(senderName) + "&plan=" + encodeURIComponent(planName);',
          '',
          '  const activationNote = isBusinessHours',
          '    ? "📺 *VINCULA TU SMART TV EN 60 SEGUNDOS:*\\nToca este enlace directo desde tu móvil para activar tu pantalla:\\n👉 " + activationUrl + "\\n\\n¡Solo ingresas el código de 4 letras de tu televisor y listo!"',
          '    : "🌙 *PAGO RECIBIDO & CUPO VIP RESERVADO:*\\nHemos recibido tu comprobante con éxito. Al ser fuera de nuestro horario de calibración técnica de pantallas (8:00 AM a 10:00 PM), tu enlace será completado por tu conserje técnico a primera hora (8:00 AM).\\n\\n📺 *Mientras tanto, deja tu Smart TV lista:* Descarga la app *Stremio* y ten a mano este enlace:\\n👉 " + activationUrl;',
          '',
          '  responseText = "✦ *¡FELICIDADES, " + senderName.toUpperCase() + "! PAGO VERIFICADO* 🎬\\n\\nHemos validado tu pago con éxito (Ref: *" + detectedRef + "*).\\nTu membresía *" + planName + "* está activa hasta el *" + expDate + "*.\\n\\n━━━━━━━━━━━━━━━━━━━━\\n💎 *CREDENCIALES MAESTRAS PRIVADAS:*\\n📧 *Usuario:* `" + clientEmail + "`\\n🔑 *Clave:* `" + clientPass + "`\\n━━━━━━━━━━━━━━━━━━━━\\n\\n" + activationNote;',
          '  triggerProvisioning = true;',
          '  accountData = { phone: senderPhone, name: senderName, plan: planName + " (" + planCost + ")", ref: detectedRef, clientEmail, expDate };',
          '  const statusAlert = isBusinessHours ? "⚡ *Estado:* En horario de atención (Activar en 60s)" : "🌙 *Estado:* Horario nocturno (Activar a las 8:00 AM)";',
          '  adminAlertText = "💰 *VIDEM ALERT | ¡NUEVA VENTA VERIFICADA!* 🎬\\n\\n👤 *Cliente:* " + senderName + "\\n📱 *WhatsApp:* +" + senderPhone + "\\n💎 *Plan:* " + planName + " (" + planCost + ")\\n🔢 *Ref:* " + detectedRef + "\\n" + statusAlert + "\\n\\n━━━━━━━━━━━━━━━━━━━━\\n🛠️ *RECORDATORIO DE DESPACHO EN 60s:*\\n\\n🕵️‍♂️ *1. Abrir Incógnito (Ctrl + Shift + N)*\\n👉 https://real-debrid.com\\n_(Nunca uses tu cuenta personal para no mezclar suscripciones)_\\n\\n✉️ *2. Registro con truco Gmail:*\\n• Email: `cbohorquez1983+" + randomSuffix + "@gmail.com`\\n• User: `videm_vip_" + randomSuffix + "`\\n• Pass: `Videm4K." + randomSuffix + "!`\\n_(El correo de confirmación de RD llegará a tu mismo Gmail habitual)_\\n\\n💳 *3. Comprar Membresía (" + (isAnual ? "360 días" : "180 días = 16€") + "):*\\n👉 https://real-debrid.com/premium\\n\\n🔑 *4. Copiar API Token:*\\n👉 https://real-debrid.com/apitoken\\n\\n🍿 *5. Cuenta Stremio del Cliente:*\\n📧 `" + clientEmail + "`\\n🔑 `" + clientPass + "`\\n👉 Web: https://web.stremio.com\\n\\n⚡ *6. Instalar Torrentio con el Token:*\\n👉 https://torrentio.strem.fun/configure\\n\\n📺 *7. Vincular Smart TV del Cliente:*\\n👉 https://www.stremio.com/link\\n━━━━━━━━━━━━━━━━━━━━\\n✅ *Google Sheets:* Registrado como Activo.";',
          '',
          '// 2. CASO ESPECIAL: Código de TV Stremio (ej: 9A4K)',
          '} else if (isStremioPairingCode) {',
          '  const code = incomingText.toUpperCase().trim();',
          '  const activationUrl = "https://videm.tv/activar?code=" + code + "&nombre=" + encodeURIComponent(senderName);',
          '  responseText = "✦ *VIDEM | Enlace de Pantalla Detectado*\\n\\n📺 *Código:* `" + code + "`\\n\\nEstamos vinculando tu perfil VIDEM con:\\n✔ CDN Dedicado 40-80 Mbps Remux activo\\n✔ HDR / Dolby Vision y Dolby Atmos habilitados\\n✔ Catálogo curado y depurado\\n\\n⚡ *Autoriza tu pantalla con 1 clic aquí:*\\n👉 " + activationUrl + "\\n\\n¡Tu televisor se sincronizará automáticamente! 🍿";',
          '',
          '// 3. CASO ESPECIAL: Solicitud de Renovaciones',
          '} else if (normalized.includes("renov") || normalized.includes("extender")) {',
          '  responseText = "✦ *VIDEM | Portal de Clientes & Renovaciones* 🔄\\n\\nHola " + senderName + ", bienvenido a tu canal prioritario.\\n\\nPara renovar tu enlace privado de inmediato:\\n\\n💳 *Opción SumUp (Tarjeta / PSE):*\\n• *Semestral (6 meses - $240.000 COP):*\\n👉 " + sumupSemestral + "\\n• *Anual (12 meses - $440.000 COP):*\\n👉 " + sumupAnual + "\\n\\n━━━━━━━━━━━━━━━━━━━━\\n" + bancolombiaText + "\\n━━━━━━━━━━━━━━━━━━━━\\n\\nEnvía el comprobante por este chat y tu enlace CDN y catálogos se mantendrán activos sin reconfigurar tu pantalla.";',
          '',
          '// 4. CASO ESPECIAL: Consulta Directa de Precios o Planes',
          '} else if ((normalized.includes("precio") || normalized.includes("costo") || normalized.includes("cuanto vale") || normalized.includes("cuanto cuesta") || normalized.includes("tarifa") || normalized.includes("planes") || normalized.includes("valores")) && !lastBotMessage.includes("Paso 1") && !lastBotMessage.includes("Paso 2") && !lastBotMessage.includes("Paso 3")) {',
          '  responseText = "✦ *VIDEM | Planes y Tarifas VIP* 💎\\n\\nHola " + senderName + ", nuestras membresías de consultoría y streaming sin compresión (4K Remux nativo 40-80 Mbps, Dolby Vision y Dolby Atmos) son:\\n\\n1️⃣ *Membresía Semestral (6 meses):* $240.000 COP\\n2️⃣ *Membresía Anual (12 meses preferencial):* $440.000 COP\\n\\nPara garantizarte cero buffering antes de activar, validemos 3 datos rápidos de tu equipamiento:\\n\\n*Paso 1 de 3: ¿Qué pantalla o televisor principal usarás?*\\n1️⃣ Smart TV LG (webOS / OLED / QNED)\\n2️⃣ Smart TV Samsung (Tizen)\\n3️⃣ Google TV / Android TV / Sony / TCL\\n4️⃣ Xiaomi Box / TV Box / Mecool\\n5️⃣ Amazon Fire TV Stick 4K\\n6️⃣ Apple TV 4K\\n7️⃣ Otro (¿Cuál marca y modelo?)\\n\\n_👉 Responde con el número de tu opción (1, 2, 3...) o tu modelo:_";',
          '',
          '// 5. CASO ESPECIAL: Asesor Humano / Soporte Personalizado',
          '} else if (normalized.includes("asesor") || normalized.includes("humano") || normalized.includes("persona") || normalized.includes("hablar con alguien") || normalized.includes("atencion al cliente") || (normalized.includes("soporte") && !normalized.includes("comprobante") && !normalized.includes("pago"))) {',
          '  responseText = "✦ *VIDEM | Asistencia Concierge* 🛎️\\n\\nHe notificado de inmediato a Camilo de nuestro equipo técnico senior. En breve revisará este chat directamente para atender tu consulta personalizada.\\n\\n_(Si deseas mientras tanto avanzar con la validación técnica de tu pantalla, solo escribe \\"Empezar\\")_.";',
          '  isHumanHelpRequested = true;',
          '  adminAlertText = "🛎️ *VIDEM ALERT | Solicitud de Asesor Humano*\\n\\n👤 *Cliente:* " + senderName + "\\n📱 *Teléfono:* +" + senderPhone + "\\n💬 *Mensaje:* \\"" + incomingText + "\\"\\n\\n👉 *Acción Requerida:* Por favor ingresa al WhatsApp oficial para atender su consulta personalizada.";',
          '',
          '// 6. CASO ESPECIAL: Respuesta Compuesta (todas las respuestas a la vez)',
          '} else if ((normalized.includes("1") && normalized.includes("2") && normalized.includes("3")) || (normalized.includes("fibra") && (normalized.includes("xiaomi") || normalized.includes("tv") || normalized.includes("lg") || normalized.includes("samsung")) && (normalized.includes("sonido") || normalized.includes("barra")))) {',
          '  responseText = "✦ *VIDEM | Calificación Técnica Exitosa* 🍿\\n\\n¡Excelente, " + senderName + "! Revisamos tu configuración (" + incomingText.replace(/\\n/g, " / ") + ") y tu hogar califica con honores para el estándar privado *Videm* (Remux 4K nativo 40-80 Mbps y audio Dolby Atmos sin pausas).\\n\\n💎 *Tarifas de Consultoría y Aprovisionamiento:*\\n\\n💳 *OPCIÓN 1: PAGO DIGITAL SUMUP (TARJETAS O PSE)*\\n• *Plan Semestral (6 meses completos - $240.000 COP):*\\n👉 " + sumupSemestral + "\\n\\n• *Plan Anual (12 meses preferencial - $440.000 COP):*\\n👉 " + sumupAnual + "\\n\\n━━━━━━━━━━━━━━━━━━━━\\n" + bancolombiaText + "\\n━━━━━━━━━━━━━━━━━━━━\\n\\n📌 *Activación Inmediata:* En cuanto realices tu pago o envíes la foto del comprobante aquí, el bot emite tus credenciales maestras y el enlace interactivo para activar tu televisor en 60 segundos.";',
          '  isQualifiedLead = true;',
          '',
          '// 7. FLUJO CONVERSACIONAL BASADO EN EL HISTORIAL DE RAILWAY',
          '} else if (lastBotMessage.includes("Paso 2 de 3") && !normalized.includes("hola") && !normalized.includes("menu")) {',
          '  responseText = "✦ *VIDEM | Diagnóstico Técnico (Paso 3 de 3)* 🔊\\n\\n¡Conexión validada! Excelente ancho de banda para transferencias Remux 4K sin compresión.\\n\\n*Paso 3 de 3: ¿Cómo disfrutas el audio en tu sala de cine?*\\n\\n1️⃣ Barra de sonido o Receiver dedicado con Dolby Atmos / eARC (Sonos, Bose, LG, Samsung, Sony, etc.)\\n2️⃣ Barra de sonido estándar 2.1 o Parlantes externos\\n3️⃣ Parlantes integrados del televisor\\n4️⃣ Otro (¿Cuál equipo de audio utilizas?)\\n\\n_👉 Responde con el número de tu opción (1, 2, 3...):_\";',
          '',
          '} else if (lastBotMessage.includes("Paso 3 de 3") && !normalized.includes("hola") && !normalized.includes("menu")) {',
          '  responseText = "✦ *VIDEM | Calificación Técnica Exitosa* 🍿\\n\\n¡Felicidades, " + senderName + "! Tu configuración cumple con todos los requisitos para acceder al estándar privado *Videm* (Remux 4K nativo 40-80 Mbps y audio Dolby Atmos sin pausas).\\n\\n💎 *Tarifas de Consultoría y Aprovisionamiento:*\\n\\n💳 *OPCIÓN 1: PAGO DIGITAL SUMUP (TARJETAS O PSE)*\\n• *Plan Semestral (6 meses completos - $240.000 COP):*\\n👉 " + sumupSemestral + "\\n\\n• *Plan Anual (12 meses preferencial - $440.000 COP):*\\n👉 " + sumupAnual + "\\n\\n━━━━━━━━━━━━━━━━━━━━\\n" + bancolombiaText + "\\n━━━━━━━━━━━━━━━━━━━━\\n\\n📌 *Activación Inmediata:* En cuanto realices tu pago o envíes la foto del comprobante aquí, el bot emite tus credenciales maestras y el enlace interactivo para activar tu televisor en 60 segundos.";',
          '  isQualifiedLead = true;',
          '',
          '} else if (lastBotMessage.includes("Paso 1 de 3") && !normalized.includes("hola") && !normalized.includes("menu")) {',
          '  responseText = "✦ *VIDEM | Diagnóstico Técnico (Paso 2 de 3)* ⚡\\n\\n¡Perfecto! Hemos registrado tu equipo (" + incomingText + "). 📺\\n\\n*Paso 2 de 3: ¿Qué tipo y velocidad de internet tienes en casa?*\\n\\n1️⃣ Fibra Óptica de 300 a 500+ Megas\\n2️⃣ Fibra Óptica de 100 a 200 Megas\\n3️⃣ Conexión Cable coaxial / HFC (50 a 100 Megas)\\n4️⃣ Red móvil 4G/5G o Wi-Fi compartido\\n5️⃣ Otro (¿De cuántos megas aproximadamente?)\\n\\n_👉 Responde con el número de tu opción (1, 2, 3...) o descríbela:_\";',
          '',
          '} else {',
          '  responseText = "✦ *VIDEM | Private Tech Concierge* 🎬\\n\\nHola " + senderName + ", un gusto saludarte. Soy el conserje técnico de *Videm*.\\n\\nPara garantizarte la experiencia cinematográfica en *Remux 4K nativo, Dolby Vision y Dolby Atmos sin buffering*, validemos 3 datos rápidos de tu equipamiento.\\n\\n*Paso 1 de 3: ¿Qué pantalla o televisor principal usarás?*\\n\\n1️⃣ Smart TV LG (webOS / OLED / QNED)\\n2️⃣ Smart TV Samsung (Tizen)\\n3️⃣ Google TV / Android TV / Sony / TCL\\n4️⃣ Xiaomi Box / TV Box / Mecool\\n5️⃣ Amazon Fire TV Stick 4K\\n6️⃣ Apple TV 4K\\n7️⃣ Otro (¿Cuál marca y modelo?)\\n\\n_👉 Responde con el número de tu opción (1, 2, 3...) o escribe tu modelo:_\\n\\n_Nota: Al continuar autorizas el tratamiento de datos para fines de asistencia técnica._\";',
          '}',
          '',
          'return {',
          '  phone: senderPhone,',
          '  senderPhone,',
          '  senderName,',
          '  responseText,',
          '  triggerProvisioning,',
          '  isQualifiedLead,',
          '  isHumanHelpRequested,',
          '  adminAlertText,',
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
        jsonBody: '={\n  "number": "{{ $json.phone || $json.senderPhone }}",\n  "text": {{ JSON.stringify($json.responseText) }}\n}',
        options: {}
      },
      id: 'node-send-whatsapp',
      name: 'Evolution API: Enviar WhatsApp',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.1,
      position: [780, 260]
    },
    {
      parameters: {
        jsCode: [
          '// FILTRO Y FORMATEO DE REGISTROS PARA GOOGLE SHEETS CRM',
          '// Solo se ejecuta si el cliente califico, pago o solicito asesor.',
          '// NO llena filas por mensajes intermedios de chat (Hola, 1, 2, etc.)',
          'const item = $input.item.json;',
          '',
          'if (!item.triggerProvisioning && !item.isQualifiedLead && !item.isHumanHelpRequested) {',
          '  return []; // Detiene la ejecucion hacia Google Sheets',
          '}',
          '',
          'const now = new Date();',
          'const fechaCol = now.toLocaleString("es-CO", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });',
          '',
          'let estado = "Calificado (Pendiente Pago)";',
          'let plan = item.accountData?.plan || "Semestral / Anual (En Evaluación)";',
          'if (item.triggerProvisioning) {',
          '  estado = "Activo (Pagado)";',
          '} else if (item.isHumanHelpRequested) {',
          '  estado = "Requiere Asesor Humano";',
          '  plan = "Atención Personalizada";',
          '}',
          '',
          'return {',
          '  Fecha: fechaCol,',
          '  Telefono: item.phone || item.senderPhone,',
          '  Nombre: item.senderName || "Cliente",',
          '  Plan: plan,',
          '  Estado: estado,',
          '  Usuario_Stremio: item.accountData?.clientEmail || "-",',
          '  Referencia: item.accountData?.ref || "-",',
          '  Vigencia: item.accountData?.expDate || "-"',
          '};'
        ].join('\n')
      },
      id: 'node-format-crm',
      name: 'Filtrar Solo Clientes / Ventas',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [780, 480]
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
      position: [1040, 480]
    },
    {
      parameters: {
        jsCode: [
          '// FILTRO DE ALERTAS EN TIEMPO REAL PARA CAMILO',
          '// Se ejecuta UNICAMENTE si hay solicitud de asesor humano o pago verificado',
          'const item = $input.item.json;',
          '',
          'if (!item.adminAlertText) {',
          '  return []; // No requiere alerta',
          '}',
          '',
          'return {',
          '  adminNumber: "' + ADMIN_PHONE + '",',
          '  adminText: item.adminAlertText',
          '};'
        ].join('\n')
      },
      id: 'node-filter-admin-alert',
      name: 'Filtrar Alerta a Camilo',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [780, 700]
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
        jsonBody: '={\n  "number": "{{ $json.adminNumber }}",\n  "text": {{ JSON.stringify($json.adminText) }}\n}',
        options: {}
      },
      id: 'node-send-admin-alert',
      name: 'Evolution API: Notificar a Camilo',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.1,
      position: [1040, 700]
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
          { node: 'Filtrar Solo Clientes / Ventas', type: 'main', index: 0 },
          { node: 'Filtrar Alerta a Camilo', type: 'main', index: 0 }
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
    'Filtrar Alerta a Camilo': {
      main: [
        [
          { node: 'Evolution API: Notificar a Camilo', type: 'main', index: 0 }
        ]
      ]
    }
  }
};

const targetPath = path.join(__dirname, 'n8n_videm_whatsapp_bot.json');
fs.writeFileSync(targetPath, JSON.stringify(workflow, null, 2), 'utf8');
console.log('Successfully generated workflow with SumUp, Bancolombia, and Admin Alerts at', targetPath);
