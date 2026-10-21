# Estructura y Plantilla de Google Sheets: Base de Datos VIDEM

Esta plantilla define la estructura exacta recomendada para conectar tu hoja de cálculo de **Google Sheets** con el flujo de **n8n** y actuar como la base de datos operativa de **VIDEM** (Clientes, Inventario de Licencias y Registro de Pagos).

---

## 1. Crear el Libro en Google Drive
1. Crea una nueva hoja de cálculo en Google Sheets ([sheets.new](https://sheets.new)).
2. Nómbrala: **`VIDEM - Master Database & CRM`**.
3. Copia el ID de la hoja desde la URL de tu navegador:
   - Ejemplo de URL: `https://docs.google.com/spreadsheets/d/`**`1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`**`/edit`
   - El ID es la cadena alfanumérica entre `/d/` y `/edit`.

---

## 2. Estructura de las Pestañas (Hojas)

Crea exactamente las siguientes 3 pestañas en la parte inferior:

### Pestaña 1: `Clientes`
Esta hoja almacena los usuarios activos y sus credenciales maestras.

| Columna | Nombre de Cabecera | Tipo de Dato | Ejemplo |
| :--- | :--- | :--- | :--- |
| **A** | `Timestamp` | Fecha/Hora ISO | `2026-10-21 12:00:00` |
| **B** | `Telefono` | Texto / Número | `573015568904` |
| **C** | `Nombre` | Texto | `Camilo Bohórquez` |
| **D** | `Plan` | Texto | `Semestral (6 Meses)` |
| **E** | `Fecha_Vencimiento` | Fecha | `2027-04-21` |
| **F** | `Stremio_Email` | Texto | `videm.vip.4821@videm.private` |
| **G** | `Stremio_Pass` | Texto | `Videm4K.4821!` |
| **H** | `Token_RD` | Alfanumérico | `RD_TOKEN_ABC123XYZ` |
| **I** | `Estado` | Texto (Dropdown) | `Activo` / `Vencido` / `Suspendido` |
| **J** | `Transaccion_Ref` | Texto | `NEQ-784920` o `WOMPI-9381` |

---

### Pestaña 2: `Inventario_Tokens_RD`
Esta hoja funciona como tu **pool de licencias pre-compradas**. Cuando n8n aprueba un pago, toma automáticamente la primera fila que esté en estado `Disponible`, extrae el token y la marca como `Asignado`.

| Columna | Nombre de Cabecera | Tipo de Dato | Ejemplo |
| :--- | :--- | :--- | :--- |
| **A** | `ID` | Número correlativo | `1`, `2`, `3`... |
| **B** | `Token_RealDebrid` | Token Secreto | `J2KLM9821NZQ091...` |
| **C** | `Duracion_Dias` | Número | `180` (6 meses) o `360` (1 año) |
| **D** | `Estado` | Dropdown | `Disponible` / `Asignado` |
| **E** | `Asignado_A_Telefono` | Texto | `573015568904` |
| **F** | `Fecha_Asignacion` | Fecha/Hora | `2026-10-21 12:05:00` |

> [!TIP]
> **Carga rápida de stock:** Puedes comprar un lote de vouchers o tokens de Real-Debrid una vez al mes y pegarlos en la columna B con estado `Disponible`. El bot se encargará de despacharlos solo cuando un pago esté verificado.

---

### Pestaña 3: `Logs_Pagos`
Registro auditable de todas las transacciones entrantes (tanto pasarela automática como comprobantes Nequi/Bancolombia).

| Columna | Nombre de Cabecera | Tipo de Dato | Ejemplo |
| :--- | :--- | :--- | :--- |
| **A** | `Timestamp` | Fecha/Hora | `2026-10-21 12:00:15` |
| **B** | `Telefono` | Texto | `573015568904` |
| **C** | `Metodo` | Texto | `Wompi PSE` / `Nequi QR` / `Bancolombia` |
| **D** | `Referencia` | Texto | `M491028` |
| **E** | `Monto` | Moneda | `$240.000 COP` |
| **F** | `Estado` | Dropdown | `Aprobado` / `Por_Verificar` / `Rechazado` |
| **G** | `Comprobante_URL` | Enlace / URL | `https://evolution-api.../media/receipt.jpg` |

---

## 3. Conexión de Permisos con n8n

Para que n8n pueda leer y escribir en esta hoja de Google Sheets de forma desatendida:

1. **Método Recomendado (Service Account de Google Cloud)**:
   - Crea un proyecto en [Google Cloud Console](https://console.cloud.google.com).
   - Habilita la **Google Sheets API** y **Google Drive API**.
   - Crea una Cuenta de Servicio (*Service Account*) y descarga el archivo de claves `.json`.
   - Copia el correo del robot de servicio (ej: `videm-n8n-bot@tu-proyecto.iam.gserviceaccount.com`).
   - En tu Google Sheet, haz clic en **Compartir** y dale permisos de **Editor** a ese correo.
2. **Método OAuth2 (Personal)**:
   - En n8n, crea una credencial de tipo **Google Sheets OAuth2 API**, autoriza con tu cuenta de Google y selecciona la hoja usando su ID.
