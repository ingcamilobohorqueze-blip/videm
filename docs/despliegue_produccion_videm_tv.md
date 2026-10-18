# Guía de Despliegue en Producción - VIDEM (videm.tv)

Esta guía detalla los pasos exactos para conectar el repositorio local de **VIDEM** a **GitHub**, desplegarlo en **Vercel** y apuntar tu dominio oficial **`videm.tv`**.

---

## 1. Subir el Repositorio a GitHub

1. Entra a tu cuenta de GitHub ([github.com](https://github.com/new)).
2. Crea un nuevo repositorio:
   - **Repository name**: `videm` (o `videm-tv`)
   - **Visibility**: Privado o Público (según tu preferencia)
   - **NO marques** "Add a README file", ni ".gitignore", ni licencia (ya los tenemos creados y comiteados).
3. En la terminal de este proyecto, ejecuta (reemplazando si el nombre es diferente):

```bash
git remote add origin https://github.com/ingcamilobohorqueze-blip/videm.git
git push -u origin main
```

---

## 2. Conectar e Importar en Vercel

1. Ingresa a [vercel.com](https://vercel.com) con tu cuenta de GitHub.
2. Haz clic en **"Add New..."** ➔ **"Project"**.
3. Selecciona el repositorio **`videm`** de tu lista y haz clic en **"Import"**.
4. En la configuración del proyecto:
   - **Framework Preset**: *Other* (Detectará automáticamente los archivos estáticos y `vercel.json`).
   - **Root Directory**: `./` (por defecto).
5. Haz clic en **"Deploy"**. En ~20 segundos tu web estará en línea con una URL temporal tipo `videm.vercel.app`.

---

## 3. Configurar el Dominio Personalizado `videm.tv`

1. En el panel de tu proyecto en Vercel, ve a: **Settings** ➔ **Domains**.
2. Escribe **`videm.tv`** y haz clic en **Add**.
3. Vercel te preguntará si deseas redirigir `www.videm.tv` a `videm.tv` (o viceversa). Selecciona la redirección recomendada.
4. Vercel te mostrará los registros DNS requeridos:

| Tipo | Host / Nombre | Valor / Destino | Propósito |
| :--- | :--- | :--- | :--- |
| **A** | `@` (o en blanco) | `76.76.21.21` | Apunta el dominio principal `videm.tv` |
| **CNAME** | `www` | `cname.vercel-dns.com.` | Apunta el subdominio `www.videm.tv` |

---

## 4. Configurar los Registros DNS en tu Registrador

Ve al panel donde compraste **`videm.tv`** (Namecheap, GoDaddy, Cloudflare, DonDominio, etc.):

1. Busca la sección de **"Gestión de DNS"** o **"Zona DNS"**.
2. Agrega el registro **A**:
   - Nombre: `@`
   - Valor: `76.76.21.21`
   - TTL: Automático o 3600
3. Agrega el registro **CNAME**:
   - Nombre: `www`
   - Valor: `cname.vercel-dns.com.`
   - TTL: Automático o 3600

*Nota: La propagación DNS suele tardar entre 5 y 30 minutos. Vercel emitirá y renovará automáticamente tu certificado SSL HTTPS de por vida sin costo alguno.*

---

## 5. Verificación Final de Producción

Una vez propagado el dominio:
- [ ] Entrar a `https://videm.tv` y verificar el candado SSL activo.
- [ ] Probar el botón Hero y el simulador de compatibilidad (deben abrir WhatsApp en `+57 301 5568904`).
- [ ] Verificar el popover del monitor CDN telemático.
- [ ] Validar los modales de Términos y Habeas Data (con el botón de supresión directa de datos).
