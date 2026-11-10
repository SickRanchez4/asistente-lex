# Tareas: Actuaciones y notas

## Estado

En progreso. Spec y plan aprobados el 2026-11-08. Ejecución propietaria verificada el 2026-11-09: 009-T01 y 009-T02 completas. C01–C12 confirmados tras la verificación de consumidores reales 011/012 el 2026-11-10; 009-T03 conserva pendiente solo la integración de copia propia con 013.

## Lista de trabajo

Basadas en la [spec](./spec.md) y el [plan](./plan.md). C01–C12 siguen el orden de criterios. No mezclar entidades ni crear una tarea por tabla, formulario o endpoint.

- [x] **009-T01. Registrar y recorrer la cronología jurídica del caso.**
  - **Valor/entrega:** actuación con catálogo, fecha civil hoy/pasada de Bolivia y descripción; cronología estable, filtros tipo/período, validación MS-01, persistencia, GraphQL y React.
  - **Depende de:** [007-T02](../007-expedientes-y-ciclo-de-vida/tasks.md), [003-T02](../003-autenticacion-y-acceso/tasks.md), [002-T02](../002-gateway-y-contratos-base/tasks.md) y [001-T02](../001-experiencia-y-ui-compartida/tasks.md).
  - **Evidencia/validación:** hechos guardados en orden por fecha, coincidencias de filtros y datos incompletos/futuros rechazados; consulta propia en todos los estados y sin notas en cronología.
  - **Cobertura:** C01, C02, C04, C06, C07, C09, C10, C11.
  - **Resultado:** catálogo completo, fecha civil estricta/no futura en Bolivia, descripción obligatoria, cronología fecha/ID ascendente, filtros inclusivos, cursores ligados a cuenta/caso/filtro y lectura en los tres estados. Rechazo autoritativo de datos incompletos, otros roles/cuentas y escritura no Abierto; separación de notas comprobada por API y navegador.

- [x] **009-T02. Corregir actuaciones manteniendo la evidencia anterior.**
  - **Valor/entrega:** corrección solo Abierto y registro atómico de valor anterior/fecha/autor; UI presenta valor vigente sin borrar historial jurídico.
  - **Depende de:** 009-T01 y estados reales de [007-T03](../007-expedientes-y-ciclo-de-vida/tasks.md) y [007-T04](../007-expedientes-y-ciclo-de-vida/tasks.md).
  - **Evidencia/validación:** corregir deja anterior verificable y nuevo visible; falla de historial no confirma cambio, futuro/no abierto/cuenta ajena rechazados.
  - **Cobertura:** C03, C06, C09, C10, C11.
  - **Resultado:** actualización e historial anterior/nuevo/fecha/autor en una transacción, bloqueo de expediente compartido con cierre y versión propia de actuación. Fallo forzado de historial revierte texto/versión; conflicto conserva formulario y exige consulta. Sin eliminación ni API de edición del historial. Archivado controlado verifica la regla de 009, no el borrado de conversaciones de 007/011.

- [ ] **009-T03. Mantener notas privadas separadas de cronología y fuentes de IA.**
  - **Valor/entrega:** registro, búsqueda, consulta y corrección del texto vigente, fecha y marca contractual privada; solo propietario con conexión, escritura solo Abierto. Sin versiones ni borrado; preparar su lectura autorizada para copia offline, nunca para proveedores IA.
  - **Depende de:** [007-T02](../007-expedientes-y-ciclo-de-vida/tasks.md), [003-T02](../003-autenticacion-y-acceso/tasks.md), [002-T02](../002-gateway-y-contratos-base/tasks.md) y [001-T02](../001-experiencia-y-ui-compartida/tasks.md).
  - **Integración:** las notas no esperan a 009-T02; son una entidad independiente de las correcciones de actuaciones.
  - **Evidencia/validación:** nota con fecha fuera de cronología, corrección sin versiones, escritura no abierta rechazada y otros roles/cuentas sin texto privado. Comprobar exclusión real de contexto con 011/012 y presencia en copia propia con 013 al integrarlas.
  - **Cobertura:** C05, C06, C07, C08, C09, C10, C12.
  - **Resultado propietario verificado:** entidad/endpoints/consultas/listado separados, `privacy: OWNER_ONLY` validada por Gateway y recibida en React, búsqueda literal sin distinguir mayúsculas, fecha de servidor inmutable y solo texto vigente. Versión técnica para concurrencia sin historial de texto; no eliminación, auditoría de contenido, almacenamiento en navegador ni envío a proveedores. Conexión obligatoria; corrección concurrente y escritura no Abierto rechazadas. Errores y logs comprobados sin contenido privado.
  - **Integración IA verificada:** 011/012 reales prepararon contextos de chat/todas las variantes de informe sin notas, con notas sintéticas identificables presentes en MS-01 y cuerpo OpenAI inspeccionado en memoria. C12 confirmada; no solo marca privada o ausencia de llamadas.
  - **Pendiente integrado:** con 013, verificar que la copia propia incluye notas con autorización. No se implementó copia offline ni se cierra esa parte de T03.

## Evidencia de ejecución

- 22 comprobaciones de dominio, 137 PostgreSQL/JDBC y 115 REST/GraphQL reales; validadores temporales fuera del repositorio. Validación de fecha de Bolivia en ambos lados del cambio de día UTC, filtros y empates, versiones obsoletas, rollback atómico y las cuatro escrituras frente a cierre concurrente en ambos órdenes.
- Navegador real: registro/corrección de ambas entidades, fechas futuras conservando formulario, filtros y búsqueda, paginación 25 + 2 independiente, conflictos de cierre/corrección y consulta de estado vigente. Fallos controlados distinguidos de vacío/éxito; sin reintento automático de escritura incierta. Desconexión/reconexión y solo lectura comprobadas.
- Presentación de escritorio/móvil (1366 × 900 y 390 × 844), logo cargado y texto largo dentro del ancho. Refrescar ficha no duplica secciones React.
- Tipos de Gateway/Shell/Abogado/Admin en Node 26; SDL y OpenAPI válidos. V7 aplicada expresamente y construcción/despliegue local de MS-01/Gateway/Abogado/Shell correctos. Datos sintéticos eliminados, sesión de navegador cerrada y dos demos existentes conservadas. Sin llamadas OpenAI ni publicación Git.

## Verificación de aceptación

- [ ] El desarrollador revisa los 12 criterios de la [spec](./spec.md), incluyendo contexto IA sin notas y fecha de Bolivia.
  - Revisados los 12: C01–C12 verificados, incluida exclusión real en 011/012. Fecha de Bolivia y ausencia de historial de notas comprobadas; T03 mantiene la integración offline de 013.
- [ ] Ejecutar validaciones del [plan](./plan.md), sin crear archivos de testing ni registros que contengan notas.
  - Ejecutadas las validaciones del alcance propio, sin archivos de testing en el repositorio ni logs con notas; quedan las integraciones documentadas de 009-T03.
- [x] Actualizar spec, plan e [índice](../index.md); la marca privada por sí sola no demuestra exclusión en consumidores.