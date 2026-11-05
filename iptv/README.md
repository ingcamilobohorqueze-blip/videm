# 📺 Módulo Independiente IPTV — TREX (Contrato 90 Días)

Esta carpeta concentra **toda la configuración, credenciales, curaduría de parrilla y herramientas de diagnóstico de IPTV (TREX)** de forma **100% independiente** del ecosistema de cine bajo demanda de VIDEM (Stremio + Real-Debrid).

Cualquier ajuste de canales, categorías, orden de parrilla, EPG o credenciales de TV en vivo se realiza exclusivamente dentro de este directorio (`iptv/`).

---

## 1. Estado del Contrato y Suscripción Activa (90 Días)

| Parámetro | Valor Oficial |
| :--- | :--- |
| **Proveedor** | **TREX IPTV** |
| **Tipo de Cuenta** | Oficial Pagada (`is_trial: 0` — Plan Trimestral 90 Días) |
| **Estado Actual** | 🟢 `Active` |
| **Fecha de Activación** | `2026-11-03` |
| **Fecha de Vencimiento** | `2027-02-04` (92 días de cobertura total) |
| **Conexiones Simultáneas** | `1` conexión activa permitida |

---

## 2. Credenciales y Enlaces de Conexión

### A. Enlace M3U Curado (Parrilla Limpia Colombia + Deportes + Cine + ID)
Filtra automáticamente los +30.000 canales globales del servidor TREX para dejar únicamente la parrilla hispana/colombiana organizada por grupos limpios y con guía EPG inyectada en cabecera:
* **URL Lista M3U Curada:** `https://videm.tv/api/trex`
* **URL Guía EPG (XMLTV):** `http://line.prim01.com:80/xmltv.php?username=493da0239d&password=69b4dd0ebc7f`

### B. Conexión Directa Xtream Codes (Para TiviMate / IPTV Smarters Pro / Televizo)
Si prefieres iniciar sesión por API Xtream Codes directamente en la app del televisor:
* **Servidor / Host URL:** `http://line.prim01.com:80`
* **Usuario:** `493da0239d`
* **Contraseña:** `69b4dd0ebc7f`

### C. Enlace M3U Completo Sin Filtrar (Raw Server)
* **URL M3U Plus (TS):** `http://line.prim01.com:80/get.php?username=493da0239d&password=69b4dd0ebc7f&type=m3u_plus&output=ts`

---

## 3. Arquitectura de Archivos en `/iptv`

1. **[`iptv/config.js`](file:///c:/Users/Usuario/Documents/Proyectos%20Antigravity/VIDEM/iptv/config.js)**
   Archivo maestro con las credenciales de TREX, fechas de vigencia del contrato de 90 días, URLs de EPG y mapa de categorías del servidor (`154 = LAT| COLOMBIA`, `151 = LAT| MEXICO`, `152 = LAT| ARGENTINA`, `166 = LAT| CULTURA / DOCU`, etc.).
2. **[`iptv/curated-m3u.js`](file:///c:/Users/Usuario/Documents/Proyectos%20Antigravity/VIDEM/iptv/curated-m3u.js)**
   Motor que filtra y construye la lista M3U limpia organizada en 6 grupos:
   * `🕵️ Cultura & ID` (*Investigation Discovery HD*, *ID US/LAT*)
   * `🇨🇴 Colombia (Nacionales & TDT)` (*Caracol, RCN, Win Sports+, Dsports, Citytv, Señal Colombia, Canal 1*)
   * `⚽ Deportes VIP (Parrilla Total)` (*Win Sports+, Dsports, ESPN 1-7, Fox Sports, Claro Sports, TyC, TUDN, DAZN, F1, LaLiga, Premier*)
   * `🎬 Cine & Series (DirecTV / Claro)` (*HBO, Universal, Star Channel, Warner, Sony, Space, TNT, AXN, Cinecanal, Paramount*)
   * `🌍 Documentales & Ciencia` (*Discovery, History, Nat Geo, Animal Planet, TLC*)
   * `🧒 Infantiles` (*Disney, Cartoon Network, Nickelodeon*)
3. **[`iptv/audit-channels.js`](file:///c:/Users/Usuario/Documents/Proyectos%20Antigravity/VIDEM/iptv/audit-channels.js)**
   Script de consola para consultar en vivo los días restantes de los 90 días contratados, conexiones activas y buscar canales por nombre:
   ```powershell
   # Ver estado de cuenta y días restantes:
   node iptv/audit-channels.js

   # Buscar un canal específico en el servidor TREX:
   node iptv/audit-channels.js "win sports"
   ```
4. **Puente Serverless ([`api/trex.js`](file:///c:/Users/Usuario/Documents/Proyectos%20Antigravity/VIDEM/api/trex.js))**
   Archivo ligero de 3 líneas que redirige las peticiones de `https://videm.tv/api/trex` hacia `iptv/curated-m3u.js` para mantener compatibilidad en producción sin mezclar el código de IPTV con VIDEM.
