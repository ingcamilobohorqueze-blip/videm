# Manual de Identidad de Marca y Sistema de Diseño: VIDEM

## 1. Misión y Posicionamiento
**VIDEM** es un servicio de *Tech Concierge* y optimización telemática privada para el entretenimiento audiovisual en el hogar. No vendemos piratería barata ni listas m3u inestables: entregamos **la fidelidad de un disco físico 4K con la inmediatez de una nube privada dedicada**.

* **Arquetipo de Marca:** El Conserje Tecnológico / El Ingeniero Cinematográfico.
* **Tono de Voz:** Seguro, minimalista, técnico-sofisticado, sobrio y exclusivo.

---

## 2. Paleta de Color Institucional

La paleta se deriva de las facetas prismáticas del isotipo de VIDEM (Cyan Eléctrico, Violeta Profundo e Índigo de Alta Velocidad), optimizada tanto para Modo Oscuro (*Obsidian Cinema*) como para Modo Claro (*Pure Studio*).

| Nombre | HEX (Dark) | HEX (Light) | Función / Aplicación |
| :--- | :--- | :--- | :--- |
| **Obsidian Void** | `#07090E` | `#F8FAFC` | Fondo principal (Canvas) |
| **Surface Glass** | `rgba(18, 22, 34, 0.7)` | `rgba(255, 255, 255, 0.8)` | Tarjetas y contenedores con desenfoque de fondo |
| **Prism Cyan** | `#00E5FF` | `#0077B6` | Acento principal, glow, estados activos, alta velocidad |
| **Electric Indigo** | `#6366F1` | `#4F46E5` | Gradientes, botones primarios, enlaces de fidelidad |
| **Deep Violet** | `#7928CA` | `#6D28D9` | Sombras prismáticas, bordes sutiles y acentos de audio |
| **Text Primary** | `#FFFFFF` | `#0F172A` | Títulos principales (H1, H2, H3) |
| **Text Muted** | `#94A3B8` | `#475569` | Párrafos, subtítulos técnicos y notas de apoyo |
| **Status Green** | `#10B981` | `#059669` | Indicador de servidores CDN activos y validaciones |

---

## 3. Tipografía
* **Familia Primaria:** `Plus Jakarta Sans` (Google Fonts). Elegida por su geometría limpia, legibilidad superior en pantallas OLED/4K y carácter moderno.
* **Familia Secundaria / Técnica:** `Space Grotesk` (Google Fonts). Usada para métricas, badges técnicos (4K Remux, Dolby Atmos, Mbps) y micro-indicadores.

---

## 4. Arquitectura del Embudo y Conexión con n8n (WhatsApp)

La landing page funciona como un embudo unidireccional (*One-Way Funnel*):
1. **Punto de Entrada:** Landing Page en web o móvil.
2. **Punto de Calificación:** Verificación de Smart TV y Fibra Óptica (interactiva y en los CTAs).
3. **Punto de Conversión:** Redirección directa hacia la API de WhatsApp (`https://wa.me/<numero>?text=<mensaje_codificado>`).
4. **Recepción en n8n:**
   * El webhook de WhatsApp (Meta Cloud API / Baileys / Evolution API) recibe el mensaje entrante.
   * El flujo de n8n identifica el disparador por el texto predeterminado:
     * *Trigger 1:* `"Hola, quiero validar si mi equipo es compatible con Videm"` ➔ Dispara el flujo de **Diagnóstico Técnico Guiado**.
     * *Trigger 2:* `"Hola, cumplo con los requisitos técnicos (Smart TV y Fibra Óptica)..."` ➔ Dispara el flujo de **Agendamiento y Aprovisionamiento**.
     * *Trigger 3:* `"Hola, soy cliente de Videm y deseo gestionar mi renovación"` ➔ Dispara el flujo del **Portal de Clientes / Renovación**.
