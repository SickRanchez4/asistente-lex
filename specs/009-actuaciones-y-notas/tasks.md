# Tareas: Actuaciones y notas

## Estado

Pendiente de ejecución y verificación. Spec y plan aprobados el 2026-11-08.

## Lista de trabajo

Basadas en la [spec](./spec.md) y el [plan](./plan.md). C01–C12 siguen el orden de criterios. No mezclar entidades ni crear una tarea por tabla, formulario o endpoint.

- [ ] **009-T01. Registrar y recorrer la cronología jurídica del caso.**
  - **Valor/entrega:** actuación con catálogo, fecha civil hoy/pasada de Bolivia y descripción; cronología estable, filtros tipo/período, validación MS-01, persistencia, GraphQL y React.
  - **Depende de:** [007-T02](../007-expedientes-y-ciclo-de-vida/tasks.md), [003-T02](../003-autenticacion-y-acceso/tasks.md), [002-T02](../002-gateway-y-contratos-base/tasks.md) y [001-T02](../001-experiencia-y-ui-compartida/tasks.md).
  - **Evidencia/validación:** hechos guardados en orden por fecha, coincidencias de filtros y datos incompletos/futuros rechazados; consulta propia en todos los estados y sin notas en cronología.
  - **Cobertura:** C01, C02, C04, C06, C07, C09, C10, C11.

- [ ] **009-T02. Corregir actuaciones manteniendo la evidencia anterior.**
  - **Valor/entrega:** corrección solo Abierto y registro atómico de valor anterior/fecha/autor; UI presenta valor vigente sin borrar historial jurídico.
  - **Depende de:** 009-T01 y estados reales de [007-T03](../007-expedientes-y-ciclo-de-vida/tasks.md) y [007-T04](../007-expedientes-y-ciclo-de-vida/tasks.md).
  - **Evidencia/validación:** corregir deja anterior verificable y nuevo visible; falla de historial no confirma cambio, futuro/no abierto/cuenta ajena rechazados.
  - **Cobertura:** C03, C06, C09, C10, C11.

- [ ] **009-T03. Mantener notas privadas separadas de cronología y fuentes de IA.**
  - **Valor/entrega:** registro, búsqueda, consulta y corrección del texto vigente, fecha y marca contractual privada; solo propietario con conexión, escritura solo Abierto. Sin versiones ni borrado; preparar su lectura autorizada para copia offline, nunca para proveedores IA.
  - **Depende de:** [007-T02](../007-expedientes-y-ciclo-de-vida/tasks.md), [003-T02](../003-autenticacion-y-acceso/tasks.md), [002-T02](../002-gateway-y-contratos-base/tasks.md) y [001-T02](../001-experiencia-y-ui-compartida/tasks.md).
  - **Integración:** las notas no esperan a 009-T02; son una entidad independiente de las correcciones de actuaciones.
  - **Evidencia/validación:** nota con fecha fuera de cronología, corrección sin versiones, escritura no abierta rechazada y otros roles/cuentas sin texto privado. Comprobar exclusión real de contexto con 011/012 y presencia en copia propia con 013 al integrarlas.
  - **Cobertura:** C05, C06, C07, C08, C09, C10, C12.

## Verificación de aceptación

- [ ] El desarrollador revisa los 12 criterios de la [spec](./spec.md), incluyendo contexto IA sin notas y fecha de Bolivia.
- [ ] Ejecutar validaciones del [plan](./plan.md), sin crear archivos de testing ni registros que contengan notas.
- [ ] Actualizar spec, plan e [índice](../index.md); la marca privada por sí sola no demuestra exclusión en consumidores.