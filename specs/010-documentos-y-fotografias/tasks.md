# Tareas: Documentos y fotografías

## Estado

Completa. Spec y plan aprobados el 2026-11-08. T01–T03 implementadas y C01–C13 verificadas localmente el 2026-11-10. Los consumidores reales de 011/012/013 se verifican en sus propias entregas; no se acreditan por exponer estos contratos.

## Lista de trabajo

Basadas en la [spec](./spec.md) y el [plan](./plan.md). C01–C13 siguen el orden de criterios. Contratos SDL/OpenAPI se concretan antes de integrar cada entrega; almacenamiento y migraciones MS-02 son parte de la funcionalidad, no tareas sueltas.

- [x] **010-T01. Adjuntar un archivo válido sin publicar cargas incompletas.**
  - **Valor/entrega:** PDF/JPEG/PNG unitario por React/GraphQL Base64, máximo 10.485.760 bytes reales, metadatos automáticos y clasificación; MS-02 verifica Abierto/pertenencia con MS-01 y confirma binario más metadatos. Temporal/limpieza identificada, límites del propietario y configuración suficiente del transporte para el tamaño admitido.
  - **Depende de:** [007-T02](../007-expedientes-y-ciclo-de-vida/tasks.md), [002-T01](../002-gateway-y-contratos-base/tasks.md), [002-T02](../002-gateway-y-contratos-base/tasks.md), [001-T02](../001-experiencia-y-ui-compartida/tasks.md) y volumen MS-02 de [000](../000-plataforma-base/tasks.md).
  - **Integración:** no espera a 002-T03 completa; esa entrega verifica/endurece la protección conjunta usando esta operación real.
  - **Evidencia/validación:** archivo permitido íntegro y clasificado; límite exacto aceptado y un byte más rechazado, sin confiar solo en extensión. Interrupción, MS-01 caído o persistencia parcial no publican archivo ni éxito; no cámara/audio/video/lotes.
  - **Cobertura:** C01, C02, C03, C04, C05, C10, C11.

- [x] **010-T02. Encontrar y abrir archivos autorizados conservando el original.**
  - **Valor/entrega:** listado/filtros nombre/clasificación/formato/fecha, visualización PDF/JPEG/PNG y lectura Base64 protegida en todos los estados. Contratos de fuentes para IA/informes/offline, separados de informes guardados; lectura de texto PDF para IA sin OCR ni índice de búsqueda por contenido.
  - **Depende de:** 010-T01.
  - **Evidencia/validación:** filtros exactos, visualización en aplicación y bytes originales de fotografías; no EXIF en UI, pero original intacto. A/no autenticado no obtiene bytes de B, incluso por enlace directo; PDF sin texto no se presenta como analizado.
  - **Cobertura:** C06, C07, C09, C13.

- [x] **010-T03. Reclasificar y eliminar archivos con consecuencias y restricciones claras.**
  - **Valor/entrega:** clasificación y borrado solo Abierto, confirmación cancelable, autorización remota y manejo de restos de borrado sin enlaces accesibles ni éxito ficticio. Sin reemplazo ni modificación automática de informes/copias antiguas.
  - **Depende de:** 010-T01, 010-T02 y estados de [007-T03](../007-expedientes-y-ciclo-de-vida/tasks.md) y [007-T04](../007-expedientes-y-ciclo-de-vida/tasks.md).
  - **Evidencia/validación:** reclasificar guarda, cancelar no borra, confirmar elimina binario/metadatos disponibles; fallo informa resultado real y permite limpieza segura. Cerrado/Archivado/MS-01 no disponible/cuenta ajena rechazan.
  - **Cobertura:** C02, C03, C08, C09, C12.

## Verificación de aceptación

- [x] El desarrollador revisa los 13 criterios de la [spec](./spec.md), tamaños medidos, fallos binario/metadatos y acceso directo.
- [x] Ejecutar validaciones del [plan](./plan.md) y registrar evidencia, sin archivos de testing. Leer guías de la versión Next.js instalada antes de implementar adaptadores.
- [x] Sincronizar spec, plan e [índice](../index.md); terminar cargas no demuestra integración de fuentes con 011/012/013.

