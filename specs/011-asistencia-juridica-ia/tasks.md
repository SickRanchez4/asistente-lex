# Tareas: Asistencia jurídica con IA

## Estado

Completa. Spec y plan aprobados el 2026-11-08. T01–T04 entregadas y desplegadas localmente el 2026-11-10; C01–C16 confirmados. La entrega de 012 cerró T03/C07/C15 con informes realmente guardados y una petición nueva de chat inspeccionada. La implementación original de 011 fue publicada en `0773190`; esta actualización de evidencia no añade commit ni push.

## Lista de trabajo

Basadas en la [spec](./spec.md) y el [plan](./plan.md). C01–C16 siguen el orden de criterios. OpenAI, sin MCP, imágenes, notas o informes guardados como fuentes. Las claves no forman parte de código, historial o documentación de evidencia.

- [x] **011-T01. Preguntar sobre un expediente en conversaciones privadas con respuestas completas.**
  - **Valor/entrega:** selección de expediente propio Abierto/Cerrado, varias conversaciones independientes, agente inicial o alternativa explícita habilitada, OpenAI, persistencia de intercambio completo y UI React con agente/aviso profesional. Conectar los manejadores de las tres herramientas seleccionables a sus propietarios, sin herramientas anunciadas pero ficticias, y plazo total de 60 segundos.
  - **Depende de:** [007-T02](../007-expedientes-y-ciclo-de-vida/tasks.md), [005-T01](../005-configuracion-de-agentes/tasks.md), [005-T02](../005-configuracion-de-agentes/tasks.md), [006-T02](../006-personas/tasks.md), [008-T01](../008-participantes/tasks.md), [009-T01](../009-actuaciones-y-notas/tasks.md), [009-T03](../009-actuaciones-y-notas/tasks.md), [010-T02](../010-documentos-y-fotografias/tasks.md), [003-T02](../003-autenticacion-y-acceso/tasks.md), [002-T01](../002-gateway-y-contratos-base/tasks.md), [002-T02](../002-gateway-y-contratos-base/tasks.md) y [001-T02](../001-experiencia-y-ui-compartida/tasks.md).
  - **Evidencia/validación:** respuesta íntegra de agente identificado y charlas separadas; sin streaming ni acceso de otra cuenta/Administrador. Proveedor caído/timeout no guarda medio intercambio y mantiene pregunta en entrada. Modelo inválido da error, no sustitución.
  - **Cobertura:** C01, C02, C03, C05, C08, C10, C11, C12, C13, C14.

- [x] **011-T02. Cambiar perspectiva de agente conservando el contexto de cada conversación.**
  - **Valor/entrega:** selector de otro agente, configuración capturada por operación y persistencia del agente real por respuesta; cambio no modifica agente inicial del expediente ni otras conversaciones. Estado deshabilitado visible/no seleccionable y validado por backend.
  - **Depende de:** 011-T01 y catálogo/configuración de 005-T01/005-T02.
  - **Integración:** no espera a 005-T03 para validar/seleccionar; el toggle administrativo de esa entrega se comprueba después con este chat operativo.
  - **Evidencia/validación:** respuesta posterior usa el nuevo agente, historial anterior intacto y expediente sin cambios. Con el toggle real de 005-T03, nueva consulta rechazada y pregunta iniciada puede terminar salvo archivo.
  - **Cobertura:** C01, C03, C04, C05, C13.

