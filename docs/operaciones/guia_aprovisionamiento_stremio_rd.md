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

### E. Subtítulos
* **OpenSubtitles v3 + Subsource:** Idioma predeterminado: Español (Neutro/Latinoamérica).

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
