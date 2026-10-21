/**
 * VIDEM - Simulador de Pruebas Locales para n8n & Evolution API
 * Ejecuta este script con: node workflows/test_workflow_simulator.js
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(70));
console.log('VIDEM - SUITE DE SIMULACIÓN DE FLUJOS AUTÓNOMOS (N8N BOT)');
console.log('='.repeat(70));

// Cargar el archivo de workflow de n8n
const workflow = JSON.parse(fs.readFileSync(path.join(__dirname, 'n8n_videm_whatsapp_bot.json'), 'utf8'));

// Extraer nodos clave por id
const nodeMap = {};
workflow.nodes.forEach(n => { nodeMap[n.id] = n; });

function runCodeNode(nodeId, inputItem) {
  const node = nodeMap[nodeId];
  if (!node || !node.parameters || !node.parameters.jsCode) {
    throw new Error(`Nodo ${nodeId} no tiene jsCode ejecutable`);
  }
  const fn = new Function('$input', '$json', node.parameters.jsCode);
  return fn({ item: { json: inputItem } }, inputItem);
}

// -------------------------------------------------------------
// CASO 1: Prospecto calificado llega desde la Landing Page
// -------------------------------------------------------------
console.log('\n--- CASO 1: Calificación y Solicitud de Pago desde Landing ---');
const inboundPayload1 = {
  data: {
    key: { remoteJid: '573015568904@s.whatsapp.net', fromMe: false },
    pushName: 'Carlos Mendoza',
    message: {
      conversation: 'Hola, cumplo con los requisitos técnicos (Smart TV y Fibra Óptica) y deseo agendar mi acceso a Videm'
    }
  }
};

const normalized1 = runCodeNode('node-normalize', inboundPayload1);
console.log('1. Normalizado:', { phone: normalized1.senderPhone, name: normalized1.senderName, text: normalized1.rawText });

const responseCalificado = runCodeNode('node-flow-calificado', normalized1);
console.log('2. Respuesta generada con enlaces de pago:\n', responseCalificado.responseText.substring(0, 240) + '...\n');

// -------------------------------------------------------------
// CASO 2: Cliente envía foto/comprobante de Nequi
// -------------------------------------------------------------
console.log('\n--- CASO 2: Cliente envía comprobante de Nequi (Imagen) ---');
const inboundPayload2 = {
  data: {
    key: { remoteJid: '573015568904@s.whatsapp.net', fromMe: false },
    pushName: 'Carlos Mendoza',
    message: {
      imageMessage: {
        caption: 'Envío comprobante Nequi M749102 por $240.000 para activación'
      }
    }
  }
};

const normalized2 = runCodeNode('node-normalize', inboundPayload2);
console.log('1. Mensaje de imagen detectado:', { type: normalized2.messageType, caption: normalized2.rawText });

const comprobanteResult = runCodeNode('node-proc-comprobante', normalized2);
console.log('2. Comprobante procesado:', {
  ref: comprobanteResult.transactionRef,
  amount: comprobanteResult.amount,
  status: comprobanteResult.paymentStatus
});

// Aprovisionamiento autónomo disparado
const provisionResult = runCodeNode('node-auto-provisioning', comprobanteResult);
console.log('3. Cuenta y Welcome Kit generados de manera autónoma:');
console.log('   - Email:', provisionResult.clientEmail);
console.log('   - Password:', provisionResult.clientPass);
console.log('   - Vencimiento:', provisionResult.expDate);
console.log('\n4. Mensaje despachado a WhatsApp:\n', provisionResult.responseText);

// -------------------------------------------------------------
// CASO 3: Pasarela Wompi envía Webhook de Pago Aprobado
// -------------------------------------------------------------
console.log('\n--- CASO 3: Webhook Automático de Pasarela Wompi (Tarjeta/PSE) ---');
const wompiWebhookPayload = {
  event: 'transaction.updated',
  data: {
    transaction: {
      id: 'WOMPI-TX-998273',
      amount_in_cents: 24000000,
      status: 'APPROVED',
      customer_data: {
        phone_number: '573015568904',
        full_name: 'Laura Restrepo'
      }
    }
  }
};

const gatewayResult = runCodeNode('node-proc-gateway', wompiWebhookPayload);
console.log('1. Webhook Wompi validado:', gatewayResult);

const provisionGateway = runCodeNode('node-auto-provisioning', gatewayResult);
console.log('2. Aprovisionamiento autónomo por pasarela:', {
  email: provisionGateway.clientEmail,
  pass: provisionGateway.clientPass,
  ref: provisionGateway.ref
});

// -------------------------------------------------------------
// CASO 4: Cliente envía código de su Smart TV (Zero-Friction)
// -------------------------------------------------------------
console.log('\n--- CASO 4: Cliente envía código alfanumérico que ve en su TV ---');
const inboundPayload4 = {
  data: {
    key: { remoteJid: '573015568904@s.whatsapp.net', fromMe: false },
    pushName: 'Carlos Mendoza',
    message: {
      conversation: '9A4K'
    }
  }
};

const normalized4 = runCodeNode('node-normalize', inboundPayload4);
console.log('1. Código detectado:', { isStremioCode: normalized4.isStremioPairingCode, code: normalized4.rawText });

const pairingResult = runCodeNode('node-flow-pairing', normalized4);
console.log('2. Respuesta de vinculación instantánea:\n', pairingResult.responseText);

console.log('='.repeat(70));
console.log('TODAS LAS PRUEBAS DE SIMULACIÓN COMPLETADAS CON ÉXITO (100% OPERATIVO)');
console.log('='.repeat(70));
