# Tareas: Servicios y honorarios

## Estado

Pendiente de ejecución y verificación. Spec y plan aprobados el 2026-11-08.

## Lista de trabajo

Basadas en la [spec](./spec.md) y el [plan](./plan.md). C01–C13 siguen el orden de criterios. Migraciones MS-03, aritmética exacta, contratos, capas y React se entregan con servicios utilizables, no como tareas atómicas.

- [ ] **014-T01. Registrar encargos independientes con contratante y honorarios BOB.**
  - **Valor/entrega:** varios servicios por expediente, Persona propia sin exigir participación, descripción, cero BOB permitido y modalidad Pago único/Pagos parciales. MS-03 consulta MS-01 por pertenencia/estado en cada escritura; dinero exacto con máximo dos decimales y migraciones/BCMath pertinentes.
  - **Depende de:** [006-T02](../006-personas/tasks.md), [007-T02](../007-expedientes-y-ciclo-de-vida/tasks.md), [003-T02](../003-autenticacion-y-acceso/tasks.md), [002-T02](../002-gateway-y-contratos-base/tasks.md) y [001-T02](../001-experiencia-y-ui-compartida/tasks.md).
  - **Evidencia/validación:** dos servicios con distintos contratantes/condiciones coexisten; Persona distinta de defendida aceptada. Abierto/Cerrado admitidos, Archivado/ajeno/MS-01 caído rechazados, sin guardar éxito ficticio. Negativo/más de dos decimales rechazados, cero permitido.
  - **Cobertura:** C01, C02, C03, C04, C05, C09, C10, C11.

- [ ] **014-T02. Consultar acuerdos y su historial sin restricciones de escritura.**
  - **Valor/entrega:** listado/ficha/historial React y lectura MS-03 limitada a cuenta, en todos los estados, con importes exactos y proyección utilizable por cobros/panel.
  - **Depende de:** 014-T01.
  - **Evidencia/validación:** servicios/historial visibles incluso en Archivado cuando exista ese estado; Administrador/A sobre B rechazados y error no se representa como resultado vacío.
  - **Cobertura:** C08, C09, C10.

- [ ] **014-T03. Cambiar condiciones sin contradecir pagos registrados.**
  - **Valor/entrega:** descripción/honorarios/modalidad editables, contratante/expediente fijos; historial anterior/nuevo/fecha/autor y bloqueo concurrente por servicio con cobros. No anular/eliminar ni reducir honorarios bajo cobrado.
  - **Depende de:** 014-T01, 014-T02 y cobros efectivos de [015-T01](../015-cobros-y-gastos/tasks.md), que no exige esta tarea completa.
  - **Evidencia/validación:** modificación válida queda vigente e histórica; reducir bajo cobrado o escribir Archivado rechaza, también ante cobro concurrente. Falla de historial no confirma cambio y no hay operaciones de anulación/eliminación.
  - **Cobertura:** C04, C05, C06, C07, C09, C10, C12, C13.

## Verificación de aceptación

- [ ] El desarrollador revisa los 13 criterios de la [spec](./spec.md) con personas, estados y cobros reales.
- [ ] Ejecutar validaciones del [plan](./plan.md), exactitud y concurrencia; sin archivos de testing ni herramientas ERP adicionales.
- [ ] Actualizar spec, plan e [índice](../index.md); compatibilidad con cobros no se cierra solo con un formulario de honorarios.