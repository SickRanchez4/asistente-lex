# Tareas: Personas

## Estado

Pendiente de ejecución y verificación. Spec y plan aprobados el 2026-11-08.

## Lista de trabajo

Basadas en la [spec](./spec.md) y el [plan](./plan.md). C01–C12 siguen el orden de criterios. Contratos, migraciones MS-01, validaciones, Gateway y React forman parte de cada entrega, no tareas separadas.

- [ ] **006-T01. Registrar personas propias aun sin conocer su identificación.**
  - **Valor/entrega:** formulario natural/jurídica y caso de uso con campos obligatorios por tipo, identificación vacía o completa, tipo de documento libre y contacto/domicilio opcionales. Normalización coherente e índice único por cuenta/terna contra duplicados concurrentes.
  - **Depende de:** [003-T02](../003-autenticacion-y-acceso/tasks.md), [002-T02](../002-gateway-y-contratos-base/tasks.md) y [001-T02](../001-experiencia-y-ui-compartida/tasks.md).
  - **Evidencia/validación:** registros válidos quedan consultables; faltantes/parciales/duplicados propios rechazados con campos y datos conservados. Misma identificación en otra cuenta o distinta terna permitida, sin revelar datos ajenos.
  - **Cobertura:** C01, C02, C03, C04, C05, C06, C11.

- [ ] **006-T02. Encontrar y consultar fichas reutilizables de la propia cuenta.**
  - **Valor/entrega:** listado paginado, búsqueda por nombre/razón social/documento y filtro por tipo, ficha y proyección de selección para participantes/contratantes, sin duplicar Persona en otro servicio.
  - **Depende de:** 006-T01.
  - **Evidencia/validación:** coincidencias propias y estados vacío/error distintos; A no ve B y Administrador no consulta fichas mediante API directa. La ficha sirve para selección real en 008/014 al integrarse.
  - **Cobertura:** C08, C09, C10.

- [ ] **006-T03. Corregir fichas y completar identificación sin depender del estado del expediente.**
  - **Valor/entrega:** actualización de datos propios y unicidad excluyendo la ficha editada; conservar identificador para vínculos existentes y mostrar ficha vigente sin modificar participaciones.
  - **Depende de:** 006-T01, 006-T02; la comprobación de edición en expedientes no abiertos requiere [008-T01](../008-participantes/tasks.md), [007-T03](../007-expedientes-y-ciclo-de-vida/tasks.md) y [007-T04](../007-expedientes-y-ciclo-de-vida/tasks.md), que solo necesitan las capacidades anteriores de personas.
  - **Evidencia/validación:** completar documento en ficha existente, rechazar colisión y editar persona que solo participa en Cerrado/Archivado conservando sus relaciones. API de otra cuenta no actualiza la ficha.
  - **Cobertura:** C04, C07, C09, C11, C12.

## Verificación de aceptación

- [ ] El desarrollador revisa los 12 criterios de la [spec](./spec.md), incluida unicidad concurrente y edición con vínculos reales.
- [ ] Ejecutar validaciones del [plan](./plan.md) y anotar evidencia/bloqueos, sin archivos de testing.
- [ ] Sincronizar spec, plan e [índice](../index.md); no marcar completas las comprobaciones de integración antes de disponer de participantes.