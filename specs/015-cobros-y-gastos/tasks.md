# Tareas: Cobros y gastos

## Estado

Pendiente de ejecución y verificación. Spec y plan aprobados el 2026-11-08.

## Lista de trabajo

Basadas en la [spec](./spec.md) y el [plan](./plan.md). C01–C14 siguen el orden de criterios. No se implementa deduplicación, idempotencia, pagos electrónicos, anulación o eliminación.

- [ ] **015-T01. Registrar cobros y conocer el saldo exacto del servicio.**
  - **Valor/entrega:** cobro/historial/saldo React y MS-03 con importe positivo de máximo dos decimales, fecha y medio del catálogo. Validar estado/pertenencia remotos, conservar estado observado y serializar saldo con condiciones del servicio en transacción local.
  - **Depende de:** [014-T01](../014-servicios-y-honorarios/tasks.md), [014-T02](../014-servicios-y-honorarios/tasks.md), [007-T02](../007-expedientes-y-ciclo-de-vida/tasks.md), [002-T02](../002-gateway-y-contratos-base/tasks.md) y [001-T02](../001-experiencia-y-ui-compartida/tasks.md).
  - **Evidencia/validación:** parcial reduce saldo exacto, total lo deja cero, sobrepago/importe inválido/Archivado/MS-01 caído rechazan. Dos cobros concurrentes no exceden saldo; iguales datos pueden registrarse si aún caben. Incertidumbre de respuesta no dispara reenvío automático.
  - **Cobertura:** C01, C02, C03, C04, C06, C07, C09, C10, C11, C12.

- [ ] **015-T02. Registrar y encontrar gastos sin alterar la deuda del servicio.**
  - **Valor/entrega:** concepto/categoría/fecha/importe positivo BOB, historial y filtros categoría/período por expediente; estado observado guardado y consulta en cualquier estado. Sin control de duplicados.
  - **Depende de:** capacidades monetarias de 015-T01 y estado de [007-T02](../007-expedientes-y-ciclo-de-vida/tasks.md).
  - **Evidencia/validación:** gasto válido se consulta por filtros correctos, no cambia honorarios/saldo y gastos iguales se permiten. Inválidos, escritura Archivado, cuenta ajena o MS-01 caído rechazan sin éxito.
  - **Cobertura:** C04, C05, C06, C07, C09, C10, C11, C12, C13.

- [ ] **015-T03. Corregir movimientos preservando trazabilidad y saldos.**
  - **Valor/entrega:** corrección de cobro/gasto solo Abierto/Cerrado con anterior/fecha/autor y estados observados conservados; recalcular con valor efectivo, sin doble contabilización. Mismo control por servicio de cambios económicos; no anular/eliminar.
  - **Depende de:** 015-T01, 015-T02, [014-T03](../014-servicios-y-honorarios/tasks.md) y estados reales de [007-T03](../007-expedientes-y-ciclo-de-vida/tasks.md) y [007-T04](../007-expedientes-y-ciclo-de-vida/tasks.md).
  - **Evidencia/validación:** nuevo valor visible y anterior verificable, saldo exacto tras corregir y consulta en Archivado; escribir allí rechaza. Corrección/cobro/honorario concurrentes no sobrecobran; falla de historial no confirma operación y el contrato no ofrece anulación/borrado.
  - **Cobertura:** C03, C04, C06, C07, C08, C09, C10, C11, C14.

## Verificación de aceptación

- [ ] El desarrollador revisa los 14 criterios de la [spec](./spec.md), incluida ausencia explícita de deduplicación y estado observado, no atomicidad global.
- [ ] Ejecutar validaciones del [plan](./plan.md) y registrar evidencia, sin archivos de testing ni secretos/datos financieros en logs.
- [ ] Sincronizar spec, plan e [índice](../index.md); registrar un movimiento no acredita correcciones ni exactitud concurrente.