- [x] **011-T03. Analizar fuentes del caso mostrando referencias autorizadas.**
  - **Valor/entrega:** selección/contexto de análisis de un documento concreto o expediente completo, referencias visibles y verificadas contra fuentes realmente utilizadas; reutilizar manejadores internos de 011-T01, sin volver a implementarlos. Sin normativa web, MCP, OCR, fotografías, notas, informes guardados o ERP.
  - **Depende de:** 011-T01, 011-T02, [006-T02](../006-personas/tasks.md), [008-T01](../008-participantes/tasks.md), [009-T01](../009-actuaciones-y-notas/tasks.md), [009-T03](../009-actuaciones-y-notas/tasks.md), [010-T02](../010-documentos-y-fotografias/tasks.md) y [002-T03](../002-gateway-y-contratos-base/tasks.md).
  - **Evidencia/validación:** pregunta sobre PDF extraíble usa y cita ese PDF; fuentes ajenas/referencias inventadas excluidas. PDF sin texto se informa como no analizable; notas reales no llegan a OpenAI. Ausencia de informes comprobada durante 012 con informes realmente guardados.
  - **Cobertura:** C06, C07, C08, C11, C12, C15.
  - [x] Tres manejadores reales, proyección jurídica cerrada y PDF autorizado con texto; referencias limitadas al registro de fuentes leídas, sin aceptar citas inventadas.
  - [x] Respuesta OpenAI real sobre PDF desde React/GraphQL con referencia visible; PDF sin texto informa limitación antes del proveedor. Nota, contacto y fotografía reales ausentes del cuerpo saliente inspeccionado con transporte controlado.
  - [x] Con informes guardados de 012, respuesta nueva del adaptador real y fuentes REST: contexto, herramientas y referencias sin informes (C07 y parte de C15). Peticiones efectivas inspeccionadas en memoria, no solo exclusión estructural.

- [x] **011-T04. Eliminar todos los chats del expediente sin permitir respuestas que los restauren.**
  - **Valor/entrega:** REST interno autenticado de eliminación completa/repetible de conversaciones, intercambios y estados; coordinación local de generación para descartar resultados anteriores al borrado y admisión compatible con marca de archivo de MS-01. Sin recuperar trabajos externos tras reinicio.
  - **Depende de:** 011-T01, 011-T02 y estados/elegibilidad de [007-T03](../007-expedientes-y-ciclo-de-vida/tasks.md).
  - **Integración:** no espera a 007-T04 completa; el contrato se prueba con solicitud interna autorizada y después permite implementar el archivo de esa entrega.
  - **Evidencia/validación:** borrar varias conversaciones reales confirma ausencia total, repetir sin conversaciones no falla y respuesta en curso no reaparece. Error/timeout no se responde como borrado completo; verificar integración de marca y desarchivo con 007-T04/007-T05.
  - **Cobertura:** C02, C09, C10, C11, C12, C16.

## Verificación de aceptación

- [x] El desarrollador revisa los 16 criterios de la [spec](./spec.md), incluida eliminación con archivo real, fuentes e intercambios concurrentes; C07/C15 confirmados con la integración real de 012.
- [x] Ejecutar validaciones disponibles del [plan](./plan.md), sin archivos de testing en el repositorio ni envío de datos reales al proveedor. Escenario de informes verificado en 012.
- [x] Actualizar spec, plan e [índice](../index.md); tener un adaptador OpenAI no acredita privacidad, fuentes o archivo.

## Registro de verificación

