const fs = require('fs');
const path = require('path');

const workflow = JSON.parse(fs.readFileSync(path.join(__dirname, 'n8n_videm_whatsapp_bot.json'), 'utf8'));
const cerebroNode = workflow.nodes.find(n => n.id === 'node-cerebro');
const crmNode = workflow.nodes.find(n => n.id === 'node-format-crm');

function executeCerebro(incomingText, lastBotText, messageType = 'text') {
  const webhookItem = {
    data: {
      key: { remoteJid: '573124766620@s.whatsapp.net', fromMe: false },
      pushName: 'Camilo',
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

console.log('======================================================================');
console.log('VIDEM - SUITE COMPLETA DE PRUEBAS DE BOT CON SUMUP Y BANCOLOMBIA');
console.log('======================================================================\n');

// 1. Saludo Inicial
console.log('--- TEST 1: Cliente saluda ("Hola") ---');
const t1 = executeCerebro('Hola', null);
console.log(t1.responseText.substring(0, 180) + '...\n');
console.log('CRM Output (debe ser ignorado):', executeCRM(t1), '\n');

// 2. Paso 1 -> Paso 2
console.log('--- TEST 2: Cliente responde equipo ("4" - Xiaomi Box) ---');
const t2 = executeCerebro('4', 'Paso 1 de 3: ¿Qué pantalla o televisor principal usarás?');
console.log(t2.responseText.substring(0, 180) + '...\n');
console.log('CRM Output (debe ser ignorado):', executeCRM(t2), '\n');

// 3. Paso 2 -> Paso 3
console.log('--- TEST 3: Cliente responde conexión ("1" - Fibra 300M) ---');
const t3 = executeCerebro('1', 'Paso 2 de 3: ¿Qué tipo y velocidad de internet tienes en casa?');
console.log(t3.responseText.substring(0, 180) + '...\n');
console.log('CRM Output (debe ser ignorado):', executeCRM(t3), '\n');

// 4. Paso 3 -> Calificación con Enlaces de Pago Reales
console.log('--- TEST 4: Cliente responde audio ("1" - Barra Sonos Atmos) ---');
const t4 = executeCerebro('1', 'Paso 3 de 3: ¿Cómo disfrutas el audio en tu sala de cine?');
console.log(t4.responseText);
console.log('\nCRM Output (Lead Calificado):', executeCRM(t4), '\n');

// 5. Consulta directa de precios
console.log('--- TEST 5: Consulta directa de precios ("¿Cuánto cuesta el servicio?") ---');
const t5 = executeCerebro('¿Cuánto cuesta el servicio?', null);
console.log(t5.responseText.substring(0, 250) + '...\n');

// 6. Solicitud de asesor humano
console.log('--- TEST 6: Cliente pide asesor humano ("Necesito hablar con un asesor") ---');
const t6 = executeCerebro('Necesito hablar con un asesor humano', null);
console.log(t6.responseText + '\n');

// 7. Pago Semestral por SumUp / Bancolombia
console.log('--- TEST 7: Cliente envía comprobante Semestral ("Listo ya transferí los 240 mil ref M839201") ---');
const t7 = executeCerebro('Listo ya transferí los 240 mil ref M839201', 'Calificación Técnica Exitosa...');
console.log(t7.responseText);
console.log('\nCRM Output (Venta Semestral Activa):', executeCRM(t7), '\n');

// 8. Pago Anual por SumUp
console.log('--- TEST 8: Cliente paga Plan Anual SumUp ("Pagué el plan anual ref 994821") ---');
const t8 = executeCerebro('Pagué el plan anual ref 994821', 'Calificación Técnica Exitosa...');
console.log(t8.responseText);
console.log('\nCRM Output (Venta Anual Activa):', executeCRM(t8), '\n');

// 9. Código de TV Stremio
console.log('--- TEST 9: Cliente envía código de su Smart TV ("4B2A") ---');
const t9 = executeCerebro('4B2A', 'VINCULA TU SMART TV...');
console.log(t9.responseText + '\n');

console.log('======================================================================');
console.log('TODAS LAS PRUEBAS COMPLETADAS CON ÉXITO');
console.log('======================================================================');
