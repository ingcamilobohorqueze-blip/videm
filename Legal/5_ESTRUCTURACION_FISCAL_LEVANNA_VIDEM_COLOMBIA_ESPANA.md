# 🏛️ ESTRUCTURACIÓN FISCAL Y CORPORATIVA: GRUPO LEVANNA DC & MARCA VIDEM
### *Modelo de Operación Transfronteriza Colombia - España / Unión Europea*

---

## 🎯 1. ARQUITECTURA CORPORATIVA: EL MODELO DE MATRIZ Y UNIDAD DE NEGOCIO

Para optimizar impuestos, blindar el patrimonio de los socios y permitir la expansión internacional sin duplicar costos societarios, se adopta la siguiente estructura:

```
                      ┌──────────────────────────────────────┐
                      │            LEVANNA DC S.A.S.         │
                      │       (Sociedad Matriz / Holding)    │
                      │          NIT: [NIT Registrado]       │
                      │     Domicilio: Bogotá D.C., Colombia │
                      └──────────────────┬───────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
  ┌─────────────────────────────┐                 ┌─────────────────────────────┐
  │         LÍNEA VIDEM         │                 │    OTRAS LÍNEAS / MARCAS    │
  │   Tech Concierge & 4K Remux │                 │         LEVANNA DC          │
  │  (Establecimiento de Ccio)  │                 │                             │
  └─────────────────────────────┘                 └─────────────────────────────┘
```

### Ventajas de esta Estructuración:
1. **Separación de Responsabilidad:** Cualquier contingencia comercial de VIDEM está contenida dentro del patrimonio de la persona jurídica, protegiendo los bienes personales de Camilo Bohórquez.
2. **Unidad Operativa en Colombia:** Se utiliza el NIT de LevannaDC para facturación electrónica, contratos de pasarelas de pago (Stripe, Mercado Pago) y cuentas bancarias.
3. **Establecimiento de Comercio "VIDEM":** Se matricula ante la Cámara de Comercio de Bogotá como establecimiento comercial de propiedad de LevannaDC.

---

## ⚖️ 2. TRATAMIENTO TRIBUTARIO EN COLOMBIA (DIAN)

### 2.1 Exportación de Servicios Tecnológicos (Exención de IVA - Art. 481 E.T.)
* Las ventas realizadas a clientes en España y Europa constituyen **Exportación de Servicios Digitales**, dado que el servicio se presta desde Colombia y es aprovechado y consumido exclusivamente en el exterior.
* **Beneficio Fiscal:** **IVA del 0% (Exento)** en la factura electrónica de exportación. No se cobra el 19% de IVA colombiano al usuario europeo.

### 2.2 Régimen Tributario de LevannaDC
* **Opción A (Régimen Ordinario):** Tarifa general de renta sobre utilidad neta, deduciendo todos los costos operativos (servidores, APIs, soporte, comisiones en el exterior, software).
* **Opción B (Régimen Simple de Tributación - RST):** Si LevannaDC está inscrita o califica al RST en el grupo de servicios tecnológicos (CIIU 6202 / 6311), tributa una tarifa reducida consolidada sobre ingresos brutos (aproximadamente entre el 4.5% y el 7.3%), quedando exonerada de aportes a parafiscales y simplificando declaraciones en un solo formulario anual.

### 2.3 Actividades Económicas (Códigos CIIU en el RUT de LevannaDC):
* **6202:** Actividades de consultoría informática y actividades de administración de instalaciones informáticas.
* **6311:** Procesamiento de datos, alojamiento (hosting) y actividades conexas.
* **6190:** Otras actividades de telecomunicaciones.
* **Responsabilidad 10:** *Obligado Aduanero / Exportador de Servicios*.

---

## 🇪🇸 3. TRATAMIENTO TRIBUTARIO EN ESPAÑA Y LA UNIÓN EUROPEA

### 3.1 Servicios Prestados por Vía Electrónica (B2C)
* En la Unión Europea, las ventas de software y servicios digitales a particulares (B2C) están sujetas al principio de tributación en destino.
* **Manejo mediante Merchant of Record (MoR) / Stripe Tax:**
  * Al procesar los cobros a través de pasarelas con módulo fiscal internacional (como Stripe Tax, Paddle o Lemon Squeezy), la pasarela retiene y liquida automáticamente el IVA español (21%) ante la Agencia Tributaria en Madrid.
  * De esta forma, **LevannaDC no necesita registrarse ni tributar directamente en España**, cumpliendo el 100% de la normativa comunitaria.

---

## 📝 4. MODELO DE FACTURA ELECTRÓNICA DE EXPORTACIÓN (DIAN)

Al facturar un plan en España (ejemplo: Plan Anual VIP de 89,99 €):
* **Emisor:** LEVANNA DC S.A.S. (NIT, Dirección en Colombia).
* **Adquirente:** Consumidor Final Exterior / Nombre del Cliente.
* **Tipo de Documento del Cliente:** Pasaporte / DNI / ID Tributario Extranjero (o código genérico DIAN `222222222222` para consumidor final del exterior).
* **Concepto:** *"Servicios de Asistencia Técnica Telemática y Calibración Digital en el Hogar - Plan VIP Anual"*.
* **Tarifa de IVA:** **0% Exento (Art. 481 literal c, Estatuto Tributario)**.

