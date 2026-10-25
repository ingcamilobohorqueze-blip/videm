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
        jsonBody: '={\n  "where": {\n    "key": {\n      "remoteJid": "{{ $json.body?.data?.key?.remoteJid || $json.body?.phone || $json.body?.remoteJid || ($json.body?.senderPhone ? $json.body?.senderPhone + \"@s.whatsapp.net\" : \"\") }}"\n    }\n  },\n  "take": 8\n}',
        options: {}
      },
      id: 'node-fetch-history',
      name: 'Buscar Historial en Railway',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.1,
      position: [320, 400],
      continueOnFail: true
    },
    {
      parameters: {
        jsCode: [
          '// CEREBRO CONCIERGE VIP VIDEM - ATENCION NATURAL, LANEROS, CODIGOS TV Y ALERTAS A CAMILO',
          'const webhookItem = $("Webhook Evolution API (Inbound)").first().json;',
          'const body = webhookItem.body || webhookItem;',
          'const historyData = $input.item.json;',
          '',
          'let senderPhone = "";',
          'let incomingText = "";',
          'let senderName = "Cliente";',
          'let messageType = "text";',
          'let isFromMe = false;',
          'let isGroup = false;',
          'let rawJid = "";',
          '',
          'if (body.data) {',
          '  const data = body.data;',
          '  isFromMe = data.key?.fromMe || false;',
          '  rawJid = data.key?.remoteJid || "";',
          '  isGroup = rawJid.includes("@g.us") || Boolean(data.isGroup || body.isGroup);',
          '  const altJid = data.key?.remoteJidAlt || "";',
          '  senderPhone = (altJid || rawJid).replace("@s.whatsapp.net", "").replace("@lid", "").replace("@g.us", "");',
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
          '  rawJid = msg.from || "";',
          '  isGroup = rawJid.includes("@g.us");',
          '  senderPhone = msg.from.replace("@s.whatsapp.net", "").replace("@lid", "").replace("@g.us", "");',
          '  senderName = body.entry[0].changes[0].value.contacts?.[0]?.profile?.name || "Cliente";',
          '  if (msg.type === "text") incomingText = msg.text.body;',
          '  if (msg.type === "image") { messageType = "image"; incomingText = msg.image?.caption || "[Comprobante]"; }',
          '} else {',
          '  rawJid = String(body.from || body.phone || body.remoteJid || body.key?.remoteJid || "");',
          '  isGroup = rawJid.includes("@g.us") || Boolean(body.isGroup);',
          '  senderPhone = rawJid.replace("@s.whatsapp.net", "").replace("@lid", "").replace("@g.us", "");',
          '  incomingText = body.text || body.message || "";',
          '  senderName = body.name || "Cliente";',
          '  messageType = body.type || "text";',
          '}',
          '',
          '// IGNORAR TOTALMENTE MENSAJES ENVIADOS POR MI O MENSAJES DE CUALQUIER GRUPO DE WHATSAPP',
          'if (isFromMe || isGroup || rawJid.includes("@g.us") || senderPhone.includes("@g.us")) {',
          '  return [];',
          '}',
          '',
          'const normalized = incomingText.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();',
          'const isGreeting = /^(hola|holaa|holaaa|buenas|buenos|buen|hey|saludos|que tal|como estas|como va)/i.test(normalized);',
          'const isStremioPairingCode = !isGreeting && /^[A-Za-z0-9]{4,6}$/.test(incomingText.trim()) && !["pago", "menu", "info", "si", "no", "bien", "vale", "ok", "listo", "1", "2", "3", "4", "5", "6", "7"].includes(normalized) && (/\\d/.test(incomingText) || (incomingText.trim() === incomingText.trim().toUpperCase() && !/[aeiou]{2,}/i.test(incomingText)));',
          '',
          '// Extraer historial previo para contexto y alertas a Camilo',
          'const rawRecords = historyData.messages?.records || (Array.isArray(historyData) ? historyData : []);',
          '// Filtrar alertas internas del sistema para que solo quede la conversacion real',
          'const records = rawRecords.filter(r => {',
          '  const txt = r.message?.conversation || r.message?.extendedTextMessage?.text || "";',
          '  return !txt.includes("VIDEM ALERT") && !txt.includes("RECORDATORIO DE DESPACHO");',
          '});',
          'let chatTranscript = "";',
          'if (records.length > 0) {',
          '  const recent = records.slice(0, 5).reverse();',
          '  chatTranscript = recent.map(r => {',
          '    const role = r.key?.fromMe ? "Conserje VIDEM" : senderName;',
          '    const txt = (r.message?.conversation || r.message?.extendedTextMessage?.text || (r.message?.imageMessage ? "[Foto/Comprobante]" : "[Mensaje]")).trim();',
          '    const shortTxt = txt.length > 80 ? txt.slice(0, 80) + "..." : txt;',
          '    return "• *" + role + ":* " + shortTxt;',
          '  }).join("\\n");',
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
          'const mpSemestral = "https://mpago.li/2XG62h2";',
          'const mpAnual = "https://mpago.li/1wAw8DE";',
          'const bancolombiaText = "🏦 *OPCIÓN 2: TRANSFERENCIA BANCARIA DIRECTA*\\n• *Bancolombia (Ahorros):* `03202411001`\\n• *Titular:* Camilo Andrés Bohórquez Enciso\\n• *C.C.:* 80.257.729\\n_(Acepta transferencias directas de Bancolombia, Nequi y Transfiya sin costo adicional)_";',
          '',
          '// 1. CASO ESPECIAL: Comprobante o Notificación de Pago Recibido',
          'const isPayment = messageType === "image" || normalized.includes("comprobante") || normalized.includes("transferencia") || normalized.includes("transferi") || normalized.includes("pague") || normalized.includes("pago") || normalized.includes("recibo") || normalized.includes("voucher") || /\\b(m\\d{6,12}|neq-\\d+|sumup|mercadopago|mpago|bancolombia)\\b/i.test(normalized) || (/\\b\\d{6,12}\\b/.test(normalized) && (normalized.includes("ref") || normalized.includes("listo") || normalized.includes("ya") || normalized.includes("anual") || normalized.includes("semestral")));',
          'if (isPayment) {',
          '  const refMatch = incomingText.match(/M?\\d{6,12}/i) || incomingText.match(/ref[:\\s]*([a-zA-Z0-9]+)/i);',
          '  const detectedRef = refMatch ? (refMatch[1] || refMatch[0]) : ("TX-" + Math.floor(100000 + Math.random() * 900000));',
          '  const randomSuffix = Math.floor(1000 + Math.random() * 9000);',
          '  const clientEmail = "vip." + randomSuffix + "@videm.tv";',
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
          '    ? "📡 *CALIBRACIÓN EN VIVO (TERMÓMETRO DE ACTIVACIÓN):*\\nHemos iniciado la calibración de tu enlace privado (tiempo estimado: 3 a 5 minutos).\\n\\nSigue el avance en tiempo real e ingresa el código de tu Smart TV aquí:\\n👉 " + activationUrl + "\\n\\n¡Al completar la calibración tu pantalla quedará sincronizada en automático!"',
          '    : "🌙 *PAGO RECIBIDO & CUPO VIP RESERVADO:*\\nHemos recibido tu comprobante con éxito. Al ser fuera de nuestro horario de calibración técnica de pantallas (8:00 AM a 10:00 PM), tu enlace será completado por tu conserje técnico a primera hora (8:00 AM).\\n\\n📺 *Mientras tanto, deja tu Smart TV lista:* Descarga la app *Stremio* y ten a mano este enlace:\\n👉 " + activationUrl;',
          '',
          '  responseText = "✦ *¡FELICIDADES, " + senderName.toUpperCase() + "! PAGO VERIFICADO* 🎬\\n\\nHemos validado tu pago con éxito (Ref: *" + detectedRef + "*).\\nTu membresía *" + planName + "* está activa hasta el *" + expDate + "*.\\n\\n━━━━━━━━━━━━━━━━━━━━\\n💎 *CREDENCIALES MAESTRAS PRIVADAS:*\\n📧 *Usuario:* `" + clientEmail + "`\\n🔑 *Clave:* `" + clientPass + "`\\n━━━━━━━━━━━━━━━━━━━━\\n\\n" + activationNote;',
          '  triggerProvisioning = true;',
          '  accountData = { phone: senderPhone, name: senderName, plan: planName + " (" + planCost + ")", ref: detectedRef, clientEmail, expDate };',
          '  const statusAlert = isBusinessHours ? "⚡ *Estado:* En horario de atención (Calibración en curso 3-5 min)" : "🌙 *Estado:* Horario nocturno (Activar a las 8:00 AM)";',
          '  adminAlertText = [',
          '    "💰 *VIDEM ALERT | ¡NUEVA VENTA VERIFICADA!* 🎬",',
          '    "",',
          '    "👤 *Cliente:* " + senderName,',
          '    "📱 *WhatsApp:* +" + senderPhone,',
          '    "💎 *Plan:* " + planName + " (" + planCost + ")",',
          '    "🔢 *Ref:* " + detectedRef,',
          '    statusAlert,',
          '    "",',
          '    "📜 *HISTORIAL PREVIO:*",',
          '    chatTranscript || "_(Comprobante adjunto)_",',
          '    "",',
          '    "👉 *Chatear con el cliente en 1 clic:*",',
          '    "https://wa.me/" + senderPhone,',
          '    "",',
          '    "━━━━━━━━━━━━━━━━━━━━",',
          '    "🛠️ *DESPACHO INMEDIATO (3-5 min):*",',
          '    "1. Registrar en RD: `vip." + randomSuffix + "@videm.tv` / `videm_vip_" + randomSuffix + "` / `Videm4K." + randomSuffix + "!`",',
          '    "2. Comprar membresía (" + (isAnual ? "360 días" : "180 días = 16€") + ") y copiar API token",',
          '    "3. Instalar Torrentio RD y vincular Smart TV en: https://link.stremio.com"',
          '  ].join("\\n");',
          '',
          '// 2. CASO ESPECIAL: Código de TV Stremio para Vincular Pantalla (ej: 9A4K o ABCD)',
          '} else if (isStremioPairingCode) {',
          '  const code = incomingText.toUpperCase().trim();',
          '  const directLinkUrl = "https://link.stremio.com/" + code;',
          '  responseText = "✦ *VIDEM | Enlace de Pantalla Recibido* 📺\\n\\nCódigo detectado: `*" + code + "*`\\n\\nEstamos asociando tu televisor a nuestra infraestructura privada:\\n✔ 4K Remux nativo 60–85 Mbps activo\\n✔ Dolby Vision & Dolby Atmos habilitados\\n✔ Cero buffering, sin compresión ni publicidad\\n\\n⚡ Camilo y el equipo técnico están validando la sincronización en vivo. En un momento tu televisor se reiniciará automáticamente con VIDEM listo para disfrutar. 🍿";',
          '  isHumanHelpRequested = true;',
          '  adminAlertText = [',
          '    "📺 *VIDEM ALERT | ¡CÓDIGO DE TV RECIBIDO PARA CALIBRACIÓN!*",',
          '    "",',
          '    "👤 *Cliente:* " + senderName,',
          '    "📱 *WhatsApp:* +" + senderPhone,',
          '    "🔑 *Código de TV:* `" + code + "`",',
          '    "",',
          '    "⚡ *ACTIVAR EN 1 CLIC (Abre en tu navegador con la cuenta demo o cliente):*",',
          '    directLinkUrl,',
          '    "",',
          '    "👉 *Chatear con el cliente:*",',
          '    "https://wa.me/" + senderPhone',
          '  ].join("\\n");',
          '',
          '// 3. CASO ESPECIAL: Guía para Instalar Stremio ("No tengo", "como lo instalo", "donde está")',
          '} else if (normalized.includes("no tengo") || normalized.includes("no lo tengo") || normalized.includes("como lo instalo") || normalized.includes("donde lo descargo") || normalized.includes("como se instala") || normalized.includes("no esta") || normalized.includes("no se") || normalized.includes("no encuentro") || normalized.includes("paso a paso") || normalized.includes("ayudame")) {',
          '  responseText = "✦ *VIDEM | Guía de Instalación Rápida de Stremio* 📺\\n\\n¡Es súper fácil! Solo te toma 1 minuto desde el control remoto de tu televisor:\\n\\n1️⃣ En tu TV, abre la **Tienda de Aplicaciones** (Apps en LG webOS, Apps en Samsung, Google Play Store en Android/Google TV o Appstore en Fire TV).\\n2️⃣ En el buscador escribe: *Stremio*.\\n3️⃣ Dale a **Instalar** y luego a **Abrir**.\\n4️⃣ Al abrir la aplicación, en la pantalla te saldrá un código de 4 letras para vincular (ej: `9A4K`).\\n\\nEn cuanto lo tengas, escríbeme ese código por acá y en 10 segundos te dejamos la pantalla configurada en 4K. 🍿\\n\\n¿Qué marca de televisor tienes en tu sala para darte el truco exacto si no te aparece?";',
          '',
          '// 4. CASO ESPECIAL: Marca de Televisor mencionada (Samsung, LG, Fire TV, Xiaomi, etc.)',
          '} else if (normalized.includes("samsung") || normalized.includes("lg") || normalized.includes("fire tv") || normalized.includes("firestick") || normalized.includes("xiaomi") || normalized.includes("google tv") || normalized.includes("android") || normalized.includes("tcl") || normalized.includes("sony")) {',
          '  responseText = "✦ *VIDEM | Configuración para tu Pantalla* 📺\\n\\n¡Excelente! En tu modelo Stremio está disponible directamente en la tienda oficial:\\n\\n1️⃣ Entra a la tienda de apps de tu TV.\\n2️⃣ Busca *Stremio* e instálalo.\\n3️⃣ Al abrirlo, la pantalla te mostrará el código de 4 letras para vincular.\\n\\nEnvíame ese código de 4 letras por acá y te activamos el acceso VIP en 10 segundos. 🍿";',
          '',
          '// 5. CASO ESPECIAL: Ya tiene instalado Stremio ("Si", "Ya lo tengo", "Listo")',
          '} else if (normalized.includes("ya lo instale") || normalized.includes("ya lo tengo") || normalized.includes("si lo tengo") || normalized === "si" || normalized === "listo" || normalized === "ya") {',
          '  responseText = "✦ *VIDEM | Enlace de tu Pantalla* 📺\\n\\n¡Perfecto! Abre la app Stremio en tu televisor:\\n\\nEn la pantalla principal te aparecerá un código de 4 letras (ejemplo: `ABCD`) para vincular tu dispositivo.\\n\\nEnvíame ese código aquí al chat y sincronizamos tu televisor en 10 segundos con nuestro enlace 4K Remux. 🍿";',
          '',
          '// 6. CASO ESPECIAL: Prospectos de Laneros o Solicitudes de Prueba / Demo VIP',
          '} else if (normalized.includes("laneros") || normalized.includes("zeit") || normalized.includes("nitro") || normalized.includes("foro") || normalized.includes("demo") || (normalized.includes("prueba") && !normalized.includes("comprobante"))) {',
          '  responseText = "✦ *VIDEM CONCIERGE | Acceso Prioritario* 🎬\\n\\n¡Hola " + senderName + "! Qué gusto saludarte. Te doy una bienvenida VIP a *VIDEM*.\\n\\nCamilo nos dejó indicado tu cupo prioritario de prueba para calibrar tu pantalla y que sientas la fidelidad de nuestro *4K Remux nativo (60–85 Mbps) con Dolby Atmos real* sin compresión.\\n\\nPara enlazarte en 3 minutos sin complicaciones:\\n📺 *1.* Descarga la app *Stremio* en tu Smart TV o Fire TV.\\n🔑 *2.* Al abrirla, la pantalla de tu TV te mostrará un código de 4 letras (ej: `ABCD`) para vincular.\\n💬 *3.* Envíame ese código de 4 letras por este chat y te activamos el enlace de inmediato.\\n\\n¿Ya tienes Stremio instalado en tu pantalla o prefieres que te apoye paso a paso?";',
          '  isHumanHelpRequested = true;',
          '  adminAlertText = [',
          '    "🎟️ *VIDEM ALERT | ¡PROSPECTO VIP DE LANEROS / DEMO DETECTADO!* 🎬",',
          '    "",',
          '    "👤 *Cliente:* " + senderName,',
          '    "📱 *WhatsApp:* +" + senderPhone,',
          '    "💬 *Mensaje:* \\"" + incomingText + "\\"",',
          '    "",',
          '    "📜 *HISTORIAL PREVIO:*",',
          '    chatTranscript || "_(Primer contacto)_",',
          '    "",',
          '    "👉 *Chatear con él en 1 clic:*",',
          '    "https://wa.me/" + senderPhone',
          '  ].join("\\n");',
          '',
          '// 4. CASO ESPECIAL: Solicitud de Renovaciones',
          '} else if (normalized.includes("renov") || normalized.includes("extender")) {',
          '  responseText = "✦ *VIDEM | Portal de Clientes & Renovaciones* 🔄\\n\\nHola " + senderName + ", bienvenido a tu canal prioritario.\\n\\nPara renovar tu enlace privado de inmediato:\\n\\n💳 *Opción Mercado Pago (Tarjetas a Cuotas / PSE):*\\n• *Semestral (6 meses - $240.000 COP):*\\n👉 " + mpSemestral + "\\n• *Anual (12 meses - $440.000 COP):*\\n👉 " + mpAnual + "\\n\\n━━━━━━━━━━━━━━━━━━━━\\n" + bancolombiaText + "\\n━━━━━━━━━━━━━━━━━━━━\\n\\nEnvía el comprobante por este chat y tu enlace CDN y catálogos se mantendrán activos sin reconfigurar tu pantalla.";',
          '',
          '// 5. CASO ESPECIAL: Consulta de Precios, Tarifas o Planes',
          '} else if (normalized.includes("precio") || normalized.includes("costo") || normalized.includes("cuanto vale") || normalized.includes("cuanto cuesta") || normalized.includes("tarifa") || normalized.includes("planes") || normalized.includes("valores")) {',
          '  responseText = "✦ *VIDEM | Membresías y Tarifas Concierge* 💎\\n\\nHola " + senderName + ", en VIDEM ofrecemos una infraestructura de streaming privado bajo demanda con ancho de banda dedicado a 80 Mbps Remux puro (calidad Blu-ray física, sin compresión ni caídas):\\n\\n🎟️ *Membresía Semestral (6 meses):* $240.000 COP ($40.000/mes)\\n🎟️ *Membresía Anual (12 meses preferencial):* $440.000 COP (Ahorras $40.000)\\n\\n✔ Incluye todo el cine y series en 4K Remux, Dolby Vision y Dolby Atmos.\\n✔ Cero buffering, sin publicidad y calibración asistida en 3 minutos.\\n✔ Compatible con Smart TV LG, Samsung, Android TV, Google TV y Fire TV Stick.\\n\\n💳 *Pagar con Tarjetas o PSE:* " + mpSemestral + "\\n" + bancolombiaText + "\\n\\n¿Deseas activar tu pantalla hoy o tienes alguna duda técnica de tu televisor?";',
          '  isQualifiedLead = true;',
          '',
          '// 6. CASO ESPECIAL: Asesor Humano / Soporte Personalizado / Duda Compleja',
          '} else if (normalized.includes("asesor") || normalized.includes("humano") || normalized.includes("persona") || normalized.includes("hablar con alguien") || normalized.includes("camilo") || normalized.includes("atencion al cliente") || normalized.includes("soporte")) {',
          '  responseText = "✦ *VIDEM | Asistencia Concierge* 🛎️\\n\\nCon mucho gusto, " + senderName + ". Le acabo de transferir esta conversación a Camilo de nuestro equipo técnico senior, junto con el contexto de lo que hemos hablado.\\n\\nEn breve te responderá directamente por acá para brindarte atención personalizada.";',
          '  isHumanHelpRequested = true;',
          '  adminAlertText = [',
          '    "🛎️ *VIDEM ALERT | Solicitud de Asesor Humano*",',
          '    "",',
          '    "👤 *Cliente:* " + senderName,',
          '    "📱 *WhatsApp:* +" + senderPhone,',
          '    "💬 *Último Mensaje:* \\"" + incomingText + "\\"",',
          '    "",',
          '    "📜 *HILO DE LA CONVERSACIÓN RECIENTE:*",',
          '    chatTranscript || "_(Primer contacto)_",',
          '    "",',
          '    "👉 *Chatear con el cliente en 1 clic:*",',
          '    "https://wa.me/" + senderPhone',
          '  ].join("\\n");',
          '',
          '// 7. RESPUESTA DE BIENVENIDA Y ATENCION CONCIERGE NATURAL',
          '} else {',
          '  responseText = "✦ *VIDEM | Private Tech Concierge* 🎬\\n\\nHola " + senderName + ", un gusto saludarte. Soy la conserje de asistencia de *VIDEM*.\\n\\nBrindamos consultoría y enrutamiento privado de streaming para que disfrutes de películas y series en calidad de cine original (*4K Remux a 80 Mbps con Dolby Vision y Dolby Atmos sin pérdidas*) directamente en tu Smart TV o Fire TV, sin compresión y sin pagar 5 suscripciones.\\n\\nCuéntame, ¿qué modelo de televisor o equipo de sonido tienes en tu sala, o en qué te podemos apoyar hoy?";',
          '}',
          '',
          'return {',
          '  phone: rawJid,',
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
        jsonBody: '={\n  "number": "{{ $json.phone }}",\n  "text": {{ JSON.stringify($json.responseText) }}\n}',
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
          '// FILTRO Y FORMATEO PARA GOOGLE SHEETS',
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
        operation: 'appendOrUpdate',
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
        columns: {
          mappingMode: 'autoMapInputData',
          value: {},
          matchingColumns: ['Telefono'],
          schema: [
            { id: 'Fecha', displayName: 'Fecha', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
            { id: 'Telefono', displayName: 'Telefono', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
            { id: 'Nombre', displayName: 'Nombre', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
            { id: 'Plan', displayName: 'Plan', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
            { id: 'Estado', displayName: 'Estado', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
            { id: 'Usuario_Stremio', displayName: 'Usuario_Stremio', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
            { id: 'Referencia', displayName: 'Referencia', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
            { id: 'Vigencia', displayName: 'Vigencia', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false }
          ]
        },
        options: {}
      },
      id: 'node-sheets-crm',
      name: 'Google Sheets CRM (Actualizar Fila)',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4.5,
      position: [1040, 480]
    },
    {
      parameters: {
        jsCode: [
          '// FILTRO DE ALERTAS EN TIEMPO REAL PARA CAMILO',
          '// Se ejecuta si hay solicitud de asesor humano, codigo TV, lead Laneros o pago verificado',
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
      main: [[{ node: 'Google Sheets CRM (Actualizar Fila)', type: 'main', index: 0 }]]
    },
    'Filtrar Alerta a Camilo': {
      main: [[{ node: 'Evolution API: Notificar a Camilo', type: 'main', index: 0 }]]
    }
  },
  active: true,
  settings: {
    executionOrder: 'v1'
  }
};

const outputPath = path.join(__dirname, 'n8n_videm_whatsapp_bot.json');
fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2), 'utf8');
console.log('✅ Workflow generado exitosamente en:', outputPath);