## Evidencia local, 2026-11-10

- **Base y contratos:** leída la guía Route Handlers de Next.js instalado antes de implementar. Tipos MS-02, Gateway, Shell, Abogado y Admin; SDL combinado y OpenAPI con referencias resueltas; builds y despliegue MS-02/Gateway/Abogado/Shell correctos. V1 aplicada explícitamente y segunda preparación idempotente. Sin archivos de testing en el repositorio.
- **T01 / C01–C05, C10–C11:** 12 comprobaciones iniciales de dominio/transporte y suite de 142 comprobaciones reales REST/GraphQL/SQL/binarios. PDF, JPEG y PNG íntegros; límite exacto de 10.485.760 bytes aceptado también por Shell/Gateway y un byte más rechazado. Extensión/MIME/firma incoherentes, Base64 no canónico, archivo vacío/truncado, clasificación inválida y traversal rechazados. Corte real de transferencia, fallo SQL durante publicación y limpieza de STAGING no publican incompletos; limpieza individual rechaza un archivo AVAILABLE.
- **Autoridad y privacidad:** Cerrado/Archivado rechazan las tres escrituras; lecturas siguen autorizadas. Otra cuenta, Administrador, identidad ausente, cuenta suspendida y URL directa anónima no obtienen contenido. Una instancia aislada con MS-01 inaccesible rechazó lectura y escrituras sin cambiar filas. Sin marcadores de contenido, nombres privados o EXIF de prueba en logs de MS-02/Gateway/MS-04.
- **T02 / C06–C07, C09, C13:** filtros combinados, subcadena literal sin comodines, fechas civiles inclusivas de Bolivia, errores de rango, cursores ligados a cuenta/expediente/filtros y paginación sin duplicados. Descarga Base64 idéntica al original, incluido JPEG con EXIF; metadata mínima sin rutas ni EXIF. PDF con texto devuelve EXTRACTED; PDF sin texto devuelve NO_TEXT y texto nulo, sin OCR. Fuentes excluyen archivos pendientes e informes.
- **T03 / C08, C12:** reclasificación conserva fecha y detecta versión obsoleta. Cancelar no borra; confirmar retira bytes y metadatos. Fallo real de borrado binario y fallo SQL después de retirar bytes devuelven resultado parcial sin acceso al contenido; reintento autorizado completa la limpieza. Las 11 comprobaciones adicionales de límites/fallos incluyeron el trayecto GraphQL real de 10 MiB y fallo SQL de eliminación, sin éxito ficticio.
- **Navegador:** PDF con pixels no blancos, zoom, PNG/JPEG visibles y descargas originales; carga inválida conserva selección; sin cámara, audio, video ni múltiple selección. Filtros, rango inválido, paginación, Cerrado/Archivado de solo lectura, reclasificación, cancelar/confirmar borrado y conflictos concurrentes reales verificados. Corregido y repetido conflicto de eliminación: el diálogo ya no oculta el rechazo. Fallo de lectura distinto de vacío; escritura incierta conserva selección, bloquea y no reenvía sola. Offline oculta lista y vista privada; reconexión consulta. Capturas 1366×900 y 390×844, imagen y PDF móvil sin desbordamientos ni controles superpuestos.
- **Limpieza:** retirados únicamente binarios, metadatos, cuentas, sesiones y expedientes sintéticos de 010; dos cuentas demo conservadas. Sin llamadas al proveedor IA ni cambios en credenciales privadas.

## Límites de integración

Contratos y endpoints autorizados de fuentes/contenido/texto PDF disponibles para 011/012/013. Su consumo real, inclusión en contexto, generación de informes y paquete offline todavía no se implementaron ni verificaron. Los estados Archivados controlados de esta verificación solo acreditan las reglas de archivos de 010, no el borrado real de chats de 007/011. No se modifican informes ni copias descargadas anteriores y no se promete atomicidad global con cierres remotos.

Riesgo operativo separado de los 13 criterios funcionales: VS Code informa 1 vulnerabilidad crítica y 7 altas en la imagen base `node:26-alpine`, cuyas referencias FROM no cambiaron. No se acredita remediación; queda registrado también en el plan.