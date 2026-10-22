# Guía Maestra: Configuración de n8n, Evolution API y Pagos Autónomos en VIDEM

Esta guía describe la puesta en marcha técnica para lograr que el flujo de WhatsApp de **VIDEM** opere en modo **100% autónomo**: calificación, envío de enlaces de pago, verificación de transacciones y entrega inmediata de credenciales maestras y enlace de televisor.

---

## 1. Arquitectura del Sistema

```
                    ┌─────────────────────────┐
                    │ Landing Web (videm.tv)  │
                    └───────────┬─────────────┘
                                │ Click a WhatsApp
                                ▼
                    ┌─────────────────────────┐
                    │   WhatsApp del Cliente  │
                    └───────────┬─────────────┘
                                │ Mensajes / Comprobantes
                                ▼
                    ┌─────────────────────────┐
                    │      Evolution API      │
                    │   (Conexión vía QR)     │
                    └───────────┬─────────────┘
                                │ Webhook HTTP POST
                                ▼
 ┌──────────────────┐       ┌─────────────────────────┐       ┌────────────────────────┐
 │ Pasarela Wompi   │──────▶│      Workflow n8n       │──────▶│   Google Sheets CRM    │
 │ (Webhook Pagos)  │       │  (Triaje, OCR, Cuentas) │       │ (Clientes & Inventario)│
 └──────────────────┘       └───────────┬─────────────┘       └────────────────────────┘
                                        │ Respuesta Outbound
                                        ▼
                            ┌─────────────────────────┐
                            │    Welcome Kit VIP      │
                            │  (Credenciales + Código)│
                            └─────────────────────────┘
```

---

## 2. Configurar Evolution API con WhatsApp

Evolution API es el motor de conexión más estable y ligero para vincular WhatsApp a n8n sin costos por mensaje de Meta.

### A. Despliegue Rápido (Docker / VPS / Local)
Si ejecutas Evolution API en Docker:
```bash
docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY="videm-secret-key-2026" \
  -v evolution_instances:/evolution/instances \
  atendai/evolution-api:latest
```

### B. Crear la Instancia y Vincular el Teléfono
1. **Crear Instancia:**
   ```bash
   curl -X POST "http://localhost:8080/instance/create" \
     -H "apikey: videm-secret-key-2026" \
     -H "Content-Type: application/json" \
     -d '{
       "instanceName": "videm-prod",
       "token": "videm-token-9988",
       "qrcode": true
     }'
   ```
2. **Obtener el QR de Conexión:**
   Abre en tu navegador `http://localhost:8080/instance/connect/videm-prod` y escanea el código QR desde tu app de WhatsApp en el teléfono oficial (+57 301 556 8904) en **Dispositivos Vinculados**.

3. **Configurar el Webhook hacia n8n:**
   Indica a Evolution API que envíe cada mensaje entrante a tu URL de webhook en n8n:
   ```bash
   curl -X POST "http://localhost:8080/webhook/set/videm-prod" \
     -H "apikey: videm-secret-key-2026" \
     -H "Content-Type: application/json" \
     -d '{
       "enabled": true,
       "url": "https://tu-n8n.dominio.com/webhook/videm-whatsapp-webhook",
       "webhook_by_events": false,
       "events": [
         "MESSAGES_UPSERT"
       ]
     }'
   ```

---

## 3. Configuración de Medios de Pago Oficiales (SumUp & Bancolombia)

VIDEM utiliza dos canales de recaudación directos y libres de fricción:

1. **SumUp (Tarjetas de Crédito/Débito y PSE):**
   - **Plan Semestral (6 meses - $240.000 COP):** `https://pay.sumup.com/b2c/X4ODXUPY9G`
   - **Plan Anual (12 meses - $440.000 COP):** `https://pay.sumup.com/b2c/X9P4DBUZ42`
   - *Ventajas:* Acreditación inmediata, antifraude integrado, permite pago con cualquier tarjeta de crédito/débito o cuenta bancaria PSE.

2. **Transferencia Directa Bancolombia:**
   - **Cuenta de Ahorros:** `03202411001`
   - **Titular:** Camilo Andrés Bohórquez Enciso
   - **C.C.:** 80.257.729
   - *Compatibilidad:* Recibe sin costo desde Bancolombia, Nequi y Transfiya.

