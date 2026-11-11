# 📂 CARPETA COMERCIAL VIDEM

Esta carpeta centraliza toda la documentación comercial, material de capacitación para asesores y conserjes ejecutivos, y guías para presentaciones oficiales de **VIDEM**.

---

## 📄 Archivos Disponibles

1. **[Manual_Comercial_y_Entrenamiento_VIDEM.pdf](./Manual_Comercial_y_Entrenamiento_VIDEM.pdf)**  
   * **El documento final listo para compartir o imprimir (5 páginas exactas).**  
   * Formato PDF ejecutivo con diseño de alta fidelidad, tablas comparativas, planes de precios (Colombia / España) y manejo de objeciones.

2. **[manual-comercial.html](./manual-comercial.html)**  
   * **Plantilla maestra web e imprimible.**  
   * Permite visualizar el documento en el navegador o volver a compilar el PDF si se actualizan precios o textos.

3. **[manual_comercial_y_entrenamiento.md](./manual_comercial_y_entrenamiento.md)**  
   * **Fuente en formato Markdown editable.**  
   * Ideal para copiar y pegar textos de capacitación, respuestas de WhatsApp o presentaciones rápidas.

---

## 🛠️ ¿Cómo re-generar el PDF si haces cambios en el HTML?

Ejecuta el siguiente comando en PowerShell desde la raíz del proyecto:

```powershell
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless --disable-gpu --no-pdf-header-footer --run-all-compositor-stages-before-draw --print-to-pdf="C:\Users\Usuario\Documents\Proyectos Antigravity\VIDEM\comercial\Manual_Comercial_y_Entrenamiento_VIDEM.pdf" "C:\Users\Usuario\Documents\Proyectos Antigravity\VIDEM\comercial\manual-comercial.html"
```

