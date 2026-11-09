# Tareas: Expedientes offline

## Estado

Pendiente de ejecución y verificación. Spec y plan aprobados el 2026-11-08.

## Lista de trabajo

Basadas en la [spec](./spec.md) y el [plan](./plan.md). C01–C16 siguen el orden de criterios. La verificación de navegadores, cifrado, quota y funcionamiento sin red es del desarrollador; no se crean archivos de testing.

- [ ] **013-T01. Preparar una copia completa y cifrada antes de habilitarla offline.**
  - **Valor/entrega:** preparación jurídica MS-01, manifiestos/archivos/informes MS-02 por GraphQL y almacenamiento IndexedDB por generación; cifrar datos/binarios con contraseña del login sin segunda contraseña ni clave persistente. Verificar inventario/integridad y publicar completa/fecha solo al terminar, con máximo 10 expedientes y manejo de cuota.
  - **Depende de:** [006-T02](../006-personas/tasks.md), [007-T02](../007-expedientes-y-ciclo-de-vida/tasks.md), [008-T01](../008-participantes/tasks.md), [009-T01](../009-actuaciones-y-notas/tasks.md), [009-T03](../009-actuaciones-y-notas/tasks.md), [010-T02](../010-documentos-y-fotografias/tasks.md), [012-T04](../012-informes-juridicos/tasks.md), [002-T03](../002-gateway-y-contratos-base/tasks.md) y [003-T01](../003-autenticacion-y-acceso/tasks.md).
  - **Evidencia/validación:** inventario completo incluye todas las secciones, notas e informes con fecha, sin ERP/chat; ausencia de informes es válida. Recurso inaccesible, red perdida, quota o undécimo expediente no habilitan copia nueva. Almacenamiento persistente no contiene texto/secreto/clave descifrada.
  - **Cobertura:** C01, C02, C03, C04, C05, C12, C14.

- [ ] **013-T02. Consultar todas las secciones sin red y sin habilitar escritura.**
  - **Valor/entrega:** PWA/Shell/React arrancables offline, desbloqueo con contraseña conocida y lector de copia completa; indicador permanente, fecha/estado descargados y bloqueo de escrituras/chat/generación, sin vencimiento local o colas.
  - **Depende de:** 013-T01 y [001-T02](../001-experiencia-y-ui-compartida/tasks.md).
  - **Evidencia/validación:** cortar red y recargar permite leer ficha, personas, participantes, actuaciones, notas, documentos, fotos e informes; incompleta/corrupta no se presenta válida. Abierto/Cerrado/Archivado son solo lectura y al reconectar no se envía ningún cambio.
  - **Cobertura:** C06, C07, C08, C11, C14.

- [ ] **013-T03. Actualizar, retirar y recuperar copias sin perder la última completa.**
  - **Valor/entrega:** nueva generación solicitada, conservación anterior ante fallo, eliminación local confirmada, limpieza por logout/cambio de cuenta/suspensión conocida y claves solo en memoria. Contraseña cambiada/copia inaccesible informa y permite borrar/redescargar, sin recuperación de claves ni eliminación automática por intento erróneo.
  - **Depende de:** 013-T01, 013-T02, [003-T03](../003-autenticacion-y-acceso/tasks.md), [003-T04](../003-autenticacion-y-acceso/tasks.md) y [004-T02](../004-administracion-y-auditoria/tasks.md).
  - **Evidencia/validación:** actualización completa cambia datos/fecha; fallo mantiene antigua fecha íntegra y error aparte. Eliminar libera cupo y no borra servidor; cerrar/cambiar cuenta limpia solo sus copias. Suspensión se aplica al conocerla online, no se promete revocación sin red ni logout servidor desde una salida local.
  - **Cobertura:** C09, C10, C11, C12, C13, C14, C15, C16.

## Verificación de aceptación

- [ ] El desarrollador revisa los 16 criterios de la [spec](./spec.md) en navegadores/dispositivos de referencia, con recarga realmente sin red.
- [ ] Ejecutar comprobaciones del [plan](./plan.md) de integridad, cifrado y ciclo de sesión; registrar evidencia/bloqueos sin crear archivos de testing.
- [ ] Actualizar spec, plan e [índice](../index.md); ni la instalación PWA ni IndexedDB con datos acreditan por sí solos una copia completa.