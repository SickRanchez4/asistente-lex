# Tareas: Panel económico

## Estado

Pendiente de ejecución y verificación. Spec y plan aprobados el 2026-11-08.

## Lista de trabajo

Basadas en la [spec](./spec.md) y el [plan](./plan.md). C01–C13 siguen el orden de criterios. Solo consultas/exportaciones MS-03 y React, sin nuevos almacenes analíticos o reglas fiscales.

- [ ] **016-T01. Conocer la situación y deuda real de un expediente con detalle verificable.**
  - **Valor/entrega:** honorarios/cobros/gastos separados y saldo pendiente real, con todos los valores efectivos; agregación sin multiplicar joins y detalle paginado coherente con total. Todos los estados, BOB exacto y cuenta aislada.
  - **Depende de:** [014-T02](../014-servicios-y-honorarios/tasks.md), [014-T03](../014-servicios-y-honorarios/tasks.md), [015-T03](../015-cobros-y-gastos/tasks.md), [002-T02](../002-gateway-y-contratos-base/tasks.md) y [001-T02](../001-experiencia-y-ui-compartida/tasks.md).
  - **Evidencia/validación:** suma del detalle igual al total tras varios servicios, pagos y correcciones, sin contar versiones anteriores; gastos no reducen deuda. Archivados incluidos, ajenos/Administrador rechazados, ninguna lectura modifica movimientos.
  - **Cobertura:** C01, C03, C04, C05, C09, C10.

- [ ] **016-T02. Consultar el balance de un período sin confundirlo con deuda actual.**
  - **Valor/entrega:** modo separado para toda cuenta, mes de Bolivia por defecto y rangos civiles inclusivos; honorarios vigentes por registro de servicio, cobros/gastos por sus fechas. Balance temporal, no saldo pendiente; sin combinación de modos o agrupaciones adicionales.
  - **Depende de:** 016-T01.
  - **Evidencia/validación:** fechas dentro/fuera/límites seleccionan correctamente, período inválido da error y sin registros da vacío. Cobros de servicios anteriores pueden producir balance negativo etiquetado, sin alterar saldo del expediente ni descontar gastos.
  - **Cobertura:** C02, C03, C04, C07, C08, C09, C10, C11, C12.

- [ ] **016-T03. Exportar el conjunto económico mostrado sin perder filas ni privacidad.**
  - **Valor/entrega:** CSV de seis columnas acordadas, toda la tabla de detalle, formato UTF-8/`;`/fecha/coma decimal, sin PII ni fila artificial de saldo; Base64 protegido y escape documentado. Ante cambios concurrentes, mantener consulta/total/detalle/exportación coherentes.
  - **Depende de:** 016-T01, 016-T02 y transporte de [002-T03](../002-gateway-y-contratos-base/tasks.md). Reutiliza la convención de 012, no requiere ejecutar otro servicio para exportar MS-03.
  - **Evidencia/validación:** leer CSV reproduce filas/valores de todas las páginas y seis columnas, incluidos comillas/saltos/decimales; ninguna cuenta ajena ni fórmula ejecutada por contenido exportado. Exportar no modifica movimientos ni comunica éxito de un archivo incompleto.
  - **Cobertura:** C04, C06, C09, C10, C13.

## Verificación de aceptación

- [ ] El desarrollador revisa los 13 criterios de la [spec](./spec.md) con movimientos y correcciones reales, no totales calculados manualmente en UI.
- [ ] Ejecutar validaciones del [plan](./plan.md), suma exacta, límites de fechas, concurrencia y CSV; sin archivos nuevos de testing.
- [ ] Actualizar spec, plan e [índice](../index.md). La consulta/exportación queda completa solo al coincidir datos, detalle y resultados.