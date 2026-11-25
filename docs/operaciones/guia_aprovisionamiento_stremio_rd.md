# Protocolo Operativo de Aprovisionamiento Llave en Mano: VIDEM

Este documento detalla el procedimiento estándar (SOP) para activar y entregar el servicio a un nuevo cliente en **menos de 3 minutos**, garantizando cero fricción técnica para el usuario.

---

## 1. Stack Técnico de Configuración Maestra

Cada perfil de cliente en **VIDEM** se configura bajo los siguientes parámetros de alta fidelidad:

### A. Capa de Cuenta y Privacidad
1. Se crea o asocia una cuenta de Stremio gestionada con credenciales limpias (`cliente_id@videm.private`).
2. Se genera el API Key en Real-Debrid correspondiente al período contratado (Semestral o Anual).

### B. Addon Primario: Torrentio (Optimizado para CDN Debrid)
* **Provider:** Real-Debrid vinculado mediante API Token.
* **Resolución Máxima:** 4K (Ultra HD).
* **Filtros de Exclusión:**
  * Excluir resoluciones menores a 720p.
  * Excluir fuentes CAM / TeleSync / Screener.
  * Priorizar códecs HEVC / H.265 / AV1 y contenedores MKV Remux con metadatos Dolby Vision (Perfiles 5 y 8) y HDR10+.
* **Idiomas de Audio Prioritarios:** Spanish (Latino), Spanish (Castellano), English (para puristas con subtítulos).

### C. Addon de Respaldo (Failover)
* **Comet o MediaFusion:** Preconfigurado con el mismo token de Real-Debrid para actuar en caso de indisponibilidad temporal del proveedor de scraping primario.

### D. Curaduría de Catálogos (Interfaz Tipo Streaming Oficial)
* **Cyberflix Catalog / Streaming Catalogs:**
  * Configurado para desplegar filas dinámicas: *Top Tendencias Netflix, Estrenos Disney+, Novedades HBO Max, Lo Más Visto en Prime Video, Cine Apple TV+*.
* **Cinemeta:** Depurado para evitar duplicidad de títulos en el feed principal.

### E. Subtítulos (Sincronización Automática)
* **OpenSubtitles v3 + SubDL / SubSource:** Idioma predeterminado: Español (Neutro/Latinoamérica o Castellano según región).
* **Regla de oro para evitar desfase de tiempos:**
  1. Indicar al cliente elegir primero los subtítulos **Embedded / Integrados** (aparecen al inicio de la lista en Stremio; vienen dentro del propio MKV y nunca se desincronizan).
  2. Si no hay embebidos, usar los de **SubDL / OpenSubtitles v3** emparejados al mismo release (`BluRay` vs `WEB-DL`). El addon `VIDEM 4K Cinema v1.6.0` prioriza releases estándar con `filename` intacto para maximizar la sincronización automática.

### F. Parámetros del Motor de Reproducción (Audio / Video)
* **Motor Predeterminado (Android TV / Fire TV):** **`ExoPlayer (EXO)`** obligatorio.
  * *Motivo operativo:* ExoPlayer gestiona la decodificación por hardware nativo de pistas **Dolby Digital (AC3)**, **E-AC3** y **Dolby Atmos/Vision**, evitando los bloqueos y silencios de software que presenta VLC en contenedores MKV de Smart TVs modernos.
* **Paso de audio (Audio Passthrough):** `Desactivado (Off)` por defecto para altavoces de TV integrados.

---

## 1.5. Matriz de Resolución Técnica en Smart TVs (LG webOS / Samsung / Android TV)

| Síntoma en Smart TV | Causa Técnica Real | Resolución VIDEM |
| :--- | :--- | :--- |
| **No reproduce / pantalla negra en LG webOS** (pero sí funciona en PC) | Archivo MKV con **Dolby Vision sin fallback HDR10**, audio **DTS-HD MA / TrueHD** o Remux >35 GB. LG webOS no soporta DV en MKV ni DTS en la mayoría de modelos recientes. | Seleccionar la opción etiquetada **`• COMPATIBLE`** o **`⚡ Calidad Media / Alta Compatibilidad`** (WEB-DL / BluRay con EAC3/AC3/AAC). |
| **No guarda memoria y barra de adelantar/atrasar bloqueada en LG** | Stream servido vía proxy (ej. Comet) o contenedor sin tabla `Cues`/`moov` o sin `Accept-Ranges`. | `VIDEM v1.6.0` prioriza enlaces directos Real-Debrid (`torrentio.strem.fun`) arriba. Si ocurre en un título puntual, cambiar a la siguiente opción **`• COMPATIBLE`**. |
| **Subtítulos desfasados** | Diferencia de framerate (24 fps BluRay vs 25 fps PAL europeo) o subtítulo genérico por IMDb ID. | Elegir subtítulos **Embedded (Integrados)** primero, o usar **SubDL** emparejado al release. |
| **Error de carga simultánea en cuenta Demo** | Uso de la misma cuenta Real-Debrid desde 2 IPs distintas al mismo tiempo (ej. Colombia y España). | Nunca reproducir simultáneamente desde dos ubicaciones con la misma API Key de Real-Debrid. |

---

## 1.6. Plan B (Venta Cruzada): Hardware Recomendado para Smart TVs Restrictivos

