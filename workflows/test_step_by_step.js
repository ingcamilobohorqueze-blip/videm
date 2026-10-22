const fs = require('fs');
const path = require('path');

const workflow = JSON.parse(fs.readFileSync(path.join(__dirname, 'n8n_videm_whatsapp_bot.json'), 'utf8'));
const node = workflow.nodes.find(n => n.id === 'node-cerebro');

function executeCerebro(incomingText, lastBotText) {
  const webhookItem = {
    data: {
      key: { remoteJid: '573103311543@s.whatsapp.net' },
      pushName: 'Camilo',
      message: { conversation: incomingText }
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

  const fn = new Function('$', '$input', node.parameters.jsCode);
  return fn(mock$, { item: { json: historyData } });
}

console.log('=== TEST 1: Camilo dice "Hola" ===');
const res1 = executeCerebro('Hola', null);
console.log(res1.responseText.substring(0, 160) + '...\n');

console.log('=== TEST 2: Camilo responde "4" (después del Paso 1) ===');
const res2 = executeCerebro('4', '✦ *VIDEM | Private Tech Concierge*\nPaso 1 de 3: ¿Qué pantalla o televisor principal usarás?');
console.log(res2.responseText.substring(0, 160) + '...\n');

console.log('=== TEST 3: Camilo responde "1" (después del Paso 2) ===');
const res3 = executeCerebro('1', '✦ *VIDEM | Diagnóstico Técnico (Paso 2 de 3)* ⚡\nPaso 2 de 3: ¿Qué tipo y velocidad de internet tienes en casa?');
console.log(res3.responseText.substring(0, 160) + '...\n');

console.log('=== TEST 4: Camilo responde "1" (después del Paso 3) ===');
const res4 = executeCerebro('1', '✦ *VIDEM | Diagnóstico Técnico (Paso 3 de 3)* 🔊\nPaso 3 de 3: ¿Cómo disfrutas el audio en tu sala de cine?');
console.log(res4.responseText.substring(0, 200) + '...\n');

console.log('=== TEST 5: Camilo envía respuesta compuesta con todo a la vez ===');
const res5 = executeCerebro('1 tv box xiaomi 3gen\n2 fibra óptica 500 megas\n3 barra de sonido lg', 'Paso 1 de 3...');
console.log(res5.responseText.substring(0, 200) + '...\n');
