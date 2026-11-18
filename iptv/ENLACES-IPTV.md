# 🔗 Enlaces Maestros IPTV — TV Box & Mini PC (Windows 11)

Aquí tienes todos los enlaces centralizados y listos para copiar y pegar tanto en el **TV Box (TiviMate / Televizo)** como en el **Mini PC (Windows 11)**.

---

## 1. 📺 Lista Principal Fusionada (TREX VIP + Respaldo Directo Colombia)
Incluye toda tu parrilla seleccionada en [`PARRILLA-CANALES.md`](file:///c:/Users/Usuario/Documents/Proyectos%20Antigravity/VIDEM/iptv/PARRILLA-CANALES.md) (Nacionales, Deportes, Cine/HBO, Documentales/ID, Infantiles/Anime, Canales 24/7 COPS/Cámaras Escondidas y Eventos PPV en vivo) con auto-curación automática de enlaces:

* **URL Lista M3U Principal (Modo TS Estándar):**
  ```text
  https://videm.tv/api/trex
  ```
* **URL Lista M3U Principal (Modo HLS `.m3u8` uniforme — Evita cierres en MyIPTV Player al cambiar de canal):**
  ```text
  https://videm.tv/api/trex?output=hls
  ```

---

## 2. 🇨🇴 Lista Independiente de Respaldo Colombia (`co.m3u` — TDT + ESPN + Cable)
No pasa por el servidor de TREX (no consume tu conexión simultánea de TREX y sirve como respaldo independiente):

* **URL Lista M3U Colombia Optimizada (Con Logos y EPG corregidos desde nuestro servidor):**
  ```text
  https://videm.tv/api/trex?lista=co
  ```
* **URL Lista M3U Colombia Original (Repositorio Público `iptv-org`):**
  ```text
  https://iptv-org.github.io/iptv/countries/co.m3u
  ```

---

## 3. 📅 Guía de Programación Unificada (EPG / EDT en XML Puro)
Esta única URL descomprimida sirve **al mismo tiempo para la lista de TREX y para la lista `co.m3u` de Colombia** (reemplaza al antiguo enlace `mi.tv.epg.xml` que quedó fuera de línea en GitHub):

* **URL EPG XML Unificada (Para MyIPTV Player en Windows 11 y TiviMate):**
  ```text
  https://videm.tv/api/trex?epg=xml
  ```
* **URL EPG Comprimida `.gz` (Opcional solo para TiviMate en TV Box):**
  ```text
  https://epgshare01.online/epgshare01/epg_ripper_CO1.xml.gz
  ```

---

## 4. 🤖 Endpoint de Auditoría y Auto-Curación (Para n8n / Monitoreo)
Verifica en vivo qué canales de TREX o de Colombia están activos y cuáles entraron en *failover* automático:

* **URL de Diagnóstico JSON (Para flujo programado en n8n):**
  ```text
  https://videm.tv/api/trex?audit=json
  ```

---

## 5. 🔑 Credenciales Crudas Servidor TREX (Referencia Contrato 90 Días)
* **Servidor / Host:** `http://line.prim01.com:80`
* **Usuario:** `493da0239d`
* **Contraseña:** `69b4dd0ebc7f`
* **Vencimiento:** `2027-02-04` (`1` conexión activa simultánea)
