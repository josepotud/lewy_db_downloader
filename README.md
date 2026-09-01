# Lewy Data Suite (REDCap DB Downloader & Multimodal Viewer)

Aplicación web de escritorio **Zero-Install** y de procesamiento **100% en memoria** para la visualización clínica, búsqueda rápida, fusión temporal multimodal y exportación avanzada de cohortes longitudinales de REDCap (enfocada en Demencia con Cuerpos de Lewy y Enfermedades Neurodegenerativas).

---

## Arquitectura de Privacidad y Carga en Memoria

- **Cero datos almacenados en el repositorio**: No contiene ningún dato de pacientes ni tokens de API hardcodeados.
- **Procesamiento en memoria de sesión**: Los datos se descargan mediante la API de REDCap o se cargan localmente (CSV/Excel) y se mantienen exclusivamente en la memoria RAM del navegador durante la sesión.
- **Sin dependencias de servidor ni instalación**: Funciona de forma inmediata abriendo `index.html` o haciendo doble clic en `Abrir_App.bat`.

---

## Modo de Uso

1. **Abrir la Aplicación**:
   - Haz doble clic en `Abrir_App.bat` (o abre `index.html` en cualquier navegador moderno: Chrome, Edge, Firefox, Safari).
2. **Cargar los Datos**:
   - **Opción A (API en Vivo)**: Introduce tu URL y Token de REDCap en *Conectar API REDCap* para descargar la cohorte en vivo.
   - **Opción B (Archivo Local)**: Arrastra o selecciona tu exportación `.csv` o `.xlsx` de REDCap.
3. **Módulos Principales**:
   - **Panel de Control**: Resumen demográfico formal, disponibilidad de biomarcadores (LCR, RM, DaTSCAN, PET-FDG, EEG) y gráficos diagnósticos.
   - **Explorador**: Vista tabular con apertura directa de fichas clínicas al pulsar sobre el ID y diagnósticos compactos con información flotante.
   - **Búsqueda Libre**: Búsqueda global instantánea (<15ms) en todos los campos, etiquetas y valores.
   - **Fusión Temporal**: Emparejamiento multimodal de pruebas dentro de ventanas de tolerancia configurables (en días) con 1 sola fila por paciente y aislamiento estricto.
   - **Exportación**: Descarga en Libro Excel Multi-Hoja (Hoja Maestra + Hojas por Instrumento) o CSV en formato **Etiquetas de Texto** o **Valores Numéricos REDCap**.

---

## Tecnologías Utilizadas

- **HTML5 / CSS3** (Diseño clínico formal y responsivo).
- **JavaScript ES6+ Vanilla** (Motor de análisis, indexación en memoria y cálculos clínicos).
- **SheetJS (xlsx.full.min.js)** (Generación de libros Excel multi-hoja).
- **PapaParse** (Procesamiento de archivos CSV).
- **Chart.js** (Visualizaciones clínicas y gráficos descriptivos).

---

## Licencia

Uso libre para investigación médica y académica.
