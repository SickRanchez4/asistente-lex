# Tareas: Configuración de agentes

## Estado

En progreso. Spec y plan aprobados el 2026-11-08. T01 verificada por capas y catálogo operativo aprovisionado. Capacidades propias de T02/T03 implementadas y verificadas por capas; entrega integrada pendiente de credencial de auditoría y flujos reales 007/011. No se crean archivos de testing ni se acredita aceptación autenticada completa.

## Lista de trabajo

Basadas en la [spec](./spec.md) y el [plan](./plan.md). C01–C11 siguen el orden de criterios. MCP está diferido; no convertir estas tareas en una plataforma de conectores.

- [x] **005-T01. Disponer de Penalista y Civilista con configuración y catálogo seguro.**
  - **Valor/entrega:** aprovisionamiento idempotente MongoDB de ambos agentes, instrucciones iniciales de la spec, modelo inicial del entorno y tres herramientas internas. Angular consulta configuración; Abogado obtiene solo nombre/especialidad/disponibilidad. REST permite validar disponibilidad a MS-01/MS-04.
  - **Depende de:** [002-T02](../002-gateway-y-contratos-base/tasks.md), [001-T02](../001-experiencia-y-ui-compartida/tasks.md) y MongoDB de [000](../000-plataforma-base/tasks.md).
  - **Evidencia/validación:** exactamente dos agentes, sin creación/eliminación; reiniciar no sobrescribe configuración. Abogado no obtiene instrucciones/modelo/herramientas y Administrador no recibe conversaciones.
  - **Cobertura:** C01, C06, C08.
  - **Resultado:** preparación v1 explícita/idempotente sobre PyMongo, catálogo fijo y tres herramientas; modelo inicial del entorno elegido por el responsable. Catálogo operativo aprovisionado con ambos habilitados. REST/GraphQL y Angular/React implementados. Comprobados permisos y proyecciones sin configuración para Abogado ni conversaciones para Administrador. Reinicializar no sobrescribe revisiones. El criterio se verificó por capas, no mediante sesión administrativa completa en navegador.

- [ ] **005-T02. Ajustar el comportamiento de los agentes conservando cada cambio aplicado.**
  - **Valor/entrega:** edición Angular de instrucciones, modelo OpenAI como texto y selección de herramientas del catálogo; revisiones inmutables y compare-and-set del vigente, historial consultable y auditoría síncrona a MS-01. No URLs, comandos o claves arbitrarias.
  - **Depende de:** 005-T01 y receptor de eventos de [003-T05](../003-autenticacion-y-acceso/tasks.md).
  - **Evidencia/validación:** siguiente consulta usa revisión nueva, anterior/nuevo/autor/fecha conservados y edición concurrente no se sobrescribe. Auditoría caída da parcial con cambio aplicado. Modelo inválido no se sustituye: comprobar su error real cuando exista [011-T02](../011-asistencia-juridica-ia/tasks.md).
  - **Cobertura:** C02, C06, C07, C08, C09.
  - [x] Edición confirmada de instrucciones/modelo/herramientas cerradas en Angular; DTO REST cerrado y guardas Gateway/MS-04.
  - [x] MongoDB real: inserción inmutable anterior al compare-and-set, conflicto concurrente sin sobrescritura, historial anterior/nuevo/autor/fecha paginado y exclusión de revisiones no publicadas. Fallas antes de inserción y antes del CAS conservan la revisión vigente y no generan auditoría.
  - [x] Captura interna de configuración vigente con política no editable para 011; modelo libre sin sustitución por el inicial.
  - [x] Emisor HTTP síncrono a MS-01 con autor firmado, credencial dedicada, ID/fecha estables y resultado parcial sin reintento. Pruebas HTTP con receptor controlado y fallo de conexión real; cambio guardado conservado.
  - [ ] Configurar `MS04_AUDIT_API_TOKEN` fuera del repositorio y verificar modificación real autenticada desde navegador, evento consultable en 004 y reconocimiento de reenvío en el receptor desplegado. La variable local quedó vacía; no se inventa registro exitoso.
  - [ ] Con 011, verificar uso de la nueva revisión por una pregunta real y rechazo explícito de OpenAI a modelo inválido/no autorizado/incompatible. `OPENAI_API_KEY` está prevista como secreto de entorno, vacía en esta ejecución; no se invoca al proveedor en 005.

- [ ] **005-T03. Controlar disponibilidad sin ocultar agentes ni destruir historial.**
  - **Valor/entrega:** habilitar/deshabilitar desde administración, mostrar motivos y auditar; ambos pueden quedar deshabilitados. Pregunta iniciada puede terminar salvo archivo; nuevas consultas/expedientes exigen agente habilitado y alternativa explícita cuando el inicial no esté disponible.
  - **Depende de:** 005-T01, 005-T02 y flujos reales de [007-T01](../007-expedientes-y-ciclo-de-vida/tasks.md) y [011-T02](../011-asistencia-juridica-ia/tasks.md). Esos flujos usan lectura/validación de 005-T01 y no necesitan esperar esta tarea completa.
  - **Evidencia/validación:** toggle se refleja en selectores, backend rechaza agente deshabilitado, reactivar permite nuevas solicitudes y ambos deshabilitados no borran historial. Verificar pregunta ya iniciada y archivo prioritario de 007.
  - **Cobertura:** C03, C04, C05, C06, C07, C10, C11.
  - [x] Cambios de disponibilidad con revisión esperada, confirmación, auditoría y advertencia sobre ambos deshabilitados, sin ocultar agentes ni perder historial.
  - [x] REST rechaza disponibilidad de deshabilitado con `CONFLICT`; `capture_for_question` rechaza nuevas admisiones y no modifica una instantánea ya capturada. React conserva la selección inicial deshabilitada y exige elegir explícitamente la alternativa.
  - [x] Rehabilitar permite validación de nuevas operaciones. Ambos deshabilitados permanecen visibles/no seleccionables, con motivo y cadena de historial intacta; casos de uso/MongoDB reales y UI con respuestas simuladas.
  - [ ] Integrar creación real de expediente en 007 y nuevas preguntas en 011 con validación autoritativa al admitirlas. Verificar pregunta iniciada que termina tras deshabilitar y resultado descartado al archivar; no existen aún esos flujos.

