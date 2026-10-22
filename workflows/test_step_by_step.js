const fs = require('fs');
const path = require('path');

const workflow = JSON.parse(fs.readFileSync(path.join(__dirname, 'n8n_videm_whatsapp_bot.json'), 'utf8'));
const node = workflow.nodes.find(n => n.id === 'node-cerebro');
const fn = new Function('$input', node.parameters.jsCode);

console.log('--- TEST 1: Saludo Inicial ---');
let res1 = fn({ item: { json: { data: { key: { remoteJid: '573015568904@s.whatsapp.net' }, pushName: 'Camilo', message: { conversation: 'Hola' } } } } });
console.log('Respuesta 1:\n', res1.responseText + '\n');

console.log('--- TEST 2: Usuario responde Paso 1 con numero 4 (Xiaomi Box) ---');
let res2 = fn({ item: { json: { data: { key: { remoteJid: '573015568904@s.whatsapp.net' }, pushName: 'Camilo', message: { conversation: '4' } } } } });
console.log('Respuesta 2:\n', res2.responseText + '\n');

console.log('--- TEST 3: Usuario responde Paso 2 con numero 1 (Fibra 500) ---');
let res3 = fn({ item: { json: { data: { key: { remoteJid: '573015568904@s.whatsapp.net' }, pushName: 'Camilo', message: { conversation: '1' } } } } });
console.log('Respuesta 3:\n', res3.responseText + '\n');

console.log('--- TEST 4: Usuario responde Paso 3 con numero 1 (Barra Dolby Atmos) ---');
let res4 = fn({ item: { json: { data: { key: { remoteJid: '573015568904@s.whatsapp.net' }, pushName: 'Camilo', message: { conversation: '1' } } } } });
console.log('Respuesta 4 (Calificación Exitosa):\n', res4.responseText + '\n');

console.log('--- TEST 5: Prueba con el mensaje exacto compuesto que envió Camilo ---');
delete global.videmUserSessions['573015568904'];
let res5 = fn({ item: { json: { data: { key: { remoteJid: '573015568904@s.whatsapp.net' }, pushName: 'Camilo', message: { conversation: '1 tv box xiaomi 3gen\n2 fibra óptica 500 megas\n3 barra de sonido lg' } } } } });
console.log('Respuesta 5 (Calificación Compuesta):\n', res5.responseText + '\n');
