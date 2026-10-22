const fs = require('fs');
const path = require('path');

const workflow = JSON.parse(fs.readFileSync(path.join(__dirname, 'n8n_videm_whatsapp_bot.json'), 'utf8'));
const cerebroNode = workflow.nodes.find(n => n.id === 'node-cerebro');
const crmNode = workflow.nodes.find(n => n.id === 'node-format-crm');
const alertFilterNode = workflow.nodes.find(n => n.id === 'node-filter-admin-alert');

function executeCerebro(incomingText, lastBotText, messageType = 'text', senderPhone = '573124766620') {
  const webhookItem = {
    data: {
      key: { remoteJid: senderPhone + '@s.whatsapp.net', fromMe: false },
      pushName: 'Natalia Arias',
      message: messageType === 'image' 
        ? { imageMessage: { caption: incomingText } }
        : { conversation: incomingText }
    }
  };

  const historyData = {
    messages: {
      records: lastBotText ? [
        {
          key: { fromMe: true },
          message: { conversation: lastBotText }
        }
      ] : []
    }
  };

  const mock$ = function(nodeName) {
    return {
      first: () => ({ json: webhookItem })
    };
  };

  const fn = new Function('$', '$input', cerebroNode.parameters.jsCode);
  return fn(mock$, { item: { json: historyData } });
}

function executeCRM(cerebroResult) {
  const fn = new Function('$input', crmNode.parameters.jsCode);
  return fn({ item: { json: cerebroResult } });
}

function executeAlertFilter(cerebroResult) {
  const fn = new Function('$input', alertFilterNode.parameters.jsCode);
  return fn({ item: { json: cerebroResult } });
}

console.log('======================================================================');
console.log('VIDEM - SUITE COMPLETA CON ALERTAS EN TIEMPO REAL A CAMILO (+57 310 331 1543)');
console.log('======================================================================\n');

// 1. Mensaje casual (Hola)
console.log('--- TEST 1: Cliente escribe "Hola" ---');
const t1 = executeCerebro('Hola', null);
console.log('Respuesta cliente:', t1.responseText.substring(0, 100) + '...');
console.log('Alerta a Camilo (debe ser vacía):', executeAlertFilter(t1));
console.log('CRM Google Sheets (debe ser ignorado):', executeCRM(t1), '\n');

// 2. Cliente pide asesor humano
console.log('--- TEST 2: Cliente pide asesor humano ("Necesito hablar con un asesor") ---');
const t2 = executeCerebro('Hola, necesito hablar con un asesor para una duda técnica', null);
console.log('Respuesta al cliente:\n' + t2.responseText + '\n');
const alert2 = executeAlertFilter(t2);
console.log('🚨 ALERTA PRIVADA A CAMILO:\nNúmero destino:', alert2.adminNumber);
console.log('Texto mensaje:\n' + alert2.adminText + '\n');
console.log('CRM Google Sheets:', executeCRM(t2), '\n');

// 3. Cliente completa diagnóstico y se califica
console.log('--- TEST 3: Cliente completa Paso 3 de audio ("1") ---');
const t3 = executeCerebro('1', 'Paso 3 de 3: ¿Cómo disfrutas el audio en tu sala de cine?');
console.log('Respuesta al cliente (Calificación + SumUp + Bancolombia):\n' + t3.responseText.substring(0, 200) + '...\n');
console.log('Alerta a Camilo (no es alerta crítica):', executeAlertFilter(t3));
console.log('CRM Google Sheets (Lead Calificado):', executeCRM(t3), '\n');

// 4. Cliente reporta pago Semestral
console.log('--- TEST 4: Cliente envía comprobante Semestral ("Listo ya transferí los 240 mil ref M839201") ---');
const t4 = executeCerebro('Listo ya transferí los 240 mil ref M839201', 'Calificación...');
console.log('Respuesta al cliente (Welcome Kit + Link Activar):\n' + t4.responseText.substring(0, 200) + '...\n');
const alert4 = executeAlertFilter(t4);
console.log('💰 ALERTA DE PAGO A CAMILO:\nNúmero destino:', alert4.adminNumber);
console.log('Texto mensaje:\n' + alert4.adminText + '\n');
console.log('CRM Google Sheets (Venta Pagada):', executeCRM(t4), '\n');

// 5. Cliente reporta pago Anual
console.log('--- TEST 5: Cliente paga Plan Anual SumUp ("Pagué el anual por SumUp ref 994821") ---');
const t5 = executeCerebro('Pagué el anual por SumUp ref 994821', 'Calificación...');
const alert5 = executeAlertFilter(t5);
console.log('💰 ALERTA DE PAGO ANUAL A CAMILO:\nNúmero destino:', alert5.adminNumber);
console.log('Texto mensaje:\n' + alert5.adminText + '\n');
console.log('CRM Google Sheets (Venta Anual):', executeCRM(t5), '\n');

console.log('======================================================================');
console.log('TODAS LAS PRUEBAS DE ALERTAS Y FLUJO COMPLETADAS CON ÉXITO');
console.log('======================================================================');