## Verificación de aceptación

- [ ] El desarrollador revisa los 11 criterios de la [spec](./spec.md), con creación de expedientes, chat y eventos reales. Evidencia propia por capas disponible; aceptación integrada pendiente.
- [x] Ejecutar validaciones propias del [plan](./plan.md), incluidas concurrencia e indisponibilidad, sin crear archivos de testing. Casos que requieren 007/011 y credencial de auditoría permanecen abiertos expresamente.
- [x] Actualizar spec, plan e [índice](../index.md); implementación de catálogo no equivale a integración completa de agentes.

## Registro de verificación

- **31 comprobaciones de núcleo/MongoDB externo real:** catálogo exactamente de dos, herramientas iniciales, reinicialización sin sobrescribir modelo, proyección pública, permisos, ID inexistente, edición, captura antigua/nueva, conflicto obsoleto y carrera de dos CAS con un solo ganador. Historial paginado completo sin duplicados, exclusión de revisión perdedora, rechazo de cursor alterado/otro agente; parcial, deshabilitar ambos, historial intacto, rehabilitar y validaciones. Colecciones temporales aisladas eliminadas al terminar.
- **21 comprobaciones HTTP/FastAPI y emisión:** API real mediante ASGI y MongoDB temporal, sin servicio/no contexto/Abogado, proyección mínima y `no-store`, DTO cerrado, booleano estricto, publicación/ID de evento, contexto/credencial/plazo, evento sin configuración, disponibilidad 409, conflicto 409, paginación inválida 400, resultado parcial de receptor no disponible y ausencia de creación/borrado. Receptor de auditoría controlado: no se acredita escritura real en el MS-01 desplegado.
- **8 comprobaciones adicionales de fallas:** error antes de insertar revisión o antes del CAS no altera vigente ni audita; revisión no publicada ausente de historial. Cliente HTTP real contra puerto inaccesible devuelve fallo. Reinicialización conserva estado. Otra comprobación de ida/vuelta MongoDB y emisor confirmó ID, fecha y cuerpo de evento idénticos tras releer la revisión.
- **10 comprobaciones de resolvers:** anónimo/Abogado no reenviados a MS-04, denegación, identidad firmada y credencial propia, catálogo mínimo sin instrucciones/modelo/herramientas, configuración e historial sin conversaciones/clave inyectadas, resultado parcial conservado. SDL impide pedir configuración privada a través de `availableAgents`. Propietario HTTP controlado.
- **10 comprobaciones del despliegue:** MS-04 `UP`, rechazo sin token y sin contexto administrativo, proyección mínima de dos agentes habilitados, modelo inicial elegido y tres herramientas, disponibilidad y agente inexistente, GraphQL anónimo rechazado y Shell sirve `/admin/agentes`. La lectura administrativa interna usó contexto firmado de verificación, no sesión de cuenta operativa ni escritura sobre el catálogo.
- **Navegador:** acceso real anónimo con cero aplicaciones privadas montadas. Con respuestas simuladas: edición confirmada y herramientas, cancelación, deshabilitar/habilitar, aviso del último agente, parcial conservado si falla historial, conflicto/red incierta bloquean nuevas escrituras hasta consultar estado. React: ambos visibles/deshabilitados, sin configuración privada, selección inicial conservada y alternativa solo explícita. Capturas 1366 x 900 y 390 x 844 revisadas, logo cargado, sin desbordamiento de página ni solapamiento; modal dentro de la pantalla móvil. Simulaciones retiradas al terminar.
- **Compilaciones y contratos:** imágenes MS-04/Python 3.15, Gateway/Node 26, Angular, React y Shell construidas. Typechecks de los cuatro proyectos TypeScript y OpenAPI 3.1 con referencias comunes satisfactorios; SDL completo válido. Sintaxis Python, diagnósticos de archivos afectados, Compose y formato Git comprobados.
- **Entorno y límites:** catálogo operativo inicial preparado expresamente, sin demo ni usuarios de prueba persistentes. `.env` privado ignorado con `AGENT_INITIAL_MODEL=gpt-4o-mini`, `OPENAI_API_KEY` y `MS04_AUDIT_API_TOKEN` vacías. Sin contenedores PostgreSQL/MongoDB, archivos de testing, conexiones externas de herramientas ni llamadas reales OpenAI. Pendientes credencial/auditoría autenticada y criterios dependientes de 007/011; criterios de aceptación no cerrados por simulaciones.