- **Dominio y persistencia:** 19 comprobaciones iniciales de validación. MongoDB externo real: creación, pertenencia, paginación estable, CAS, independencia, intercambio completo atómico y proyección sin modelo/revisión interna. Borrado de varias conversaciones, repetición y recibo antiguo que no elimina chats posteriores al desarchivo.
- **Aplicación y concurrencia:** cambio de agente sin modificar el historial anterior ni otra conversación; fallo de proveedor sin intercambio. Pregunta admitida no mantiene el bloqueo durante la espera. Generación durable descarta el resultado anterior al borrado; no hay trabajo externo recuperable ni copia de historial como fallback.
- **Adaptadores controlados:** tres herramientas con manejadores efectivos, identidad/plazo propagados, datos privados descartados por whitelist, errores de modelo/proveedor, timeout, respuesta truncada y referencia inventada rechazados sin reintento ni cuerpo técnico expuesto. PDF sin texto falla antes de invocar OpenAI.
- **ASGI y MongoDB reales:** anónimo, credencial sin identidad, Administrador, cuenta ajena y campos adicionales rechazados; `no-store`. Presupuesto real de 500 ms canceló la espera y liberó admisión pendiente, sin intercambio. Borrado no llama de vuelta a MS-01; Archivado rechaza y Cerrado permite conversaciones nuevas.
- **77 comprobaciones del recorrido desplegado:** Shell → GraphQL → MS-04 → propietarios MS-01/MS-02 y OpenAI. Respuesta real Civilista y posterior Penalista conservando intercambio/agente anterior; agente inicial intacto, conversaciones independientes, Abierto/Cerrado, paginación 25+2 sin duplicados, cursor de otro expediente rechazado, autorización propietaria y sin cuenta de autoridad elegida por cliente.
- **Configuración real de 005:** toggles administrativos, consulta nueva deshabilitada rechazada, alternativa explícita, ambos deshabilitados y pregunta admitida que termina con su captura original. Modelo inexistente configurado temporalmente: error real de OpenAI, sin sustitución ni intercambio; modelo/instrucciones/herramientas y disponibilidad originales restaurados. Las revisiones aplicadas permanecen como historial administrativo, no se borran para ocultar la prueba.
- **Archivo real de 007:** varias conversaciones e intercambios borrados antes de confirmar Archivado; desarchivo a Cerrado sin conversaciones previas y documentos intactos. Recibo durable repetido conserva una conversación creada después. Otras 4 comprobaciones verificaron archivo durante respuesta controlada y descarte sin recreación; 4 comprobaron fallo SQL limitado al fixture después del borrado, conservación de Cerrado/marca y bloqueo; 2 confirmaron reintento sin transición duplicada. El fallo temporal fue retirado. No se acredita coordinación de réplicas ni toda la aceptación restante de 007.
- **Fuentes y privacidad:** participante y actuación reales incluidos; nota, teléfono y fotografía sintéticos excluidos. Cuerpo OpenAI construido con esas fuentes inspeccionado en memoria con transporte controlado: sin notas, contactos, imágenes ni base64. Herramienta rechazó fotografía como PDF y documento de otro expediente de la misma cuenta. Identidad aún firmada de una cuenta suspendida fue rechazada contra MS-01. La entrega de 012 comprobó además informes realmente guardados.
- **Navegador:** respuesta OpenAI real sobre PDF con fuente visible y entrada vacía solo al confirmar. Indisponibilidad controlada conservó borrador, un único envío, ningún intercambio nuevo y consulta explícita; PDF real sin texto conservó pregunta e historial. Cambio de agente e independencia de borradores, agente deshabilitado visible/no seleccionable y alternativa explícita sin cambiar expediente. Archivado sin chat; desconexión oculta historial remoto, sin persistencia local. Interceptor retirado y sesión cerrada.
- **Presentación:** capturas de escritorio 1366×900 y móvil 390×844; sin desbordamientos de página, texto o controles del chat. Móvil usa una columna; agente, respuesta completa y fuente legibles, sin solapamientos.
- **Contratos y construcción:** SDL compuesto válido y OpenAPI 3.1 de MS-04 con referencias resueltas; typechecks Gateway/React en Node 26, sintaxis/imports Python y ejecución en Python 3.15. Imágenes MS-04/Gateway/Abogado/Shell construidas y desplegadas. Aprovisionamiento explícito de índices sin sobrescribir revisiones; sin dependencias nuevas ni migraciones SQL de MS-01.
- **Limpieza:** 13 binarios y metadatos documentales, conversaciones/generaciones/recibos de las tres cuentas sintéticas, relaciones jurídicas, expedientes, sesiones y cuentas eliminados. Ambas demos conservadas; configuración privada sin cambios y verificadores fuera del repositorio. Revisión final de secretos, contenido en logs y formato registrada antes del informe.
- **Integración de 012:** con informes OpenAI/PDF/tabla realmente guardados en MS-02, seis comprobaciones adicionales construyeron una respuesta nueva del adaptador real de chat con revisión vigente y fuentes REST. Las dos peticiones efectivas incluyeron el contexto autorizado y llamadas a herramientas cerradas; no incluyeron IDs/contenido de informes, notas, fotografías o contacto. Referencia final solo al expediente leído. T03 y C07/C15 confirmados; no se acredita uso de informes por estar prohibido en el prompt solamente.
- **Límite de cierre:** las garantías siguen siendo locales y no certifican calidad jurídica, privacidad contractual del proveedor o réplicas. Alerta previa de la imagen base `node:26-alpine` (1 crítica/7 altas) fuera del alcance, sin cambio de `FROM` ni remediación acreditada.