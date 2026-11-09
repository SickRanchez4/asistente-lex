# Tareas: Asistencia jurídica con IA

## Estado

Pendiente de ejecución y verificación. Spec y plan aprobados el 2026-11-08.

## Lista de trabajo

Basadas en la [spec](./spec.md) y el [plan](./plan.md). C01–C16 siguen el orden de criterios. OpenAI, sin MCP, imágenes, notas o informes guardados como fuentes. Las claves no forman parte de código, historial o documentación de evidencia.

- [ ] **011-T01. Preguntar sobre un expediente en conversaciones privadas con respuestas completas.**
  - **Valor/entrega:** selección de expediente propio Abierto/Cerrado, varias conversaciones independientes, agente inicial o alternativa explícita habilitada, OpenAI, persistencia de intercambio completo y UI React con agente/aviso profesional. Conectar los manejadores de las tres herramientas seleccionables a sus propietarios, sin herramientas anunciadas pero ficticias, y plazo total de 60 segundos.
  - **Depende de:** [007-T02](../007-expedientes-y-ciclo-de-vida/tasks.md), [005-T01](../005-configuracion-de-agentes/tasks.md), [005-T02](../005-configuracion-de-agentes/tasks.md), [006-T02](../006-personas/tasks.md), [008-T01](../008-participantes/tasks.md), [009-T01](../009-actuaciones-y-notas/tasks.md), [009-T03](../009-actuaciones-y-notas/tasks.md), [010-T02](../010-documentos-y-fotografias/tasks.md), [003-T02](../003-autenticacion-y-acceso/tasks.md), [002-T01](../002-gateway-y-contratos-base/tasks.md), [002-T02](../002-gateway-y-contratos-base/tasks.md) y [001-T02](../001-experiencia-y-ui-compartida/tasks.md).
  - **Evidencia/validación:** respuesta íntegra de agente identificado y charlas separadas; sin streaming ni acceso de otra cuenta/Administrador. Proveedor caído/timeout no guarda medio intercambio y mantiene pregunta en entrada. Modelo inválido da error, no sustitución.
  - **Cobertura:** C01, C02, C03, C05, C08, C10, C11, C12, C13, C14.

- [ ] **011-T02. Cambiar perspectiva de agente conservando el contexto de cada conversación.**
  - **Valor/entrega:** selector de otro agente, configuración capturada por operación y persistencia del agente real por respuesta; cambio no modifica agente inicial del expediente ni otras conversaciones. Estado deshabilitado visible/no seleccionable y validado por backend.
  - **Depende de:** 011-T01 y catálogo/configuración de 005-T01/005-T02.
  - **Integración:** no espera a 005-T03 para validar/seleccionar; el toggle administrativo de esa entrega se comprueba después con este chat operativo.
  - **Evidencia/validación:** respuesta posterior usa el nuevo agente, historial anterior intacto y expediente sin cambios. Con el toggle real de 005-T03, nueva consulta rechazada y pregunta iniciada puede terminar salvo archivo.
  - **Cobertura:** C01, C03, C04, C05, C13.

- [ ] **011-T03. Analizar fuentes del caso mostrando referencias autorizadas.**
  - **Valor/entrega:** selección/contexto de análisis de un documento concreto o expediente completo, referencias visibles y verificadas contra fuentes realmente utilizadas; reutilizar manejadores internos de 011-T01, sin volver a implementarlos. Sin normativa web, MCP, OCR, fotografías, notas, informes guardados o ERP.
  - **Depende de:** 011-T01, 011-T02, [006-T02](../006-personas/tasks.md), [008-T01](../008-participantes/tasks.md), [009-T01](../009-actuaciones-y-notas/tasks.md), [009-T03](../009-actuaciones-y-notas/tasks.md), [010-T02](../010-documentos-y-fotografias/tasks.md) y [002-T03](../002-gateway-y-contratos-base/tasks.md).
  - **Evidencia/validación:** pregunta sobre PDF extraíble usa y cita ese PDF; fuentes ajenas/referencias inventadas excluidas. PDF sin texto se informa como no analizable; notas reales no llegan a OpenAI. Repetir comprobación de ausencia de informes al existir 012.
  - **Cobertura:** C06, C07, C08, C11, C12, C15.

- [ ] **011-T04. Eliminar todos los chats del expediente sin permitir respuestas que los restauren.**
  - **Valor/entrega:** REST interno autenticado de eliminación completa/repetible de conversaciones, intercambios y estados; coordinación local de generación para descartar resultados anteriores al borrado y admisión compatible con marca de archivo de MS-01. Sin recuperar trabajos externos tras reinicio.
  - **Depende de:** 011-T01, 011-T02 y estados/elegibilidad de [007-T03](../007-expedientes-y-ciclo-de-vida/tasks.md).
  - **Integración:** no espera a 007-T04 completa; el contrato se prueba con solicitud interna autorizada y después permite implementar el archivo de esa entrega.
  - **Evidencia/validación:** borrar varias conversaciones reales confirma ausencia total, repetir sin conversaciones no falla y respuesta en curso no reaparece. Error/timeout no se responde como borrado completo; verificar integración de marca y desarchivo con 007-T04/007-T05.
  - **Cobertura:** C02, C09, C10, C11, C12, C16.

## Verificación de aceptación

- [ ] El desarrollador revisa los 16 criterios de la [spec](./spec.md), incluida eliminación con archivo real, fuentes e intercambios concurrentes.
- [ ] Ejecutar validaciones del [plan](./plan.md), sin crear archivos de testing ni enviar datos reales al proveedor sin condiciones de tratamiento adecuadas.
- [ ] Actualizar spec, plan e [índice](../index.md); tener un adaptador OpenAI no acredita privacidad, fuentes o archivo.