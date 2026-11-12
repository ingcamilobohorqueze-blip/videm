# 📋 GUÍA OFICIAL: CATÁLOGO DE ÍTEMS Y CLIENTES EN FACTURATECH
### *Estructura Blindada para Facturación Electrónica DIAN (Colombia & Exterior)*

---

## 🎯 1. REGLA DE ORO DE CONFIGURACIÓN

1. **NO USAR GTIN ni Partida Arancelaria:**
   * **GTIN:** Exclusivo de bienes físicos de retail (código de barras).
   * **Partida Arancelaria:** Exclusivo de aduanas de comercio exterior físico (mercancías con DEX).
   * Para VIDEM se utiliza **UNSPSC (`81111812`)** o **Código Interno del Contribuyente**.
2. **Unidad de Medida Única (`94 - Servicio / Unidad`):**
   * Vender planes semestrales y anuales como **1 paquete cerrado** evita los desajustes de centavos en la DIAN producidos por divisiones decimales ($49,99 \div 6 = 8,33166...$).

---

## 🇪🇸 2. CATÁLOGO DE ÍTEMS: EXPORTACIÓN ESPAÑA (EUR €)

Estos ítems se crean en el módulo **Catálogo > Productos / Servicios** de Facturatech:

| Campo en Facturatech | Plan 1 Mes Flex | Plan 6 Meses VIP (Estrella) | Plan 12 Meses Anual VIP |
| :--- | :--- | :--- | :--- |
| **Código Interno** | `VIDEM-FLEX-01` | `VIDEM-VIP-06` | `VIDEM-VIP-12` |
| **Nombre del Ítem** | Servicio Streaming Concierge VIP (1 Mes) | Suscripción Servicio Streaming Concierge (6 Meses) | Suscripción Servicio Streaming Concierge (12 Meses) |
| **Esquema del Ítem** | UNSPSC *(o Código Propio)* | UNSPSC *(o Código Propio)* | UNSPSC *(o Código Propio)* |
| **Código UNSPSC** | `81111812` | `81111812` | `81111812` |
| **Unidad de Medida** | `94` (Unidad / Servicio) | `94` (Unidad / Servicio) | `94` (Unidad / Servicio) |
| **Cantidad** | `1` | `1` | `1` |
| **Precio Unitario** | **9,99 €** | **49,99 €** | **89,99 €** |
| **Tipo de Impuesto** | **01 - IVA** | **01 - IVA** | **01 - IVA** |
| **Tarifa de IVA** | **0% Exento** | **0% Exento** | **0% Exento** |
| **Fundamento Legal IVA** | Art. 481 literal *c* E.T. (Exportación) | Art. 481 literal *c* E.T. (Exportación) | Art. 481 literal *c* E.T. (Exportación) |

### 📝 Descripciones Técnicas Oficiales (Para el cuerpo de la factura):
* **Plan 1 Mes:**  
  `Servicio digital de configuración técnica, optimización y soporte concierge de streaming en la nube (Vigencia: 30 días). Prestado desde Colombia y aprovechado íntegramente en el exterior.`
* **Plan 6 Meses:**  
  `Suscripción semestral de asistencia técnica remota, configuración y soporte concierge de streaming en la nube (Vigencia: 180 días). Prestado desde Colombia y aprovechado íntegramente en el exterior.`
* **Plan 12 Meses:**  
  `Suscripción anual de asistencia técnica remota, configuración y soporte concierge de streaming en la nube (Vigencia: 365 días). Prestado desde Colombia y aprovechado íntegramente en el exterior.`

---

## 🇨🇴 3. CATÁLOGO DE ÍTEMS: VENTAS NACIONALES (COLOMBIA - COP $)

| Campo en Facturatech | Plan 1 Mes Flex | Plan 6 Meses VIP | Plan 12 Meses Fundadores |
| :--- | :--- | :--- | :--- |
| **Código Interno** | `VIDEM-CO-01` | `VIDEM-CO-06` | `VIDEM-CO-12` |
| **Nombre del Ítem** | Asistencia Streaming Concierge (1 Mes) | Asistencia Streaming Concierge VIP (6 Meses) | Asistencia Streaming Concierge Anual (12 Meses) |
| **Código UNSPSC** | `81111812` | `81111812` | `81111812` |
| **Unidad de Medida** | `94` (Unidad / Servicio) | `94` (Unidad / Servicio) | `94` (Unidad / Servicio) |
| **Precio Unitario (COP)**| **$55.000 COP** | **$240.000 COP** | **$440.000 COP** |
| **Régimen No Responsable (LevannaDC)** | Excluido / No gravado | Excluido / No gravado | Excluido / No gravado |

---

## 👤 4. CONFIGURACIÓN DE CLIENTES (TERCEROS) SIN FRICCIÓN

Para no perder ventas pidiéndole formularios engorrosos al cliente, así se configuran en Facturatech:

### A. Cliente en Colombia (Persona Natural):
* **¿Pide RUT?** **NO.** El cliente final no necesita RUT.
* **Tipo de Documento:** Cédula de ciudadanía (`13`) si la proporciona, o **`Consumidor Final`** con número:
  * **Número:** `222222222222` (doce doses).
* **Nombre:** El nombre real del cliente (o `Consumidor Final`).
* **Correo electrónico:** El correo real del cliente (obligatorio para entrega del documento).
* **Responsabilidad Tributaria:** `R-99-PN` (No responsable de IVA).
* **Dirección:** Bogotá / Colombia (o la ciudad que indique).

### B. Cliente en España / Exterior (Persona Natural):
* **¿Pide RUT?** **NO.** Los clientes europeos no manejan RUT.
* **Tipo de Documento:** `42 - Documento de identificación extranjero` (o `41 - Pasaporte`).
* **Número de Documento:** DNI o NIE español si lo ingresó (ej. `48921820X`) o el ID de cliente de Stripe / teléfono.
* **País:** `España` (Código `ES` / 724).
* **Departamento / Ciudad:** Madrid, Barcelona, Valencia (o genérico `Extranjero`).
* **Responsabilidad Tributaria:** `R-99-PN` (No responsable / Extranjero sin obligaciones en Colombia).
* **Correo electrónico:** El email de compra del cliente.

---

## 🚀 5. CHECKLIST AL EMITIR UNA FACTURA DE EXPORTACIÓN

1. **Tipo de Documento:** Factura Electrónica de Venta.
2. **Tipo de Operación:** `02 - Exportación de Servicios`.
3. **Divisa:** `EUR` (Euros).
4. **Tasa Representativa del Mercado (TRM):** La tasa oficial certificada del día.
5. **Forma de Pago:** De contado (`1`) / Medio de pago: `Tarjeta crédito/débito` (`48`) o `Transferencia bancaria` (`42`).
6. **Validación:** Guardar y transmitir a la DIAN. Facturatech genera el CUFE y despacha el correo al cliente de forma 100% desatendida.
