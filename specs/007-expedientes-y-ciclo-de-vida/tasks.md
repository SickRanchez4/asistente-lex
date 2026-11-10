# Tareas: Expedientes y ciclo de vida

## Estado

En progreso. Spec y plan aprobados el 2026-11-08. T01/T03 completas; implementación propia de T02/T04/T05 disponible, con comprobaciones integradas aún bloqueadas por 008/009/010/011. No se declara completa la spec ni se implementó chat fuera de alcance.

## Lista de trabajo

Basadas en la [spec](./spec.md) y el [plan](./plan.md). C01–C15 siguen el orden de criterios. Los cortes de entrega separan operaciones útiles, no capas; archivo se integra después del contrato de eliminación de MS-04, sin exigir chat completo para empezar los expedientes.

- [x] **007-T01. Abrir expedientes propios con agente válido y código único.**
  - **Valor/entrega:** registro React, caso de uso MS-01, migraciones e índices, GraphQL/REST y consulta de disponibilidad de MS-04; descripción opcional, Abierto inicial y código único por cuenta.
  - **Depende de:** [003-T02](../003-autenticacion-y-acceso/tasks.md), [002-T02](../002-gateway-y-contratos-base/tasks.md), [001-T02](../001-experiencia-y-ui-compartida/tasks.md) y catálogo de [005-T01](../005-configuracion-de-agentes/tasks.md).
  - **Evidencia/validación:** expediente válido creado; datos faltantes, agente no habilitado/indisponible y código duplicado rechazados por backend. Concurrencia no duplica código y otra cuenta puede repetirlo.
  - **Cobertura:** C01, C02, C03, C12, C13.

- [ ] **007-T02. Encontrar, consultar y corregir la ficha del expediente.**
  - **Valor/entrega:** listado/filtros estado/área/código/título, ficha en todos los estados y edición solo Abierto de los cinco campos permitidos. REST de pertenencia/estado para consumidores, sin relaciones entre almacenes.
  - **Depende de:** 007-T01.
  - **Evidencia/validación:** editar datos y agente inicial habilitado respeta unicidad; Cerrado/Archivado son solo lectura. Cambio de agente inicial no toca chats existentes y chats nuevos usan el vigente al integrarse 011; no filtra datos de otra cuenta.
  - **Cobertura:** C04, C05, C12, C13, C14.
  - [x] Listado paginado con cuatro filtros, ficha, edición de los cinco campos en Abierto, CAS, unicidad y autorización propietaria; Cerrado/Archivado rechazados por backend.
  - [x] REST mínimo de elegibilidad con estado/pertenencia y marca técnica; GraphQL y React integrados, sin acceso entre almacenes.
  - [ ] Verificar agente e historial de chats existentes y agente inicial de chats nuevos (C14, requiere 011).

- [x] **007-T03. Cerrar y reabrir expedientes con historial de transiciones.**
  - **Valor/entrega:** acciones y contratos de Abierto→Cerrado y Cerrado→Abierto, registro anterior/nuevo/fecha/autor en la misma transacción y protección concurrente.
  - **Depende de:** 007-T02.
  - **Evidencia/validación:** cambios legales efectivos e historial consultable; transiciones ilegales y cambios de ficha no abiertos rechazados también directamente. Dos solicitudes simultáneas no crean una transición duplicada.
  - **Cobertura:** C05, C06, C11, C12.

- [ ] **007-T04. Archivar sin ocultar pérdida de conversaciones ni fallos parciales.**
  - **Valor/entrega:** confirmación irreversible, marca técnica de intento, exclusión de nuevas preguntas, eliminación MS-04 antes de guardar Archivado/historial y reanudación segura ante incertidumbre. Sin nuevo estado de negocio, transacción distribuida o cola.
  - **Depende de:** 007-T03 y eliminación real de [011-T04](../011-asistencia-juridica-ia/tasks.md).
  - **Evidencia/validación:** cancelar no llama backend; confirmar elimina todos los chats y archiva. Falla de eliminación conserva Cerrado; falla posterior informa pérdida y reintentar completa sin duplicar historial. Respuesta IA pendiente no restaura chats, tampoco tras timeout/reinicio.
  - **Cobertura:** C06, C07, C08, C09, C11, C12, C15.
  - [x] Confirmación irreversible; cancelar no llama backend. Intento persistido antes de REST, rechazo de reapertura y elegibilidad negativa durante incertidumbre; mismo intento al reintentar.
  - [x] Orden borrado→transacción de Archivado/historial y fallo parcial comprobados con puerto controlado. Repositorio y PostgreSQL reales; no equivale a borrar conversaciones reales.
  - [x] Fallo real de MS-04 sin handler: Cerrado, marca conservada, sin historial falso ni éxito; navegador informa posible pérdida irreversible y exige consulta vigente.
  - [ ] Borrado real completo y generación/recibo durable en MS-04, respuesta tardía, timeout y reinicio sin recreación de conversaciones (011-T04; C06 integrado, C07, C09, C15).