### Aspectos Fiscales y RUT (DIAN)
- **Clasificación del Servicio:** VIDEM presta servicios de **consultoría técnica especializada, aprovisionamiento de infraestructura privada y curaduría multimedia**, no radiodifusión ni retransmisión televisiva tradicional.
- **Código de Actividad Económica CIIU recomendado en el RUT:**
  - **6202:** *Actividades de consultoría informática y actividades de administración de instalaciones informáticas*.
  - **6209:** *Otras actividades de tecnologías de información y servicios de computación*.
- **Régimen de IVA:** Como Persona Natural con ingresos anuales inferiores a 3.500 UVT (~$165.000.000 COP en 2026), operas bajo la condición de **No Responsable de IVA** (antiguo Régimen Simplificado, Código de Responsabilidad 49 en el RUT). No requieres cobrar IVA a los clientes finales.

---

## 4. Importar el Flujo en n8n

1. En tu servidor de **n8n**, pulsa **Add Workflow** ➔ **Import from File...**
2. Selecciona el archivo:
   [workflows/n8n_videm_whatsapp_bot.json](file:///c:/Users/Usuario/Documents/Proyectos%20Antigravity/VIDEM/workflows/n8n_videm_whatsapp_bot.json).
3. Configura tus Variables de Entorno en n8n (o dentro del nodo HTTP Request):
   - `EVOLUTION_API_URL`: `http://localhost:8080` (o la IP/URL de tu servidor).
   - `EVOLUTION_API_KEY`: Tu clave secreta (`videm-secret-key-2026`).
   - `EVOLUTION_INSTANCE_NAME`: `videm-prod`.
   - `GOOGLE_SHEET_ID`: El ID de tu hoja creada en [plantilla_google_sheets_videm.md](file:///c:/Users/Usuario/Documents/Proyectos%20Antigravity/VIDEM/docs/operaciones/plantilla_google_sheets_videm.md).
4. Haz clic en **Activate** (toggle verde superior) para dejar el bot escuchando 24/7.

---

## 5. Pruebas Locales con Simuladores (cURL)

Puedes probar todo el circuito antes de conectar WhatsApp en vivo:

### Prueba 1: Simular Mensaje de Calificación desde la Landing
```bash
curl -X POST "http://localhost:5678/webhook-test/videm-whatsapp-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "key": {
        "remoteJid": "573015568904@s.whatsapp.net",
        "fromMe": false
      },
      "pushName": "Camilo",
      "message": {
        "conversation": "Hola, cumplo con los requisitos técnicos (Smart TV y Fibra Óptica) y deseo agendar mi acceso a Videm"
      }
    }
  }'
```
*Resultado Esperado:* n8n responde con el menú de precios ($240.000 COP / $60 USD) y el enlace de pago Wompi + Nequi.

---

### Prueba 2: Simular Envío de Comprobante Nequi
```bash
curl -X POST "http://localhost:5678/webhook-test/videm-whatsapp-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "key": {
        "remoteJid": "573015568904@s.whatsapp.net",
        "fromMe": false
      },
      "pushName": "Camilo",
      "message": {
        "imageMessage": {
          "caption": "Adjunto comprobante Nequi M928374 por $240.000"
        }
      }
    }
  }'
```
*Resultado Esperado:* n8n extrae la referencia `M928374`, genera las credenciales maestras de Stremio, registra al cliente en Google Sheets y envía el **Welcome Kit** con instrucciones para vincular el televisor.

---

### Prueba 3: Simular Aprobación de Pasarela de Pagos (Wompi)
```bash
curl -X POST "http://localhost:5678/webhook-test/videm-payment-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "transaction.updated",
    "data": {
      "transaction": {
        "id": "WOMPI-TEST-88120",
        "amount_in_cents": 24000000,
        "status": "APPROVED",
        "customer_data": {
          "phone_number": "573015568904",
          "full_name": "Camilo Bohorquez"
        }
      }
    }
  }'
```
*Resultado Esperado:* n8n emite la cuenta de inmediato y dispara el mensaje de bienvenida a WhatsApp sin intervención humana.