Cuando el cliente tiene un televisor antiguo (sin Stremio en tienda) o un **LG webOS / Samsung Tizen** que limita Dolby Vision/DTS/Remux de alto bitrate, ofrecer un dispositivo dedicado convierte un problema técnico en una **venta cruzada llave en mano** (se entrega ya configurado y enlazado):

| Dispositivo | Perfil Ideal | Fortalezas Clave para VIDEM | Limitaciones | Precio Ref. (USD / EUR) |
| :--- | :--- | :--- | :--- | :--- |
| **Amazon Fire TV Stick 4K Max (2da Gen)** *(Recomendado #1 Masivo)* | Mayoría de clientes (CO / ES / US) | Wi-Fi 6E, 16 GB, **Dolby Vision + HDR10+ + Dolby Atmos**, decodifica casi todo con ExoPlayer, muy conocido y fácil de vender. | Requiere sideload rápido de Stremio (2 min vía Downloader) y capa de anuncios de Amazon. | ~$55–60 USD / ~60–70 € |
| **Onn 4K Pro (Walmart / Google TV)** *(Mejor relación calidad-precio US/CO)* | Clientes en USA y Colombia (importación) | Google TV limpio (Stremio directo en Play Store), **3 GB RAM + 32 GB**, Ethernet, Wi-Fi 6, Dolby Vision + Atmos. | Disponibilidad limitada en España (en Europa existe su gemelo **Thomson Streaming Box Plus 270**). | ~$50 USD (US) / ~99 € (Thomson ES) |
| **Google TV Streamer 4K** *(Recomendado #1 Premium ES/US)* | Clientes exigentes / TVs OLED LG y Samsung | **4 GB RAM + 32 GB**, Ethernet Gigabit, Google TV nativo (Play Store oficial), muy fluido para catálogos pesados. | Precio más alto que un stick; no hace passthrough TrueHD nativo. | ~$99 USD / ~119 € |
| **Xiaomi TV Box S (2da / 3ra Gen)** *(Alternativa conocida)* | Clientes que ya lo conocen o presupuesto ajustado | Google TV oficial (Play Store), económico y fácil de conseguir en Colombia y España. | Solo **2 GB RAM / 8 GB** (en 2da Gen), sin puerto Ethernet nativo; con Remux muy pesados (>50 GB) puede quedarse corto de RAM/caché. | ~$55–65 USD / ~55–65 € |
| **Nvidia Shield TV Pro** *(Tope de gama audiófilo)* | Home Cinema con barra Atmos / AVR dedicado | Decodifica **TODO** (Remux 80 Mbps, TrueHD Atmos, DTS-HD MA, DV). | Costoso (~$200 USD / ~219 €) y hardware de varios años. | ~$200 USD / ~219 € |

> [!TIP]
> **Modelo de Cross-Sell VIDEM ("VIDEM Box Ready"):** Comprar el dispositivo (ej. **Fire TV Stick 4K Max** o **Google TV Streamer / Thomson 270**), preconfigurarlo en oficina con Stremio + cuenta VIDEM + ExoPlayer calibrado y entregarlo al cliente con un margen de instalación/concierge (+20% a +30%). El cliente solo lo conecta al HDMI y al Wi-Fi.

---

## 2. El Proceso de Entrega Llave en Mano (Zero-Friction Login)

El cliente **nunca debe escribir correos ni contraseñas complejas** con el mando a distancia del televisor.

### Procedimiento en 3 Pasos:
1. **Instalación:** El cliente descarga Stremio desde la tienda oficial de su Smart TV (LG Content Store, Samsung Smart Hub, Google Play Store o Fire TV).
2. **Generación de Código:** El cliente abre la aplicación y selecciona la opción **"Iniciar sesión con código QR o enlace web"** (esto muestra un código alfanumérico corto y un QR en su televisor).
3. **Sincronización Inmediata:**
   * El cliente envía una foto del código a WhatsApp VIDEM, o ingresa al enlace directo `stremio.com/link`.
   * El operador VIDEM ingresa el código en el panel maestro de VIDEM.
   * **¡Listo!** En 2 segundos, el televisor del cliente se actualiza automáticamente con todo el catálogo, los addons, el enlace CDN privado y las carátulas en 4K.

---

## 3. Mensaje de Bienvenida y Entrega del Welcome Kit Digital

Una vez sincronizado el televisor, el bot o conserje envía a WhatsApp:

```text
✦ ¡Felicidades, [Nombre]! Tu pantalla ya está enlazada al estándar VIDEM.

Tu televisor ha quedado optimizado con nuestra red CDN privada:
🎬 Catálogo completo unificado en tu pantalla principal.
⚡ Bitrate 40-80 Mbps Remux habilitado.
🔊 Audio espacial Dolby Atmos / Dolby Vision activo.

💡 Consejos rápidos de uso:
1. Al pulsar sobre cualquier película o serie, verás en la parte superior las opciones con la etiqueta [RD+]. Estas son las fuentes directas de tu CDN de alta velocidad.
2. Si tu televisor está conectado por Wi-Fi, asegúrate de utilizar la banda 5 GHz para obtener la máxima estabilidad.
3. Recuerda que tu enlace está blindado para uso exclusivo en tu red doméstica.

Estamos a tu disposición en este mismo chat para cualquier consulta técnica. ¡Que disfrutes la función!
```