- [ ] **007-T05. Recuperar acceso de consulta al desarchivar, sin restaurar chats.**
  - **Valor/entrega:** Archivado→Cerrado y su historial; contenido jurídico/documentos intactos y conversaciones nuevas vacías. Aplicar la matriz completa de transiciones sin reabrir automáticamente.
  - **Depende de:** 007-T04 y datos reales consultables de 008, 009 y [010-T02](../010-documentos-y-fotografias/tasks.md) para verificar conservación.
  - **Evidencia/validación:** desarchivo deja Cerrado, datos previos intactos y ningún historial de IA anterior; transición directa a Abierto se rechaza.
  - **Cobertura:** C05, C06, C10, C11, C12.
  - [x] Caso de uso/REST/GraphQL/acción React de Archivado→Cerrado; historial atómico, consulta y prohibición de edición/reapertura directa. Persistencia verificada con archivo confirmado por puerto controlado.
  - [ ] Verificar conservación de participantes, actuaciones y documentos reales y ausencia de conversaciones anteriores (C10, requiere 008/009/010/011).

## Verificación de aceptación

- [ ] El desarrollador revisa los 15 criterios de la [spec](./spec.md) con la matriz completa de estados y conversaciones/documentos reales.
- [x] Ejecutar verificaciones disponibles del [plan](./plan.md) y registrar límites; sin archivos de testing en el repositorio.
- [ ] Completar fallos con conversaciones reales, respuesta tardía y reinicio/reintento al disponer de 011.
- [x] Actualizar spec, plan e [índice](../index.md); implementación de cerrar/reabrir no acredita archivo o desarchivo completos.

## Registro de verificación

- **Compilación y contratos:** MS-01 con JDK 25; Gateway, Abogado y Shell con Node 26. Tipos de Gateway, Abogado, Shell y Admin comprobados; SDL compuesto válido y ambos OpenAPI 3.1 válidos con referencias resueltas. Sin nuevas dependencias de aplicación.
- **Dominio:** 14 comprobaciones iniciales de matriz de transiciones y validación de campos, incluido código textual con ceros y recorte exterior.
- **Servicio/PostgreSQL:** 64 comprobaciones con repositorio real y cuentas sintéticas, repetidas tras el ajuste final del caso de uso. Incluyen autorización vigente, cuenta ajena/Administrador/contexto inconsistente, código duplicado al crear/editar y otra cuenta, filtros combinados literales, cursores ligados a cuenta/filtros/expediente, paginación, edición, agente cambiado/no cambiado, tres carreras de alta/edición/transición con un único ganador e historial sin duplicados. Un fallo FK al escribir historial revirtió también el estado. Matriz de 12 combinaciones validada.
- **Archivo controlado:** marca persistida y elegibilidad negativa antes de llamar al puerto, eliminación fallida, fallo local tras confirmación, mismo intento a través de reintentos, retiro de marca solo con Archivado/historial, desarchivo a Cerrado y conservación de ficha. Se controló el puerto de IA, no se simularon conversaciones como evidencia de aceptación integrada.
- **Adaptador HTTP:** 41 comprobaciones con servidor controlado: contexto presente, disponibilidad válida/deshabilitada/inexistente/indisponible, JSON nulo/inválido, ID/intento incorrectos, borrado no confirmado, generación no entera o no positiva, sin seguimiento de redirección y plazo agotado sin llamada. No se llamó a OpenAI.
- **REST/GraphQL reales:** 32 comprobaciones con dos cuentas sintéticas y Administrador demo existente. Alta/cambio de agente con disponibilidad real de MS-04, errores de campo, código por cuenta, contexto firmado, denegación ajena/Administrador/suspendido, `no-store`, proyecciones cerradas, cierre/reapertura y elegibilidad. El borrado aún inexistente en MS-04 produjo `503`, no Archivado; reintento conservó intento y no creó historial falso. Las sesiones de comprobación se cerraron.
- **Navegador real:** alta/edición, cuatro filtros combinados, vacío y limpieza, ficha Cerrado no editable, historial con fecha/autor, confirmación irreversible, cancelar sin mutación y confirmar una sola vez. Fallo real de archivo mostró incertidumbre, consulta vigente, marca y reapertura deshabilitada. Conflicto real con una edición concurrente conservó valores y bloqueó reenvío hasta consultar. Se corrigió y repitió la primera página de historial con `after:null`, que antes se enviaba a REST como texto. Fallo de lectura controlado distinto de vacío y recuperación real; interceptor retirado.
- **Presentación:** capturas a 1366×900 y 390×844; imagen de marca cargada, botones y diálogo dentro del viewport, sin desbordamiento de página. Las columnas de tablas desplazan dentro de su contenedor móvil.
- **Preparación y limpieza:** V5 aplicada expresamente en PostgreSQL externo; sin PostgreSQL/MongoDB en Compose ni cambios de secretos. Cuentas sintéticas, expedientes, transiciones y sesiones eliminados; demos y datos ajenos conservados. Verificadores temporales fuera del repositorio. No commit ni push de esta entrega.
- **Aceptación:** C01–C05, C08, C11–C13 verificadas en la capacidad propietaria. C06 tiene matriz y persistencia comprobadas, pero queda abierto junto a C07/C09/C10/C14/C15 hasta disponer de conversaciones y contenido reales. La elegibilidad publicada no acredita por sí sola el bloqueo/descarte dentro de MS-04.