# 📑 GUÍA OFICIAL: DOCUMENTO SOPORTE ELECTRÓNICO (DSE)
### *Liquidación y Legalización de Comisiones al Socio en España y Asesores en Colombia*

---

## 🎯 1. ¿QUÉ ES EL DOCUMENTO SOPORTE EN FACTURATECH?

Cuando tu empresa (LevannaDC) le paga comisiones a una persona natural que **no está obligada a emitir factura electrónica** (como tu cuñado en España o un asesor independiente en Colombia):
* La antigua "cuenta de cobro" en papel ya no es suficiente ante la DIAN.
* La empresa adquirente (LevannaDC) debe generar un **Documento Soporte Electrónico (DSE)** en Facturatech y transmitirlo a la DIAN.
* **Beneficio directo:** Este documento vuelve el pago de las comisiones **100% deducible de renta** en Colombia, reduciendo legalmente la base impositiva de la empresa.

---

## 🇪🇸 2. CASO SOCIO EN ESPAÑA (CUÑADO) - LIQUIDACIÓN DE COMISIONES

### A. Registro del Socio como Tercero en Facturatech:
1. **Módulo:** Terceros / Proveedores > Nuevo Proveedor.
2. **Tipo de Persona:** Persona Natural.
3. **Tipo de Documento:** `42 - Documento de identificación extranjero` (o `41 - Pasaporte`).
4. **Número de Documento:** Su DNI / NIE de España o Pasaporte.
5. **Nombre Completo:** Nombres y Apellidos del socio.
6. **País:** España (`ES` / 724).
7. **Responsabilidad Fiscal:** `R-99-PN` (No responsable de IVA).
8. **Correo Electrónico:** Su email personal para recibir el soporte.

---

### B. Emisión del Documento Soporte en Facturatech (Paso a Paso):

1. **Tipo de Documento:** Documento Soporte en adquisiciones efectuadas a sujetos no obligados a expedir factura de venta.
2. **Proveedor / Tercero:** Seleccionar al socio en España.
3. **Fecha de Operación:** Día de la liquidación de comisiones (quincenal o mensual).
4. **Divisa:** `EUR` (Euros) o `COP` (según se pacte la liquidación).
5. **Concepto / Ítem:**
   * **Nombre:** `Servicios de intermediación comercial y prospección en territorio español`.
   * **Código UNSPSC:** `80141600` *(Actividades de ventas y mercadeo / intermediación comercial)* o Código Propio `COMIS-SOCIO-ES`.
   * **Unidad de Medida:** `94` (Servicio / Unidad).
   * **Cantidad:** `1` (o el número de planes intermediados en el periodo).
   * **Valor Unitario:** El total de comisiones acumuladas del mes (ejemplo: 55 ventas de 6 meses = $797,50 €$).
6. **Descripción Detallada:**  
   > *"Honorarios y comisiones comerciales por intermediación, captación de clientes y promoción del servicio VIDEM en territorio español durante el periodo [Mes/Año]. Servicios ejecutados físicamente fuera del territorio colombiano por no residente fiscal."*

---

### C. Tratamiento Tributario y Retenciones (Convenio de Doble Imposición):

* **Retención en la Fuente en Colombia:** **0%**.
  * Bajo el **Convenio de Doble Imposición (CDI) Colombia - España**, las rentas de trabajo y servicios ejecutados físicamente en España por un residente español tributan en España y están exoneradas de retención en la fuente en Colombia.
* **IVA:** No causa IVA (operación internacional fuera del ámbito territorial del impuesto a las ventas colombiano).

---

## 🇨🇴 3. CASO ASESORES COMERCIALES EN COLOMBIA

Para asesores o promotores comerciales dentro del país:
1. **Tipo de Documento:** Cédula de Ciudadanía (`13`).
2. **Régimen:** `R-99-PN` (No responsable de IVA).
3. **Concepto:** `Comisión por intermediación y asesoría comercial de ventas`.
4. **Retención en la Fuente:** Aplica retención por comisiones según la tabla vigente de la DIAN si supera la base mínima de UVT establecida por el contador.

---

## 🔄 4. PERIODICIDAD SUGERIDA

* **Cierre Mensual Consolidado (Recomendado):**  
  En lugar de emitir un Documento Soporte por cada venta individual (lo que consumiría muchos folios de Facturatech):
  1. Durante el mes, n8n o la hoja de cálculo acumula las comisiones devengadas por el socio.
  2. El día 30 del mes, se genera **UN SOLO Documento Soporte Electrónico consolidado** por el total de comisiones del mes.
  3. Se realiza la transferencia de comisiones (vía Wise / SWIFT / tarjeta) y el soporte queda radicado y validado ante la DIAN.
