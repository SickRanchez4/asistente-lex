# Tareas: Documentos y fotografías

## Estado

Pendiente de ejecución y verificación. Spec y plan aprobados el 2026-11-08.

## Lista de trabajo

Basadas en la [spec](./spec.md) y el [plan](./plan.md). C01–C13 siguen el orden de criterios. Contratos SDL/OpenAPI se concretan antes de integrar cada entrega; almacenamiento y migraciones MS-02 son parte de la funcionalidad, no tareas sueltas.

- [ ] **010-T01. Adjuntar un archivo válido sin publicar cargas incompletas.**
  - **Valor/entrega:** PDF/JPEG/PNG unitario por React/GraphQL Base64, máximo 10.485.760 bytes reales, metadatos automáticos y clasificación; MS-02 verifica Abierto/pertenencia con MS-01 y confirma binario más metadatos. Temporal/limpieza identificada, límites del propietario y configuración suficiente del transporte para el tamaño admitido.
  - **Depende de:** [007-T02](../007-expedientes-y-ciclo-de-vida/tasks.md), [002-T01](../002-gateway-y-contratos-base/tasks.md), [002-T02](../002-gateway-y-contratos-base/tasks.md), [001-T02](../001-experiencia-y-ui-compartida/tasks.md) y volumen MS-02 de [000](../000-plataforma-base/tasks.md).
  - **Integración:** no espera a 002-T03 completa; esa entrega verifica/endurece la protección conjunta usando esta operación real.
  - **Evidencia/validación:** archivo permitido íntegro y clasificado; límite exacto aceptado y un byte más rechazado, sin confiar solo en extensión. Interrupción, MS-01 caído o persistencia parcial no publican archivo ni éxito; no cámara/audio/video/lotes.
  - **Cobertura:** C01, C02, C03, C04, C05, C10, C11.

- [ ] **010-T02. Encontrar y abrir archivos autorizados conservando el original.**
  - **Valor/entrega:** listado/filtros nombre/clasificación/formato/fecha, visualización PDF/JPEG/PNG y lectura Base64 protegida en todos los estados. Contratos de fuentes para IA/informes/offline, separados de informes guardados; lectura de texto PDF para IA sin OCR ni índice de búsqueda por contenido.
  - **Depende de:** 010-T01.
  - **Evidencia/validación:** filtros exactos, visualización en aplicación y bytes originales de fotografías; no EXIF en UI, pero original intacto. A/no autenticado no obtiene bytes de B, incluso por enlace directo; PDF sin texto no se presenta como analizado.
  - **Cobertura:** C06, C07, C09, C13.

- [ ] **010-T03. Reclasificar y eliminar archivos con consecuencias y restricciones claras.**
  - **Valor/entrega:** clasificación y borrado solo Abierto, confirmación cancelable, autorización remota y manejo de restos de borrado sin enlaces accesibles ni éxito ficticio. Sin reemplazo ni modificación automática de informes/copias antiguas.
  - **Depende de:** 010-T01, 010-T02 y estados de [007-T03](../007-expedientes-y-ciclo-de-vida/tasks.md) y [007-T04](../007-expedientes-y-ciclo-de-vida/tasks.md).
  - **Evidencia/validación:** reclasificar guarda, cancelar no borra, confirmar elimina binario/metadatos disponibles; fallo informa resultado real y permite limpieza segura. Cerrado/Archivado/MS-01 no disponible/cuenta ajena rechazan.
  - **Cobertura:** C02, C03, C08, C09, C12.

## Verificación de aceptación

- [ ] El desarrollador revisa los 13 criterios de la [spec](./spec.md), tamaños medidos, fallos binario/metadatos y acceso directo.
- [ ] Ejecutar validaciones del [plan](./plan.md) y registrar evidencia, sin archivos de testing. Leer guías de la versión Next.js instalada antes de implementar adaptadores.
- [ ] Sincronizar spec, plan e [índice](../index.md); terminar cargas no demuestra integración de fuentes con 011/012/013.