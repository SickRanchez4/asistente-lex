# Tareas: Participantes

## Estado

Pendiente de ejecución y verificación. Spec y plan aprobados el 2026-11-08.

## Lista de trabajo

Basadas en la [spec](./spec.md) y el [plan](./plan.md). C01–C10 siguen el orden de criterios. Historial interno sin pantalla; ficha Persona y contratación siguen independientes.

- [ ] **008-T01. Vincular y consultar participantes con su rol contextual.**
  - **Valor/entrega:** selección de Persona propia, catálogo de cuatro roles y Otro con detalle, lista del expediente, contratos y persistencia MS-01 con una participación por persona/expediente; trazabilidad interna de vinculación.
  - **Depende de:** personas de [006-T02](../006-personas/tasks.md), expediente de [007-T02](../007-expedientes-y-ciclo-de-vida/tasks.md), [002-T02](../002-gateway-y-contratos-base/tasks.md) y [001-T02](../001-experiencia-y-ui-compartida/tasks.md).
  - **Evidencia/validación:** misma persona tiene roles distintos entre expedientes; segunda vinculación/Persona ajena/inexistente/rol inválido/Otro vacío rechazados. Consultar no exige Abierto, modificar sí; comprobar estados al existir 007-T03/007-T04.
  - **Cobertura:** C01, C02, C05, C06, C07, C08, C09.

- [ ] **008-T02. Corregir o retirar participaciones conservando personas y servicios.**
  - **Valor/entrega:** cambio de rol y desvinculación en Abierto, confirmación de alcance y historial interno en transacción; sin alterar Persona, contratante o condiciones de un servicio.
  - **Depende de:** 008-T01, [007-T03](../007-expedientes-y-ciclo-de-vida/tasks.md), [007-T04](../007-expedientes-y-ciclo-de-vida/tasks.md) y servicios reales de [014-T01](../014-servicios-y-honorarios/tasks.md).
  - **Evidencia/validación:** rol actualizado, relación eliminada y ficha/servicio intactos; todas las escrituras rechazadas en Cerrado/Archivado y ante cuenta ajena. No existe API de historial para Abogado.
  - **Cobertura:** C03, C04, C05, C07, C09, C10.

## Verificación de aceptación

- [ ] El desarrollador revisa los 10 criterios de la [spec](./spec.md), con personas y servicios verdaderamente vinculados.
- [ ] Ejecutar validaciones del [plan](./plan.md), incluida concurrencia con cierre del expediente; no crear archivos de testing.
- [ ] Sincronizar spec, plan e [índice](../index.md); no marcar completa sin verificar conservación del contratante.